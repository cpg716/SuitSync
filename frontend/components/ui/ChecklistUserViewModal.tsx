import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { UserAvatar } from './UserAvatar';
import { CheckCircle, Circle, Clock, Calendar, User } from 'lucide-react';

interface ChecklistUserViewModalProps {
  open: boolean;
  onClose: () => void;
  assignment: any;
}

export const ChecklistUserViewModal: React.FC<ChecklistUserViewModalProps> = ({
  open,
  onClose,
  assignment
}) => {
  const [execution, setExecution] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && assignment) {
      fetchExecution();
    }
  }, [open, assignment]);

  const fetchExecution = async () => {
    if (!assignment) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/checklists/assignments/${assignment.id}/execution/${assignment.assignedTo.id}`, {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        setExecution(data);
      } else {
        console.error('Failed to fetch execution');
      }
    } catch (error) {
      console.error('Error fetching execution:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (isCompleted: boolean) => {
    return isCompleted ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <Circle className="h-5 w-5 text-gray-400" />
    );
  };

  const getStatusText = (isCompleted: boolean) => {
    return isCompleted ? 'Completed' : 'Pending';
  };

  const getStatusColor = (isCompleted: boolean) => {
    return isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  if (!assignment) return null;

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">User Checklist View</h2>
            <p className="text-gray-600">Viewing as: {assignment.assignedTo?.name}</p>
          </div>
          <UserAvatar
            user={{
              id: assignment.assignedTo.id,
              name: assignment.assignedTo.name,
              photoUrl: assignment.assignedTo.photoUrl,
              email: assignment.assignedTo.email
            }}
            size="lg"
            showName={false}
          />
        </div>

        {/* Checklist Info */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">{assignment.checklist?.title}</h3>
              {assignment.checklist?.description && (
                <p className="text-gray-600 text-sm mt-1">{assignment.checklist.description}</p>
              )}
            </div>
            <Badge className="bg-blue-100 text-blue-800">
              {assignment.checklist?.frequency}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span>Assigned: {new Date(assignment.assignedAt).toLocaleDateString()}</span>
            </div>
            {assignment.dueDate && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>Due: {new Date(assignment.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Execution Status */}
        {loading ? (
          <Card className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
                    <div className="h-4 bg-gray-200 rounded flex-1"></div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : execution ? (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">Execution Progress</h4>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Started:</span>
                <span className="text-sm font-medium">
                  {new Date(execution.startedAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {execution.itemExecutions?.map((itemExec: any) => (
                <div key={itemExec.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  {getStatusIcon(itemExec.isCompleted)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${itemExec.isCompleted ? 'line-through text-gray-500' : ''}`}>
                        {itemExec.item.title}
                      </span>
                      <Badge className={getStatusColor(itemExec.isCompleted)}>
                        {getStatusText(itemExec.isCompleted)}
                      </Badge>
                    </div>
                    {itemExec.item.description && (
                      <p className="text-sm text-gray-600 mt-1">{itemExec.item.description}</p>
                    )}
                    {itemExec.completedAt && (
                      <p className="text-xs text-green-600 mt-1">
                        Completed: {new Date(itemExec.completedAt).toLocaleString()}
                      </p>
                    )}
                    {itemExec.notes && (
                      <p className="text-sm text-gray-600 mt-1 italic">"{itemExec.notes}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {execution.completedAt && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Completed on {new Date(execution.completedAt).toLocaleString()}</span>
                </div>
              </div>
            )}
          </Card>
        ) : (
          <Card className="p-4">
            <div className="text-center py-8">
              <Circle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No execution found for this assignment.</p>
              <p className="text-sm text-gray-500 mt-1">The user hasn't started this checklist yet.</p>
            </div>
          </Card>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
