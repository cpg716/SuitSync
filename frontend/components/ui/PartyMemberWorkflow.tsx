import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, Calendar, Users, ArrowRight } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Progress } from './Progress';

interface PartyMember {
  id: number;
  role: string;
  name?: string;
  appointments?: Appointment[];
  alterationJobs?: AlterationJob[];
  workflowStatus?: string;
  progressPercentage?: number;
}

interface Appointment {
  id: number;
  type: 'first_fitting' | 'alterations_fitting' | 'pickup' | 'fitting';
  status: string;
  dateTime: string;
  notes?: string;
}

interface AlterationJob {
  id: number;
  status: string;
  jobNumber: string;
  notes?: string;
}

interface PartyMemberWorkflowProps {
  member: PartyMember;
  partyEventDate?: string;
  onStatusChange?: (memberId: number, newStatus: string) => void;
  onScheduleAppointment?: (memberId: number, appointmentType: string) => void;
  onViewDetails?: (memberId: number) => void;
  className?: string;
}

const WORKFLOW_STAGES = [
  { stage: 1, status: 'Selected', description: 'Suit selected, customer added to party', icon: Users },
  { stage: 2, status: 'Measured', description: 'First fitting completed, measurements taken', icon: CheckCircle },
  { stage: 3, status: 'Ordered', description: 'Suit ordered from manufacturer', icon: Calendar },
  { stage: 4, status: 'Fitted', description: 'Initial fitting with ordered suit', icon: Clock },
  { stage: 5, status: 'Altered', description: 'Alterations fitting completed', icon: AlertCircle },
  { stage: 6, status: 'Ready', description: 'Suit ready for pickup', icon: CheckCircle },
  { stage: 7, status: 'PickedUp', description: 'Suit picked up by customer', icon: CheckCircle }
];

const STATUS_COLORS = {
  Selected: 'bg-gray-100 text-gray-800',
  Measured: 'bg-blue-100 text-blue-800',
  Ordered: 'bg-indigo-100 text-indigo-800',
  Fitted: 'bg-yellow-100 text-yellow-800',
  Altered: 'bg-pink-100 text-pink-800',
  Ready: 'bg-green-100 text-green-800',
  PickedUp: 'bg-purple-100 text-purple-800',
};

export const PartyMemberWorkflow: React.FC<PartyMemberWorkflowProps> = ({
  member,
  partyEventDate,
  onStatusChange,
  onScheduleAppointment,
  onViewDetails,
  className = ""
}) => {
  const [currentStatus, setCurrentStatus] = useState(member.workflowStatus || 'Selected');
  const [progressPercentage, setProgressPercentage] = useState(member.progressPercentage || 0);

  useEffect(() => {
    setCurrentStatus(member.workflowStatus || 'Selected');
    setProgressPercentage(member.progressPercentage || 0);
  }, [member.workflowStatus, member.progressPercentage]);

  const getCurrentStageIndex = () => {
    return WORKFLOW_STAGES.findIndex(stage => stage.status === currentStatus);
  };

  const getNextStage = () => {
    const currentIndex = getCurrentStageIndex();
    if (currentIndex < WORKFLOW_STAGES.length - 1) {
      return WORKFLOW_STAGES[currentIndex + 1];
    }
    return null;
  };

  const getNextAppointmentType = () => {
    const appointments = member.appointments || [];
    const hasFirstFitting = appointments.some(a => a.type === 'first_fitting' && a.status === 'completed');
    const hasAlterationsFitting = appointments.some(a => a.type === 'alterations_fitting' && a.status === 'completed');
    
    if (!hasFirstFitting) return 'first_fitting';
    if (!hasAlterationsFitting) return 'alterations_fitting';
    if (!appointments.some(a => a.type === 'pickup')) return 'pickup';
    return null;
  };

  const handleAdvanceStatus = () => {
    const nextStage = getNextStage();
    if (nextStage && onStatusChange) {
      onStatusChange(member.id, nextStage.status);
    }
  };

  const handleScheduleAppointment = () => {
    const nextAppointmentType = getNextAppointmentType();
    if (nextAppointmentType && onScheduleAppointment) {
      onScheduleAppointment(member.id, nextAppointmentType);
    }
  };

  const getStatusIcon = (status: string) => {
    const stage = WORKFLOW_STAGES.find(s => s.status === status);
    if (stage) {
      const IconComponent = stage.icon;
      return <IconComponent className="h-4 w-4" />;
    }
    return <AlertCircle className="h-4 w-4" />;
  };

  const getUpcomingAppointments = () => {
    const appointments = member.appointments || [];
    const now = new Date();
    return appointments
      .filter(a => new Date(a.dateTime) > now)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  };

  const getCompletedAppointments = () => {
    const appointments = member.appointments || [];
    return appointments.filter(a => a.status === 'completed');
  };

  const getAlterationJobs = () => {
    return member.alterationJobs || [];
  };

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {getStatusIcon(currentStatus)}
              <CardTitle className="text-lg">{member.role}</CardTitle>
            </div>
            <Badge className={STATUS_COLORS[currentStatus as keyof typeof STATUS_COLORS]}>
              {currentStatus}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            {onViewDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onViewDetails(member.id)}
              >
                View Details
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Workflow Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Workflow Stepper */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Workflow Stages</div>
          <div className="flex items-center space-x-2 overflow-x-auto pb-2">
            {WORKFLOW_STAGES.map((stage, index) => {
              const isCompleted = index <= getCurrentStageIndex();
              const isCurrent = stage.status === currentStatus;
              
              return (
                <div key={stage.status} className="flex items-center space-x-1 flex-shrink-0">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                    isCompleted 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isCompleted ? <CheckCircle className="h-3 w-3" /> : index + 1}
                  </div>
                  <span className={`text-xs ${
                    isCurrent ? 'font-medium text-blue-600' : 'text-gray-500'
                  }`}>
                    {stage.status}
                  </span>
                  {index < WORKFLOW_STAGES.length - 1 && (
                    <ArrowRight className="h-3 w-3 text-gray-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Next Actions */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Next Actions</div>
          <div className="flex flex-wrap gap-2">
            {getNextStage() && onStatusChange && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAdvanceStatus}
              >
                Advance to {getNextStage()?.status}
              </Button>
            )}
            
            {getNextAppointmentType() && onScheduleAppointment && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleScheduleAppointment}
              >
                Schedule {getNextAppointmentType()?.replace('_', ' ')} Appointment
              </Button>
            )}
          </div>
        </div>

        {/* Appointments Summary */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">Appointments</div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <div className="text-gray-500">Completed</div>
              <div className="font-medium">{getCompletedAppointments().length}</div>
            </div>
            <div>
              <div className="text-gray-500">Upcoming</div>
              <div className="font-medium">{getUpcomingAppointments().length}</div>
            </div>
          </div>
          
          {getUpcomingAppointments().length > 0 && (
            <div className="text-xs text-gray-600">
              Next: {getUpcomingAppointments()[0].type.replace('_', ' ')} on{' '}
              {new Date(getUpcomingAppointments()[0].dateTime).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Alteration Jobs */}
        {getAlterationJobs().length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">Alteration Jobs</div>
            <div className="space-y-1">
              {getAlterationJobs().map(job => (
                <div key={job.id} className="flex items-center justify-between text-xs">
                  <span>{job.jobNumber}</span>
                  <Badge variant="outline" className="text-xs">
                    {job.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Date Info */}
        {partyEventDate && (
          <div className="text-xs text-gray-500 border-t pt-2">
            Wedding Date: {new Date(partyEventDate).toLocaleDateString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 