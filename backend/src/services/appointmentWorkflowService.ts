import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { shouldCreateNextAppointment, suggestNextAppointmentDate, WEDDING_TIMELINE } from './appointmentProgressService';
import { scheduleAppointmentReminders } from './notificationSchedulingService';
import Scheduling from './alterationSchedulingService.js';

const prisma = new PrismaClient();

export interface WorkflowTriggerResult {
  success: boolean;
  actions: string[];
  errors: string[];
  nextAppointmentId?: number;
  alterationJobId?: number;
  orderStubId?: string;
  requiresNextScheduling?: boolean;
  suggestedNextAppointment?: {
    type: string;
    name: string;
    description: string;
    suggestedDate: Date;
    defaultDuration: number;
  };
}

/**
 * Execute automated workflow triggers when an appointment is completed
 */
export async function executeWorkflowTriggers(appointmentId: number): Promise<WorkflowTriggerResult> {
  const result: WorkflowTriggerResult = {
    success: true,
    actions: [],
    errors: []
  };

  try {
    // Get the completed appointment with party and member info
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        party: {
          include: {
            members: {
              include: {
                appointments: {
                  orderBy: { dateTime: 'asc' }
                }
              }
            }
          }
        },
        member: true,
        individualCustomer: true
      }
    });

    if (!appointment) {
      result.errors.push('Appointment not found');
      result.success = false;
      return result;
    }

    // Mark appointment as completed
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'completed' }
    });
    result.actions.push('Marked appointment as completed');

    // Handle party-based appointments
    if (appointment.partyId && appointment.memberId) {
      const party = appointment.party;
      const member = appointment.member;
      
      if (!party || !member) {
        result.errors.push('Party or member not found');
        result.success = false;
        return result;
      }

      // Update member's workflow status based on appointment type
      const newStatus = getNextWorkflowStatus(appointment.type || 'fitting', member.status || 'Selected');
      await prisma.partyMember.update({
        where: { id: member.id },
        data: { status: newStatus as any }
      });
      result.actions.push(`Updated member workflow status to: ${newStatus}`);

      // Check if we need to schedule the next appointment
      const nextAppointmentInfo = getNextAppointmentInfo(appointment.type || 'fitting', party.eventDate);
      
      if (nextAppointmentInfo && nextAppointmentInfo.type !== 'pickup') {
        // Instead of auto-scheduling, indicate that next appointment needs to be scheduled
        result.requiresNextScheduling = true;
        result.suggestedNextAppointment = {
          type: nextAppointmentInfo.type,
          name: nextAppointmentInfo.name,
          description: nextAppointmentInfo.description,
          suggestedDate: nextAppointmentInfo.suggestedDate,
          defaultDuration: nextAppointmentInfo.defaultDuration
        };
        result.actions.push('Next appointment scheduling required');
      }

      // Handle specific appointment type actions
      switch (appointment.type) {
        case 'first_fitting':
          // After first fitting, member should be in "awaiting_measurements" status
          // This triggers the need to input measurements
          result.actions.push('Member status set to awaiting_measurements - measurements need to be input');
          result.actions.push('After measurements are input, status will automatically change to need_to_order');
          break;

        case 'alterations_fitting':
          // After alterations fitting, member should be in "being_altered" status
          // This triggers the need to create alterations job and input alterations
          result.actions.push('Member status set to being_altered - alterations need to be input');
          result.actions.push('Create alterations job with specific alterations needed');
          result.actions.push('Print alterations ticket with QR codes for each part');

          // Auto-create a shell alterations job if one does not exist yet, derive due date from party timeline
          try {
            const existingJob = await prisma.alterationJob.findFirst({ where: { partyMemberId: member.id } });
            if (!existingJob) {
              const jobNumber = `AJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const dueDate = party.eventDate ? new Date(new Date(party.eventDate).getTime() - 7 * 24 * 60 * 60 * 1000) : null;
              const job = await prisma.alterationJob.create({
                data: {
                  jobNumber,
                  partyId: party.id,
                  partyMemberId: member.id,
                  status: 'NOT_STARTED',
                  notes: 'Auto-created after alterations fitting',
                  dueDate,
                },
              });
              result.alterationJobId = job.id;
              // Attempt auto-scheduling (parts may be added later; this is a no-op if none)
              try {
                await Scheduling.scheduleJobParts(job.id, { respectNoThursday: true });
              } catch (err) {
                logger.warn('Auto-scheduling on workflow trigger failed', err);
              }
              result.actions.push('Auto-created alteration job from workflow');
            }
          } catch (e) {
            logger.error('Error auto-creating alteration job from workflow', e);
          }
          break;

        case 'pickup':
          // Final pickup - no more appointments needed
          result.actions.push('Final pickup completed - workflow finished');
          break;
      }
    }

    // Handle individual customer appointments
    if (appointment.individualCustomerId) {
      // For individual customers, just mark as completed
      result.actions.push('Individual customer appointment completed');
    }

    // Schedule reminders for the completed appointment (if needed)
    try {
      await scheduleAppointmentReminders(appointmentId);
      result.actions.push('Scheduled appointment reminders');
    } catch (error) {
      logger.error('Error scheduling reminders:', error);
      result.errors.push('Failed to schedule reminders');
    }

  } catch (error) {
    logger.error('Error executing workflow triggers:', error);
    result.success = false;
    result.errors.push('Internal server error');
  }

  return result;
}

/**
 * Get the next workflow status based on current appointment type and status
 */
function getNextWorkflowStatus(appointmentType: string, currentStatus: string): string {
  // Map old status names to new enum values for backward compatibility
  const statusMapping: { [key: string]: string } = {
    'Selected': 'awaiting_measurements',
    'Measured': 'need_to_order',
    'Ordered': 'ordered',
    'Fitted': 'being_altered',
    'Altered': 'ready_for_pickup',
    'Ready': 'ready_for_pickup',
    'Picked Up': 'ready_for_pickup'
  };

  // Convert old status to new status if needed
  const normalizedStatus = statusMapping[currentStatus] || currentStatus;

  switch (appointmentType) {
    case 'first_fitting':
      // After first fitting, member should be in "awaiting_measurements" status
      // Measurements will be taken and status will change to "need_to_order"
      return 'awaiting_measurements';
    case 'alterations_fitting':
      // After alterations fitting, member should be in "being_altered" status
      return 'being_altered';
    case 'pickup':
      // After pickup, member should be in "ready_for_pickup" status
      return 'ready_for_pickup';
    default:
      return normalizedStatus;
  }
}

/**
 * Get information about the next appointment that needs to be scheduled
 */
function getNextAppointmentInfo(currentAppointmentType: string, eventDate: Date) {
  const weddingDate = new Date(eventDate);
  
  switch (currentAppointmentType) {
    case 'first_fitting':
      return {
        type: 'alterations_fitting',
        name: 'Alterations Fitting',
        description: 'Alterations and adjustments',
        suggestedDate: calculateSuggestedDate(weddingDate, -42), // 6 weeks before
        defaultDuration: 60
      };
    
    case 'alterations_fitting':
      return {
        type: 'pickup',
        name: 'Final Pickup',
        description: 'Pick up completed suit',
        suggestedDate: calculateSuggestedDate(weddingDate, -7), // 1 week before
        defaultDuration: 30
      };
    
    case 'pickup':
      return null; // No more appointments needed
    
    default:
      return null;
  }
}

/**
 * Calculate suggested date with weekend adjustment
 */
function calculateSuggestedDate(weddingDate: Date, daysBefore: number): Date {
  const suggestedDate = new Date(weddingDate);
  suggestedDate.setDate(weddingDate.getDate() + daysBefore);
  
  // Adjust for weekends - move to Friday
  const dayOfWeek = suggestedDate.getDay();
  if (dayOfWeek === 0) { // Sunday
    suggestedDate.setDate(suggestedDate.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    suggestedDate.setDate(suggestedDate.getDate() - 1);
  }
  
  // Set default time to 10:00 AM
  suggestedDate.setHours(10, 0, 0, 0);
  
  return suggestedDate;
}

/**
 * Manually schedule the next appointment after user selects date/time
 */
export async function scheduleNextAppointment(
  partyId: number,
  memberId: number,
  appointmentType: string,
  dateTime: Date,
  durationMinutes: number,
  tailorId?: number,
  notes?: string
): Promise<WorkflowTriggerResult> {
  const result: WorkflowTriggerResult = {
    success: true,
    actions: [],
    errors: []
  };

  try {
    const appointment = await prisma.appointment.create({
      data: {
        partyId,
        memberId,
        type: appointmentType as any, // Cast to AppointmentType enum
        dateTime,
        durationMinutes,
        tailorId,
        notes,
        status: 'scheduled'
      }
    });

    result.nextAppointmentId = appointment.id;
    result.actions.push(`Scheduled ${appointmentType} appointment`);

    // Schedule reminders for the new appointment
    try {
      await scheduleAppointmentReminders(appointment.id);
      result.actions.push('Scheduled appointment reminders');
    } catch (error) {
      logger.error('Error scheduling reminders:', error);
      result.errors.push('Failed to schedule reminders');
    }

  } catch (error) {
    logger.error('Error scheduling next appointment:', error);
    result.success = false;
    result.errors.push('Failed to schedule appointment');
  }

  return result;
}
