import React, { useState } from 'react';
import { AlertTriangle, Clock, CheckCircle, Flag, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { Textarea } from './Textarea';

interface TaskCardProps {
  id: number;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  dueDate?: string;
  estimatedMinutes?: number;
  notes?: string;
  assignedTo: {
    id: number;
    name: string;
    photoUrl?: string;
    role: string;
  };
  assignedBy: {
    id: number;
    name: string;
    photoUrl?: string;
    role: string;
  };
  createdAt: string;
  completedAt?: string;
  onUpdateStatus?: (status: string) => void;
  onUpdateNotes?: (notes: string) => void;
  onDelete?: () => void;
  canEdit?: boolean;
}

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'URGENT':
      return { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100 text-red-800', label: 'Urgent' };
    case 'HIGH':
      return { icon: Flag, color: 'text-orange-600', bgColor: 'bg-orange-100 text-orange-800', label: 'High' };
    case 'MEDIUM':
      return { icon: Flag, color: 'text-yellow-600', bgColor: 'bg-yellow-100 text-yellow-800', label: 'Medium' };
    case 'LOW':
      return { icon: Flag, color: 'text-green-600', bgColor: 'bg-green-100 text-green-800', label: 'Low' };
    default:
      return { icon: Flag, color: 'text-gray-600', bgColor: 'bg-gray-100 text-gray-800', label: 'Medium' };
  }
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100 text-green-800', label: 'Completed' };
    case 'IN_PROGRESS':
      return { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100 text-blue-800', label: 'In Progress' };
    case 'OVERDUE':
      return { icon: AlertTriangle, color: 'text-red-600', bgColor: 'bg-red-100 text-red-800', label: 'Overdue' };
    default:
      return { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100 text-gray-800', label: 'Pending' };
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({
  id,
  title,
  description,
  priority,
  status,
  dueDate,
  estimatedMinutes,
  notes,
  assignedTo,
  assignedBy,
  createdAt,
  completedAt,
  onUpdateStatus,
  onUpdateNotes,
  onDelete,
  canEdit = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(notes || '');

  const priorityConfig = getPriorityConfig(priority);
  const statusConfig = getStatusConfig(status);
  const PriorityIcon = priorityConfig.icon;
  const StatusIcon = statusConfig.icon;

  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'COMPLETED';

  const handleNotesSubmit = () => {
    if (onUpdateNotes) {
      onUpdateNotes(notesValue);
    }
    setEditingNotes(false);
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${isOverdue ? 'border-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{title}</CardTitle>
              <Badge className={priorityConfig.bgColor}>
                <PriorityIcon className="h-3 w-3 mr-1" />
                {priorityConfig.label}
              </Badge>
              <Badge className={statusConfig.bgColor}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            
            {description && (
              <p className="text-sm text-gray-600 mb-3">{description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-gray-500">
              {dueDate && (
                <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                  <Calendar className="h-4 w-4" />
                  Due: {new Date(dueDate).toLocaleDateString()}
                </div>
              )}
              {estimatedMinutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {estimatedMinutes} min
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Assigned to:</span>
              <UserAvatar user={assignedTo} size="sm" showName showRole />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">By:</span>
              <UserAvatar user={assignedBy} size="sm" showName />
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Less' : 'More'}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Status Update */}
            {canEdit && onUpdateStatus && (
              <div>
                <label className="text-sm font-medium mb-2 block">Update Status</label>
                <Select value={status} onValueChange={onUpdateStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Notes Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Notes</label>
                {canEdit && onUpdateNotes && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingNotes(!editingNotes)}
                  >
                    {editingNotes ? 'Cancel' : 'Edit'}
                  </Button>
                )}
              </div>
              
              {editingNotes ? (
                <div className="space-y-2">
                  <Textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="Add notes about this task..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleNotesSubmit}>
                      Save Notes
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setEditingNotes(false);
                        setNotesValue(notes || '');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {notes || 'No notes added yet.'}
                </div>
              )}
            </div>

            {/* Timestamps */}
            <div className="text-xs text-gray-500 space-y-1 border-t pt-3">
              <div>Created: {new Date(createdAt).toLocaleString()}</div>
              {completedAt && (
                <div>Completed: {new Date(completedAt).toLocaleString()}</div>
              )}
            </div>

            {/* Actions */}
            {canEdit && onDelete && (
              <div className="flex justify-end pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDelete}
                  className="text-red-600 hover:text-red-700"
                >
                  Delete Task
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
};