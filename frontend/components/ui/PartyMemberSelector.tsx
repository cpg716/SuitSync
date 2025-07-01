import React, { useState, useEffect } from 'react';
import { Users, Calendar, CheckCircle, Clock, AlertCircle, User, ChevronDown } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';
import { Card } from './Card';
import { cn } from '../../lib/utils';

interface Party {
  id: number;
  name: string;
  eventDate: string;
  members?: PartyMember[];
}

interface PartyMember {
  id: number;
  role: string;
  lsCustomerId?: string;
  appointments?: Appointment[];
  measurements?: any;
  status?: string;
}

interface Appointment {
  id: number;
  type: string;
  status: string;
  dateTime: string;
}

interface PartyMemberSelectorProps {
  party: Party;
  onMemberSelect: (member: PartyMember) => void;
  selectedMemberId?: number;
  className?: string;
  showProgressIndicators?: boolean;
}

export const PartyMemberSelector: React.FC<PartyMemberSelectorProps> = ({
  party,
  onMemberSelect,
  selectedMemberId,
  className = "",
  showProgressIndicators = true
}) => {
  const [expandedMembers, setExpandedMembers] = useState<Set<number>>(new Set());

  const getAppointmentProgress = (appointments: Appointment[] = []) => {
    const stages = {
      first_fitting: appointments.find(a => a.type === 'first_fitting'),
      alterations_fitting: appointments.find(a => a.type === 'alterations_fitting'),
      pickup: appointments.find(a => a.type === 'pickup')
    };

    const completed = Object.values(stages).filter(a => a?.status === 'completed').length;
    const scheduled = Object.values(stages).filter(a => a?.status === 'scheduled').length;
    const total = 3;

    return {
      stages,
      completed,
      scheduled,
      total,
      nextStage: getNextStage(stages)
    };
  };

  const getNextStage = (stages: any) => {
    if (!stages.first_fitting) return 'first_fitting';
    if (stages.first_fitting.status === 'completed' && !stages.alterations_fitting) return 'alterations_fitting';
    if (stages.alterations_fitting?.status === 'completed' && !stages.pickup) return 'pickup';
    return null;
  };

  const getProgressColor = (progress: any) => {
    if (progress.completed === 3) return 'text-green-600 bg-green-100';
    if (progress.completed >= 1) return 'text-blue-600 bg-blue-100';
    if (progress.scheduled > 0) return 'text-yellow-600 bg-yellow-100';
    return 'text-gray-400 bg-gray-100';
  };

  const getProgressIcon = (progress: any) => {
    if (progress.completed === 3) return CheckCircle;
    if (progress.completed >= 1 || progress.scheduled > 0) return Clock;
    return AlertCircle;
  };

  const toggleMemberExpansion = (memberId: number) => {
    const newExpanded = new Set(expandedMembers);
    if (newExpanded.has(memberId)) {
      newExpanded.delete(memberId);
    } else {
      newExpanded.add(memberId);
    }
    setExpandedMembers(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  if (!party.members || party.members.length === 0) {
    return (
      <Card className={cn("p-6 text-center", className)}>
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No Members Found
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          This party doesn't have any members yet.
        </p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {party.name}
          </h3>
        </div>
        <Badge variant="outline" className="text-xs self-start sm:self-auto">
          {formatDate(party.eventDate)}
        </Badge>
      </div>

      <div className="space-y-2">
        {party.members.map((member) => {
          const progress = showProgressIndicators ? getAppointmentProgress(member.appointments) : null;
          const ProgressIcon = progress ? getProgressIcon(progress) : User;
          const isSelected = selectedMemberId === member.id;
          const isExpanded = expandedMembers.has(member.id);

          return (
            <Card
              key={member.id}
              className={cn(
                "transition-all duration-200 cursor-pointer hover:shadow-md",
                isSelected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
              )}
            >
              <div
                className="p-3 sm:p-4"
                onClick={() => onMemberSelect(member)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    <div className={cn(
                      "p-1.5 sm:p-2 rounded-full flex-shrink-0",
                      progress ? getProgressColor(progress) : "bg-gray-100 text-gray-400"
                    )}>
                      <ProgressIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                        {member.role}
                      </div>
                      {progress && (
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <div className="sm:hidden">
                            {progress.completed}/{progress.total} done
                          </div>
                          <div className="hidden sm:block">
                            {progress.completed}/{progress.total} appointments completed
                            {progress.nextStage && (
                              <span className="ml-2 text-blue-600 dark:text-blue-400">
                                • Next: {progress.nextStage.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {progress && (
                      <div className="flex gap-0.5 sm:gap-1">
                        {[1, 2, 3].map((stage) => (
                          <div
                            key={stage}
                            className={cn(
                              "w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full",
                              stage <= progress.completed
                                ? "bg-green-500"
                                : stage <= progress.completed + progress.scheduled
                                ? "bg-yellow-500"
                                : "bg-gray-300"
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {member.appointments && member.appointments.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleMemberExpansion(member.id);
                        }}
                        className="p-0.5 sm:p-1 h-auto"
                      >
                        <ChevronDown className={cn(
                          "h-3 w-3 sm:h-4 sm:w-4 transition-transform",
                          isExpanded && "rotate-180"
                        )} />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded appointment details */}
                {isExpanded && member.appointments && member.appointments.length > 0 && (
                  <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-2">
                      <h4 className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Appointments
                      </h4>
                      {member.appointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                              {appointment.type.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-2">
                            <span className="text-xs text-gray-500 flex-1 sm:flex-none">
                              {formatDateTime(appointment.dateTime)}
                            </span>
                            <Badge
                              variant={appointment.status === 'completed' ? 'default' : 'outline'}
                              className="text-xs flex-shrink-0"
                            >
                              {appointment.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
