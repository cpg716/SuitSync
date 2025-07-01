import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface AppointmentProgress {
  customerId?: number;
  partyMemberId?: number;
  currentStage: number; // 1=first_fitting, 2=alterations_fitting, 3=pickup
  completedStages: string[];
  nextStage?: string;
  nextSuggestedDate?: Date;
  isComplete: boolean;
  appointments: {
    first_fitting?: any;
    alterations_fitting?: any;
    pickup?: any;
  };
}

export interface TimelineStage {
  stage: number;
  type: string;
  name: string;
  description: string;
  defaultDuration: number; // in minutes
  suggestedDaysFromEvent: number; // days before event date
  autoCreateNext: boolean;
}

// Wedding appointment timeline configuration
export const WEDDING_TIMELINE: TimelineStage[] = [
  {
    stage: 1,
    type: 'first_fitting',
    name: 'First Fitting',
    description: 'Initial measurements and suit selection',
    defaultDuration: 90,
    suggestedDaysFromEvent: 90, // 3 months before
    autoCreateNext: true
  },
  {
    stage: 2,
    type: 'alterations_fitting',
    name: 'Alterations Fitting',
    description: 'Alterations and adjustments',
    defaultDuration: 60,
    suggestedDaysFromEvent: 45, // 1.5 months before
    autoCreateNext: true
  },
  {
    stage: 3,
    type: 'pickup',
    name: 'Pickup',
    description: 'Final garment collection',
    defaultDuration: 30,
    suggestedDaysFromEvent: 7, // 1 week before
    autoCreateNext: false
  }
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
        appointments: {}
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

    // Calculate next suggested date
    let nextSuggestedDate: Date | undefined;
    if (nextStage) {
      const nextStageConfig = WEDDING_TIMELINE.find(s => s.type === nextStage);
      if (nextStageConfig) {
        // Get event date from party
        const eventDate = appointments[0]?.party?.eventDate;
        if (eventDate) {
          nextSuggestedDate = new Date(eventDate);
          nextSuggestedDate.setDate(
            nextSuggestedDate.getDate() - nextStageConfig.suggestedDaysFromEvent
          );
        }
      }
    }

    return {
      customerId,
      partyMemberId,
      currentStage,
      completedStages,
      nextStage,
      nextSuggestedDate,
      isComplete: completedStages.length === WEDDING_TIMELINE.length,
      appointments: appointmentsByType
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
 * Suggest next appointment date based on timeline and event date
 */
export function suggestNextAppointmentDate(
  eventDate: Date,
  appointmentType: string,
  existingAppointments: any[] = []
): Date | null {
  const stageConfig = WEDDING_TIMELINE.find(s => s.type === appointmentType);
  if (!stageConfig) {
    return null;
  }

  const suggestedDate = new Date(eventDate);
  suggestedDate.setDate(suggestedDate.getDate() - stageConfig.suggestedDaysFromEvent);

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
 * Check if automatic next appointment should be created
 */
export async function shouldCreateNextAppointment(
  appointmentId: number
): Promise<{ shouldCreate: boolean; nextType?: string; suggestedDate?: Date }> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        party: true,
        member: true,
        individualCustomer: true
      }
    });

    if (!appointment || appointment.status !== 'completed') {
      return { shouldCreate: false };
    }

    const currentStageConfig = WEDDING_TIMELINE.find(s => s.type === appointment.type);
    if (!currentStageConfig || !currentStageConfig.autoCreateNext) {
      return { shouldCreate: false };
    }

    const nextStageIndex = currentStageConfig.stage;
    const nextStageConfig = WEDDING_TIMELINE.find(s => s.stage === nextStageIndex + 1);
    
    if (!nextStageConfig) {
      return { shouldCreate: false };
    }

    // Check if next appointment already exists
    const whereClause: any = {
      type: nextStageConfig.type
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
    let suggestedDate: Date | null = null;
    if (appointment.party?.eventDate) {
      suggestedDate = suggestNextAppointmentDate(
        appointment.party.eventDate,
        nextStageConfig.type
      );
    }

    return {
      shouldCreate: true,
      nextType: nextStageConfig.type,
      suggestedDate: suggestedDate || undefined
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
