import React, { useState } from 'react';
import { Calendar, Clock, CheckCircle, ArrowRight, X } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Input } from './Input';
import { Label } from './Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { Textarea } from './Textarea';

interface AppointmentCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: number;
  partyId: number;
  memberId: number;
  suggestedAppointment: {
    type: string;
    name: string;
    description: string;
    suggestedDate: Date;
    defaultDuration: number;
  };
  onScheduleNext: (appointmentData: any) => Promise<void>;
}

export const AppointmentCompletionModal: React.FC<AppointmentCompletionModalProps> = ({
  isOpen,
  onClose,
  appointmentId,
  partyId,
  memberId,
  suggestedAppointment,
  onScheduleNext
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    dateTime: suggestedAppointment.suggestedDate.toISOString().slice(0, 16),
    durationMinutes: suggestedAppointment.defaultDuration.toString(),
    tailorId: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await onScheduleNext({
        partyId,
        memberId,
        appointmentType: suggestedAppointment.type,
        dateTime: new Date(formData.dateTime),
        durationMinutes: parseInt(formData.durationMinutes),
        tailorId: formData.tailorId ? parseInt(formData.tailorId) : undefined,
        notes: formData.notes || undefined
      });
      
      onClose();
    } catch (error) {
      console.error('Error scheduling next appointment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Appointment Completed!
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <span className="font-medium">Great job!</span>
              </div>
              <p className="text-green-700 text-sm mt-1">
                The appointment has been marked as completed. Now let's schedule the next step in the workflow.
              </p>
            </div>

            {/* Next Appointment Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800 mb-2">
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium">Next Appointment</span>
              </div>
              <div className="space-y-2 text-sm text-blue-700">
                <div>
                  <span className="font-medium">Type:</span> {suggestedAppointment.name}
                </div>
                <div>
                  <span className="font-medium">Description:</span> {suggestedAppointment.description}
                </div>
                <div>
                  <span className="font-medium">Suggested Date:</span>{' '}
                  {suggestedAppointment.suggestedDate.toLocaleDateString()} at{' '}
                  {suggestedAppointment.suggestedDate.toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
                <div>
                  <span className="font-medium">Duration:</span> {suggestedAppointment.defaultDuration} minutes
                </div>
              </div>
            </div>

            {/* Schedule Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dateTime">Date & Time *</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={formData.dateTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateTime: e.target.value }))}
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration (minutes) *</Label>
                <Input
                  id="durationMinutes"
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                  min="15"
                  max="240"
                  required
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tailorId">Assigned Tailor</Label>
                <Select
                  value={formData.tailorId}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, tailorId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tailor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No tailor assigned</SelectItem>
                    <SelectItem value="1">John Smith</SelectItem>
                    <SelectItem value="2">Sarah Johnson</SelectItem>
                    <SelectItem value="3">Mike Davis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special instructions or notes for this appointment..."
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Skip for Now
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Scheduling...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Schedule Next
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 