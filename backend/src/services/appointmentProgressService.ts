import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface TimelineStage {
  stage: number;
  type: string;
  name: string;
  description: string;
  defaultDuration: number;
  suggestedDaysFromEvent: number;
  autoCreateNext: boolean;
  workflowStatus: string; // Maps to the 7-stage workflow
}

export interface AppointmentProgress {
  customerId?: number;
  partyMemberId?: number;
  currentStage: number;
  completedStages: string[];
  nextStage?: string;
  isComplete: boolean;
  appointments: Record<string, any>;
  workflowStatus: string;
  progressPercentage: number;
}

// Enhanced wedding appointment timeline configuration with 7-stage workflow mapping
export const WEDDING_TIMELINE: TimelineStage[] = [
  {
    stage: 1,
    type: 'first_fitting',
    name: 'First Fitting',
    description: 'Initial measurements and suit selection',
    defaultDuration: 90,
    suggestedDaysFromEvent: 90, // 3 months before
    autoCreateNext: true,
    workflowStatus: 'Measured'
  },
  {
    stage: 2,
    type: 'alterations_fitting',
    name: 'Alterations Fitting',
    description: 'Alterations and adjustments',
    defaultDuration: 60,
    suggestedDaysFromEvent: 45, // 1.5 months before
    autoCreateNext: true,
    workflowStatus: 'Altered'
  },
  {
    stage: 3,
    type: 'pickup',
    name: 'Pickup',
    description: 'Final garment collection',
    defaultDuration: 30,
    suggestedDaysFromEvent: 7, // 1 week before
    autoCreateNext: false,
    workflowStatus: 'PickedUp'
  }
];

// Complete 7-stage workflow mapping
export const WORKFLOW_STAGES = [
  { stage: 1, status: 'Selected', description: 'Suit selected, customer added to party' },
  { stage: 2, status: 'Measured', description: 'First fitting completed, measurements taken' },
  { stage: 3, status: 'Ordered', description: 'Suit ordered from manufacturer' },
  { stage: 4, status: 'Fitted', description: 'Initial fitting with ordered suit' },
  { stage: 5, status: 'Altered', description: 'Alterations fitting completed' },
  { stage: 6, status: 'Ready', description: 'Suit ready for pickup' },
  { stage: 7, status: 'PickedUp', description: 'Suit picked up by customer' }
];

/**
 * Get appointment progress for a customer or party member
 */
export async function getAppointmentProgress(
  customerId?: number,
  partyMemberId?: number
): Promise<AppointmentProgress | null> {
  try {
    if (!customerId && !partyMemberId) {
      throw new Error('Either customerId or partyMemberId must be provided');
    }

    // Build the where clause
    const whereClause: any = {};
    if (customerId) {
      whereClause.individualCustomerId = customerId;
    }
    if (partyMemberId) {
      whereClause.memberId = partyMemberId;
    }

    // Get all appointments for this customer/member
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        party: true,
        member: true,
        individualCustomer: true
      },
      orderBy: { dateTime: 'asc' }
    });

    if (appointments.length === 0) {
      return {
        customerId,
        partyMemberId,
        currentStage: 1,
        completedStages: [],
        nextStage: 'first_fitting',
        isComplete: false,
        appointments: {},
        workflowStatus: 'Selected',
        progressPercentage: 0
      };
    }

    // Organize appointments by type
    const appointmentsByType = appointments.reduce((acc, apt) => {
      if (apt.type) {
        acc[apt.type] = apt;
      }
      return acc;
    }, {} as any);

    // Determine completed stages
    const completedStages = WEDDING_TIMELINE
      .filter(stage => {
        const apt = appointmentsByType[stage.type];
        return apt && apt.status === 'completed';
      })
      .map(stage => stage.type);

    // Determine current stage
    let currentStage = 1;
    if (completedStages.includes('pickup')) {
      currentStage = 3;
    } else if (completedStages.includes('alterations_fitting')) {
      currentStage = 3;
    } else if (completedStages.includes('first_fitting')) {
      currentStage = 2;
    }

    // Determine next stage
    let nextStage: string | undefined;
    if (!completedStages.includes('first_fitting')) {
      nextStage = 'first_fitting';
    } else if (!completedStages.includes('alterations_fitting')) {
      nextStage = 'alterations_fitting';
    } else if (!completedStages.includes('pickup')) {
      nextStage = 'pickup';
    }

    // Determine workflow status based on completed appointments
    let workflowStatus = 'Selected';
    if (completedStages.includes('first_fitting')) {
      workflowStatus = 'Measured';
    }
    if (completedStages.includes('first_fitting') && appointmentsByType.first_fitting?.status === 'completed') {
      workflowStatus = 'Ordered'; // Assume order is placed after first fitting
    }
    if (completedStages.includes('alterations_fitting')) {
      workflowStatus = 'Fitted';
    }
    if (completedStages.includes('alterations_fitting') && appointmentsByType.alterations_fitting?.status === 'completed') {
      workflowStatus = 'Altered';
    }
    if (completedStages.includes('pickup') && appointmentsByType.pickup?.status === 'scheduled') {
      workflowStatus = 'Ready';
    }
    if (completedStages.includes('pickup') && appointmentsByType.pickup?.status === 'completed') {
      workflowStatus = 'PickedUp';
    }

    // Calculate progress percentage
    const workflowStageIndex = WORKFLOW_STAGES.findIndex(stage => stage.status === workflowStatus);
    const progressPercentage = workflowStageIndex >= 0 ? ((workflowStageIndex + 1) / WORKFLOW_STAGES.length) * 100 : 0;

    return {
      customerId,
      partyMemberId,
      currentStage,
      completedStages,
      nextStage,
      isComplete: completedStages.includes('pickup'),
      appointments: appointmentsByType,
      workflowStatus,
      progressPercentage
    };

  } catch (error) {
    logger.error('Error getting appointment progress:', error);
    return null;
  }
}

/**
 * Get progress for all members of a party
 */
export async function getPartyProgress(partyId: number) {
  try {
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        members: {
          include: {
            appointments: {
              orderBy: { dateTime: 'asc' }
            }
          }
        }
      }
    });

    if (!party) {
      throw new Error('Party not found');
    }

    const memberProgress = await Promise.all(
      party.members.map(async (member) => {
        const progress = await getAppointmentProgress(undefined, member.id);
        return {
          member,
          progress
        };
      })
    );

    return {
      party,
      memberProgress,
      overallProgress: {
        totalMembers: party.members.length,
        completedMembers: memberProgress.filter(mp => mp.progress?.isComplete).length,
        inProgressMembers: memberProgress.filter(mp => 
          mp.progress && !mp.progress.isComplete && mp.progress.completedStages.length > 0
        ).length
      }
    };

  } catch (error) {
    logger.error('Error getting party progress:', error);
    throw error;
  }
}

/**
 * Suggest the next appointment date based on event date and appointment type
 */
export function suggestNextAppointmentDate(eventDate: string | Date, appointmentType: string): Date | undefined {
  const weddingDate = new Date(eventDate);
  const suggestedDate = new Date(weddingDate);

  switch (appointmentType) {
    case 'first_fitting':
      // First fitting: 3 months before wedding
      suggestedDate.setMonth(weddingDate.getMonth() - 3);
      break;
    case 'alterations_fitting':
      // Alterations fitting: 1.5 months (6 weeks) before wedding
      suggestedDate.setMonth(weddingDate.getMonth() - 1);
      suggestedDate.setDate(weddingDate.getDate() - 14); // Additional 2 weeks
      break;
    case 'pickup':
      // Pickup: 1 week before wedding
      suggestedDate.setDate(weddingDate.getDate() - 7);
      break;
    default:
      return undefined;
  }

  // Adjust for weekends (move to Friday if weekend)
  const dayOfWeek = suggestedDate.getDay();
  if (dayOfWeek === 0) { // Sunday
    suggestedDate.setDate(suggestedDate.getDate() - 2);
  } else if (dayOfWeek === 6) { // Saturday
    suggestedDate.setDate(suggestedDate.getDate() - 1);
  }

  // Set default time (10:00 AM)
  suggestedDate.setHours(10, 0, 0, 0);

  return suggestedDate;
}

/**
 * Determine if the next appointment should be created
 */
export async function shouldCreateNextAppointment(appointmentId: number): Promise<{
  shouldCreate: boolean;
  nextType?: string;
  suggestedDate?: Date;
}> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        party: true,
        member: true
      }
    });

    if (!appointment || appointment.status !== 'completed') {
      return { shouldCreate: false };
    }

    // Check if auto-schedule is enabled
    if (!appointment.autoScheduleNext) {
      return { shouldCreate: false };
    }

    // Determine next appointment type based on current type
    let nextType: string | undefined;
    switch (appointment.type) {
      case 'first_fitting':
        nextType = 'alterations_fitting';
        break;
      case 'alterations_fitting':
        nextType = 'pickup';
        break;
      default:
        return { shouldCreate: false };
    }

    // Check if next appointment already exists
    const whereClause: any = {
      type: nextType
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
      return { shouldCreate: false };
    }

    // Calculate suggested date
    let suggestedDate: Date | undefined;
    if (appointment.party?.eventDate) {
      suggestedDate = suggestNextAppointmentDate(appointment.party.eventDate, nextType);
    }

    return {
      shouldCreate: true,
      nextType,
      suggestedDate
    };

  } catch (error) {
    logger.error('Error checking if next appointment should be created:', error);
    return { shouldCreate: false };
  }
}

/**
 * Get timeline stage configuration
 */
export function getTimelineStage(appointmentType: string): TimelineStage | null {
  return WEDDING_TIMELINE.find(s => s.type === appointmentType) || null;
}

/**
 * Get all timeline stages
 */
export function getAllTimelineStages(): TimelineStage[] {
  return WEDDING_TIMELINE;
}

/**
 * Get workflow status for a party member
 */
export async function getPartyMemberWorkflowStatus(memberId: number): Promise<{
  status: string;
  stage: number;
  progressPercentage: number;
  nextAction?: string;
}> {
  const progress = await getAppointmentProgress(undefined, memberId);
  
  if (!progress) {
    return {
      status: 'Selected',
      stage: 1,
      progressPercentage: 0
    };
  }

  const workflowStage = WORKFLOW_STAGES.find(stage => stage.status === progress.workflowStatus);
  const stage = workflowStage ? workflowStage.stage : 1;

  let nextAction: string | undefined;
  if (progress.nextStage) {
    const nextStageConfig = WEDDING_TIMELINE.find(s => s.type === progress.nextStage);
    if (nextStageConfig) {
      nextAction = `Schedule ${nextStageConfig.name}`;
    }
  }

  return {
    status: progress.workflowStatus,
    stage,
    progressPercentage: progress.progressPercentage,
    nextAction
  };
}
