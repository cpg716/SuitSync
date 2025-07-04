import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Calendar, User, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { UserAvatar } from './UserAvatar';
import { Checkbox } from './checkbox';

interface ChecklistItem {
  id: number;
  title: string;
  description?: string;
  isRequired: boolean;
  isCompleted?: boolean;
  completedAt?: string;
  notes?: string;
}

interface ChecklistCardProps {
  id: number;
  title: string;
  description?: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  scheduledFor: string;
  estimatedMinutes?: number;
  items: ChecklistItem[];
  assignedBy?: {
    id: number;
    name: string;
    photoUrl?: string;
  };
  onStart?: () => void;
  onUpdateItem?: (itemId: number, isCompleted: boolean, notes?: string) => void;
  onComplete?: () => void;
  isExecuting?: boolean;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'COMPLETED':
      return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Completed' };
    case 'IN_PROGRESS':
      return { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'In Progress' };
    case 'OVERDUE':
      return { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Overdue' };
    default:
      return { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'Not Started' };
  }
};

const getFrequencyColor = (frequency: string) => {
  switch (frequency) {
    case 'DAILY': return 'bg-blue-100 text-blue-800';
    case 'WEEKLY': return 'bg-green-100 text-green-800';
    case 'MONTHLY': return 'bg-purple-100 text-purple-800';
    case 'YEARLY': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export const ChecklistCard: React.FC<ChecklistCardProps> = ({
  id,
  title,
  description,
  frequency,
  status,
  scheduledFor,
  estimatedMinutes,
  items,
  assignedBy,
  onStart,
  onUpdateItem,
  onComplete,
  isExecuting = false
}) => {
  const [expandedItems, setExpandedItems] = useState(false);
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;

  const completedItems = items.filter(item => item.isCompleted).length;
  const totalItems = items.length;
  const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;

  const handleItemToggle = (itemId: number, isCompleted: boolean) => {
    if (onUpdateItem) {
      onUpdateItem(itemId, isCompleted);
    }
  };

  const canComplete = status === 'IN_PROGRESS' && 
    items.filter(item => item.isRequired).every(item => item.isCompleted);

  return (
    <Card className={`transition-all duration-200 hover:shadow-md ${status === 'OVERDUE' ? 'border-red-200' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{title}</CardTitle>
              <Badge className={getFrequencyColor(frequency)}>{frequency}</Badge>
            </div>
            {description && (
              <p className="text-sm text-gray-600 mb-2">{description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(scheduledFor).toLocaleDateString()}
              </div>
              {estimatedMinutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {estimatedMinutes} min
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${statusConfig.bgColor}`}>
              <StatusIcon className={`h-4 w-4 ${statusConfig.color}`} />
            </div>
          </div>
        </div>

        {assignedBy && (
          <div className="flex items-center gap-2 pt-2 border-t">
            <span className="text-sm text-gray-500">Assigned by:</span>
            <UserAvatar user={assignedBy} size="sm" showName />
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{completedItems}/{totalItems} items</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-4">
          {status === 'NOT_STARTED' && onStart && (
            <Button onClick={onStart} size="sm" disabled={isExecuting}>
              {isExecuting ? 'Starting...' : 'Start Checklist'}
            </Button>
          )}
          {status === 'IN_PROGRESS' && canComplete && onComplete && (
            <Button onClick={onComplete} size="sm" variant="outline">
              Complete Checklist
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setExpandedItems(!expandedItems)}
          >
            {expandedItems ? 'Hide' : 'Show'} Items ({totalItems})
          </Button>
        </div>

        {/* Checklist Items */}
        {expandedItems && (
          <div className="space-y-2 border-t pt-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50">
                <Checkbox
                  checked={item.isCompleted || false}
                  onCheckedChange={(checked) => handleItemToggle(item.id, checked as boolean)}
                  disabled={status === 'COMPLETED'}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className={`font-medium ${item.isCompleted ? 'line-through text-gray-500' : ''}`}>
                    {item.title}
                    {item.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                  {item.completedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Completed: {new Date(item.completedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};