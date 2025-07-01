import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { shouldCreateNextAppointment, suggestNextAppointmentDate, WEDDING_TIMELINE } from './appointmentProgressService';
import { scheduleAppointmentReminders } from './notificationSchedulingService';

const prisma = new PrismaClient();

export interface WorkflowTriggerResult {
  success: boolean;
  actions: string[];
  errors: string[];
  nextAppointmentId?: number;
  alterationJobId?: number;
  orderStubId?: string;
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
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        party: true,
        member: true,
        individualCustomer: true,
        tailor: true
      }
    });

    if (!appointment) {
      result.success = false;
      result.errors.push('Appointment not found');
      return result;
    }

    if (appointment.status !== 'completed') {
      result.success = false;
      result.errors.push('Appointment must be completed to trigger workflow');
      return result;
    }

    logger.info(`Executing workflow triggers for appointment ${appointmentId} (type: ${appointment.type})`);

    // 1. Auto-schedule next appointment
    const nextAppointmentResult = await autoScheduleNextAppointment(appointment);
    if (nextAppointmentResult.success) {
      result.actions.push(...nextAppointmentResult.actions);
      if (nextAppointmentResult.nextAppointmentId) {
        result.nextAppointmentId = nextAppointmentResult.nextAppointmentId;
      }
    } else {
      result.errors.push(...nextAppointmentResult.errors);
    }

    // 2. Create alteration card for alterations fitting
    if (appointment.type === 'alterations_fitting') {
      const alterationResult = await createAlterationCard(appointment);
      if (alterationResult.success) {
        result.actions.push(...alterationResult.actions);
        if (alterationResult.alterationJobId) {
          result.alterationJobId = alterationResult.alterationJobId;
        }
      } else {
        result.errors.push(...alterationResult.errors);
      }
    }

    // 3. Generate order stub for first fitting
    if (appointment.type === 'first_fitting') {
      const orderResult = await generateOrderStub(appointment);
      if (orderResult.success) {
        result.actions.push(...orderResult.actions);
        if (orderResult.orderStubId) {
          result.orderStubId = orderResult.orderStubId;
        }
      } else {
        result.errors.push(...orderResult.errors);
      }
    }

    // 4. Schedule pickup notifications for completed suits
    if (appointment.type === 'pickup') {
      const notificationResult = await schedulePickupNotifications(appointment);
      if (notificationResult.success) {
        result.actions.push(...notificationResult.actions);
      } else {
        result.errors.push(...notificationResult.errors);
      }
    }

    logger.info(`Workflow triggers completed for appointment ${appointmentId}`, {
      actions: result.actions,
      errors: result.errors
    });

    return result;

  } catch (error: any) {
    logger.error('Error executing workflow triggers:', error);
    result.success = false;
    result.errors.push(error.message || 'Unknown error occurred');
    return result;
  }
}

/**
 * Auto-schedule the next appointment in the timeline
 */
async function autoScheduleNextAppointment(appointment: any): Promise<WorkflowTriggerResult> {
  const result: WorkflowTriggerResult = {
    success: true,
    actions: [],
    errors: []
  };

  try {
    const shouldCreate = await shouldCreateNextAppointment(appointment.id);
    
    if (!shouldCreate.shouldCreate || !shouldCreate.nextType) {
      result.actions.push('No next appointment needed');
      return result;
    }

    // Check if next appointment already exists
    const whereClause: any = {
      type: shouldCreate.nextType
    };
    
    if (appointment.memberId) {
      whereClause.memberId = appointment.memberId;
    } else if (appointment.individualCustomerId) {
      whereClause.individualCustomerId = appointment.individualCustomerId;
    }

    const existingNext = await prisma.appointment.findFirst({
      where: whereClause
    });

    if (existingNext) {
      result.actions.push(`Next appointment (${shouldCreate.nextType}) already exists`);
      return result;
    }

    // Create the next appointment
    const nextStageConfig = WEDDING_TIMELINE.find(s => s.type === shouldCreate.nextType);
    if (!nextStageConfig) {
      result.errors.push(`Invalid next appointment type: ${shouldCreate.nextType}`);
      return result;
    }

    const appointmentData: any = {
      type: shouldCreate.nextType,
      status: 'scheduled',
      durationMinutes: nextStageConfig.defaultDuration,
      notes: `Auto-scheduled ${nextStageConfig.name} following completed ${appointment.type}`,
      autoScheduleNext: true,
      workflowStage: nextStageConfig.stage
    };

    // Set the date if suggested
    if (shouldCreate.suggestedDate) {
      appointmentData.dateTime = shouldCreate.suggestedDate;
    } else if (appointment.party?.eventDate) {
      const suggestedDate = suggestNextAppointmentDate(
        appointment.party.eventDate,
        shouldCreate.nextType
      );
      if (suggestedDate) {
        appointmentData.dateTime = suggestedDate;
      }
    }

    // Copy customer/party information
    if (appointment.memberId) {
      appointmentData.memberId = appointment.memberId;
      appointmentData.partyId = appointment.partyId;
    } else if (appointment.individualCustomerId) {
      appointmentData.individualCustomerId = appointment.individualCustomerId;
    }

    // Link to previous appointment
    appointmentData.parentId = appointment.id;

    const nextAppointment = await prisma.appointment.create({
      data: appointmentData
    });

    // Update the current appointment to link to the next one
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { nextAppointmentId: nextAppointment.id }
    });

    result.nextAppointmentId = nextAppointment.id;
    result.actions.push(`Auto-scheduled ${nextStageConfig.name} appointment for ${appointmentData.dateTime ? new Date(appointmentData.dateTime).toLocaleDateString() : 'TBD'}`);

    // Schedule reminder notifications for the new appointment
    if (appointmentData.dateTime) {
      try {
        await scheduleAppointmentReminders(nextAppointment.id);
        result.actions.push('Scheduled reminder notifications for new appointment');
      } catch (notificationError: any) {
        logger.error('Error scheduling reminders for new appointment:', notificationError);
        result.errors.push('Failed to schedule reminder notifications');
      }
    }

    return result;

  } catch (error: any) {
    logger.error('Error auto-scheduling next appointment:', error);
    result.success = false;
    result.errors.push(error.message || 'Failed to auto-schedule next appointment');
    return result;
  }
}

/**
 * Create alteration card when alterations fitting is completed
 */
async function createAlterationCard(appointment: any): Promise<WorkflowTriggerResult> {
  const result: WorkflowTriggerResult = {
    success: true,
    actions: [],
    errors: []
  };

  try {
    // Check if alteration job already exists
    const whereClause: any = {};
    if (appointment.memberId) {
      whereClause.partyMemberId = appointment.memberId;
    } else if (appointment.individualCustomerId) {
      whereClause.customerId = appointment.individualCustomerId;
    }

    const existingJob = await prisma.alterationJob.findFirst({
      where: whereClause
    });

    if (existingJob) {
      result.actions.push('Alteration job already exists');
      return result;
    }

    // Generate job number
    const jobCount = await prisma.alterationJob.count();
    const jobNumber = `ALT-${String(jobCount + 1).padStart(6, '0')}`;

    // Create alteration job
    const alterationJob = await prisma.alterationJob.create({
      data: {
        jobNumber,
        customerId: appointment.individualCustomerId,
        partyId: appointment.partyId,
        partyMemberId: appointment.memberId,
        status: 'pending',
        priority: 'normal',
        notes: `Auto-created from ${appointment.type} appointment`,
        receivedDate: new Date(),
        // Set due date based on pickup appointment or event date
        dueDate: appointment.party?.eventDate 
          ? new Date(new Date(appointment.party.eventDate).getTime() - (7 * 24 * 60 * 60 * 1000)) // 1 week before event
          : new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)) // 2 weeks from now
      }
    });

    result.alterationJobId = alterationJob.id;
    result.actions.push(`Created alteration job ${jobNumber}`);

    return result;

  } catch (error: any) {
    logger.error('Error creating alteration card:', error);
    result.success = false;
    result.errors.push(error.message || 'Failed to create alteration card');
    return result;
  }
}

/**
 * Generate order stub for suit ordering (4 weeks before alterations fitting)
 */
async function generateOrderStub(appointment: any): Promise<WorkflowTriggerResult> {
  const result: WorkflowTriggerResult = {
    success: true,
    actions: [],
    errors: []
  };

  try {
    // Calculate order date (4 weeks before alterations fitting)
    let orderDate = new Date();
    
    if (appointment.party?.eventDate) {
      // Calculate alterations fitting date (1.5 months before event)
      const alterationsFittingDate = new Date(appointment.party.eventDate);
      alterationsFittingDate.setDate(alterationsFittingDate.getDate() - 45);
      
      // Order date is 4 weeks before alterations fitting
      orderDate = new Date(alterationsFittingDate);
      orderDate.setDate(orderDate.getDate() - 28);
    }

    // For now, just log the order stub creation
    // In a real implementation, this would integrate with inventory/ordering system
    const orderStubId = `ORDER-${Date.now()}`;
    
    result.orderStubId = orderStubId;
    result.actions.push(`Generated order stub ${orderStubId} for ${orderDate.toLocaleDateString()}`);

    // TODO: Integrate with actual ordering system
    // - Create order in inventory system
    // - Schedule order reminder notifications
    // - Link to customer measurements

    return result;

  } catch (error: any) {
    logger.error('Error generating order stub:', error);
    result.success = false;
    result.errors.push(error.message || 'Failed to generate order stub');
    return result;
  }
}

/**
 * Schedule pickup notifications when suit is completed
 */
async function schedulePickupNotifications(appointment: any): Promise<WorkflowTriggerResult> {
  const result: WorkflowTriggerResult = {
    success: true,
    actions: [],
    errors: []
  };

  try {
    // This would typically be triggered when tailoring is marked as complete
    // For now, we'll schedule a pickup ready notification
    
    // Get customer contact info
    let customerEmail: string | null = null;
    let customerPhone: string | null = null;
    let customerName: string = '';

    if (appointment.individualCustomer) {
      customerEmail = appointment.individualCustomer.email;
      customerPhone = appointment.individualCustomer.phone;
      customerName = appointment.individualCustomer.name;
    } else if (appointment.member && appointment.party) {
      // For party members, we'd need to get contact info from the party or member
      customerName = `${appointment.party.name} - ${appointment.member.role}`;
    }

    if (customerEmail || customerPhone) {
      // Schedule pickup ready notification
      await prisma.notificationSchedule.create({
        data: {
          appointmentId: appointment.id,
          type: 'pickup_ready',
          scheduledFor: new Date(), // Send immediately when suit is ready
          method: customerEmail && customerPhone ? 'both' : customerEmail ? 'email' : 'sms',
          recipient: customerEmail || customerPhone || '',
          subject: 'Your garment is ready for pickup!',
          message: `Hi ${customerName}, your garment is ready for pickup at our store.`
        }
      });

      result.actions.push('Scheduled pickup ready notification');
    } else {
      result.actions.push('No contact info available for pickup notification');
    }

    return result;

  } catch (error: any) {
    logger.error('Error scheduling pickup notifications:', error);
    result.success = false;
    result.errors.push(error.message || 'Failed to schedule pickup notifications');
    return result;
  }
}
