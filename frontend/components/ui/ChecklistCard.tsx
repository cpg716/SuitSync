import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { Calendar, Clock, CheckCircle, XCircle, Eye, Edit, Trash2 } from 'lucide-react';

interface ChecklistCardProps {
  checklist: any;
  onEdit?: (checklist: any) => void;
  onDelete?: (id: number) => void;
  onAssign?: (checklist: any) => void;
  onViewAsUser?: (assignment: any) => void;
}

export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  checklist,
  onEdit,
  onDelete,
  onAssign,
  onViewAsUser
}) => {
  // Add null checks to prevent undefined errors
  const items = checklist?.items || [];
  const completedItems = items.filter((item: any) => item.completed)?.length || 0;
  const totalItems = items.length || 0;
  const progress = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const getStatusColor = () => {
    if (progress === 100) return 'bg-green-100 text-green-800';
    if (progress > 50) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusText = () => {
    if (progress === 100) return 'COMPLETED';
    if (progress > 0) return 'IN PROGRESS';
    return 'NOT STARTED';
  };

  // Early return if checklist is undefined
  if (!checklist) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded w-full mb-1"></div>
          <div className="h-2 bg-gray-200 rounded w-2/3"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-1">{checklist.title}</h3>
          {checklist.description && (
            <p className="text-gray-600 text-sm mb-2">{checklist.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar size={14} />
              <span>{checklist.frequency}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{checklist.items?.length || 0} items</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onViewAsUser && checklist.assignments?.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onViewAsUser(checklist.assignments[0])}
              className="flex items-center gap-1"
            >
              <Eye size={14} />
              View as User
            </Button>
          )}
          {onEdit && (
            <Button size="sm" variant="outline" onClick={() => onEdit(checklist)}>
              <Edit size={14} />
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="outline" onClick={() => onDelete(checklist.id)}>
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span>Progress</span>
          <span>{completedItems}/{totalItems} items</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex items-center justify-between mb-3">
        <Badge className={getStatusColor()}>{getStatusText()}</Badge>
        <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
      </div>

      {/* Assigned Users */}
      {checklist.assignments && checklist.assignments.length > 0 && (
        <div className="mb-3">
          <div className="text-sm text-gray-600 mb-2">Assigned to:</div>
          <div className="flex items-center gap-2 flex-wrap">
            {checklist.assignments.map((assignment: any) => (
              <div key={assignment.id} className="flex items-center gap-2">
                <UserAvatar
                  user={{
                    id: assignment.assignedTo.id,
                    name: assignment.assignedTo.name,
                    photoUrl: assignment.assignedTo.photoUrl,
                    email: assignment.assignedTo.email
                  }}
                  size="sm"
                  showName={false}
                />
                <span className="text-sm">{assignment.assignedTo.name}</span>
                {assignment.dueDate && (
                  <span className="text-xs text-gray-500">
                    Due: {new Date(assignment.dueDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" className="flex-1">
          Show Items ({totalItems})
        </Button>
        {onAssign && (
          <Button size="sm" variant="outline" onClick={() => onAssign(checklist)}>
            Assign
          </Button>
        )}
      </div>
    </Card>
  );
};