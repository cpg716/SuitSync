import { api } from './apiClient';

export interface AppointmentProgress {
  customerId?: number;
  partyMemberId?: number;
  currentStage: number;
  completedStages: string[];
  nextStage?: string;
  nextSuggestedDate?: string;
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
  defaultDuration: number;
  suggestedDaysFromEvent: number;
  autoCreateNext: boolean;
}

export interface ProgressStatus {
  stage: 'new' | 'measurements' | 'alterations' | 'completed';
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

// Wedding appointment timeline
export const WEDDING_TIMELINE: TimelineStage[] = [
  {
    stage: 1,
    type: 'first_fitting',
    name: 'First Fitting',
    description: 'Initial measurements and suit selection',
    defaultDuration: 90,
    suggestedDaysFromEvent: 90,
    autoCreateNext: true
  },
  {
    stage: 2,
    type: 'alterations_fitting',
    name: 'Alterations Fitting',
    description: 'Alterations and adjustments',
    defaultDuration: 60,
    suggestedDaysFromEvent: 45,
    autoCreateNext: true
  },
  {
    stage: 3,
    type: 'pickup',
    name: 'Pickup',
    description: 'Final garment collection',
    defaultDuration: 30,
    suggestedDaysFromEvent: 7,
    autoCreateNext: false
  }
];

/**
 * Get progress status based on completed stages
 */
export function getProgressStatus(completedStages: string[] = [], scheduledStages: string[] = []): ProgressStatus {
  if (completedStages.includes('pickup')) {
    return {
      stage: 'completed',
      label: 'Completed',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: 'CheckCircle'
    };
  }
  
  if (completedStages.includes('alterations_fitting') || scheduledStages.includes('pickup')) {
    return {
      stage: 'alterations',
      label: 'Alterations',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      icon: 'Clock'
    };
  }
  
  if (completedStages.includes('first_fitting') || scheduledStages.includes('alterations_fitting')) {
    return {
      stage: 'measurements',
      label: 'Measurements',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      icon: 'Calendar'
    };
  }
  
  return {
    stage: 'new',
    label: 'New',
    color: 'text-gray-400',
    bgColor: 'bg-gray-100',
    icon: 'AlertCircle'
  };
}

/**
 * Get appointment progress for a customer
 */
export async function getCustomerProgress(customerId: number): Promise<AppointmentProgress | null> {
  try {
    const response = await api.get(`/api/customers/${customerId}/progress`);
    if (
      response.data &&
      typeof response.data === 'object' &&
      'currentStage' in response.data &&
      'completedStages' in response.data &&
      'isComplete' in response.data &&
      'appointments' in response.data
    ) {
      return response.data as AppointmentProgress;
    }
    return null;
  } catch (error) {
    console.error('Error fetching customer progress:', error);
    return null;
  }
}

/**
 * Get appointment progress for a party member
 */
export async function getPartyMemberProgress(partyMemberId: number): Promise<AppointmentProgress | null> {
  try {
    const response = await api.get(`/api/party-members/${partyMemberId}/progress`);
    if (
      response.data &&
      typeof response.data === 'object' &&
      'currentStage' in response.data &&
      'completedStages' in response.data &&
      'isComplete' in response.data &&
      'appointments' in response.data
    ) {
      return response.data as AppointmentProgress;
    }
    return null;
  } catch (error) {
    console.error('Error fetching party member progress:', error);
    return null;
  }
}

/**
 * Get progress for all members of a party
 */
export async function getPartyProgress(partyId: number) {
  try {
    const response = await api.get(`/api/parties/${partyId}/progress`);
    return response.data;
  } catch (error) {
    console.error('Error fetching party progress:', error);
    throw error;
  }
}

/**
 * Calculate progress percentage
 */
export function calculateProgressPercentage(completedStages: string[]): number {
  return Math.round((completedStages.length / WEDDING_TIMELINE.length) * 100);
}

/**
 * Get next suggested appointment type
 */
export function getNextAppointmentType(completedStages: string[]): string | null {
  if (!completedStages.includes('first_fitting')) {
    return 'first_fitting';
  }
  if (!completedStages.includes('alterations_fitting')) {
    return 'alterations_fitting';
  }
  if (!completedStages.includes('pickup')) {
    return 'pickup';
  }
  return null;
}

/**
 * Get timeline stage by type
 */
export function getTimelineStage(type: string): TimelineStage | null {
  return WEDDING_TIMELINE.find(stage => stage.type === type) || null;
}

/**
 * Format appointment type for display
 */
export function formatAppointmentType(type: string): string {
  const stage = getTimelineStage(type);
  return stage ? stage.name : type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Check if appointment type is part of wedding timeline
 */
export function isWeddingTimelineAppointment(type: string): boolean {
  return WEDDING_TIMELINE.some(stage => stage.type === type);
}

/**
 * Get suggested date for next appointment
 */
export function suggestNextAppointmentDate(eventDate: Date, appointmentType: string): Date | null {
  const stage = getTimelineStage(appointmentType);
  if (!stage) return null;

  const suggestedDate = new Date(eventDate);
  suggestedDate.setDate(suggestedDate.getDate() - stage.suggestedDaysFromEvent);

  // Adjust for weekends
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
 * Get progress summary for display
 */
export function getProgressSummary(progress: AppointmentProgress) {
  const percentage = calculateProgressPercentage(progress.completedStages);
  const status = getProgressStatus(progress.completedStages);
  const nextType = getNextAppointmentType(progress.completedStages);
  
  return {
    percentage,
    status,
    nextType,
    nextTypeName: nextType ? formatAppointmentType(nextType) : null,
    isComplete: progress.isComplete,
    stagesCompleted: progress.completedStages.length,
    totalStages: WEDDING_TIMELINE.length
  };
}

/**
 * Check if customer/member needs next appointment
 */
export function needsNextAppointment(progress: AppointmentProgress): boolean {
  return !progress.isComplete && progress.nextStage !== undefined;
}

/**
 * Get overdue appointments (past suggested date)
 */
export function getOverdueAppointments(progress: AppointmentProgress, eventDate: Date): string[] {
  const overdue: string[] = [];
  const now = new Date();

  WEDDING_TIMELINE.forEach(stage => {
    if (!progress.completedStages.includes(stage.type)) {
      const suggestedDate = suggestNextAppointmentDate(eventDate, stage.type);
      if (suggestedDate && suggestedDate < now) {
        overdue.push(stage.type);
      }
    }
  });

  return overdue;
}

/**
 * Get upcoming appointments that should be scheduled
 */
export function getUpcomingAppointments(progress: AppointmentProgress, eventDate: Date): string[] {
  const upcoming: string[] = [];
  const now = new Date();
  const twoWeeksFromNow = new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000));

  WEDDING_TIMELINE.forEach(stage => {
    if (!progress.completedStages.includes(stage.type)) {
      const suggestedDate = suggestNextAppointmentDate(eventDate, stage.type);
      if (suggestedDate && suggestedDate >= now && suggestedDate <= twoWeeksFromNow) {
        upcoming.push(stage.type);
      }
    }
  });

  return upcoming;
}
