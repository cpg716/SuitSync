import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Textarea } from '../../components/ui/Textarea';
import { useToast } from '../../components/ToastContext';

interface Appointment {
  id: number;
  dateTime: string;
  durationMinutes: number;
  type: string;
  notes?: string;
  individualCustomer?: {
    first_name?: string;
    last_name?: string;
    email?: string;
  };
  member?: {
    role: string;
    notes?: string;
  };
  party?: {
    name: string;
  };
  tailor?: {
    name: string;
  };
}

export default function RescheduleAppointment() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [newDateTime, setNewDateTime] = useState('');
  const [newDurationMinutes, setNewDurationMinutes] = useState(60);
  const [notes, setNotes] = useState('');

  const { appointmentId, token } = router.query;

  useEffect(() => {
    if (appointmentId && token) {
      loadAppointment();
    }
  }, [appointmentId, token]);

  const loadAppointment = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointment(data);
        setNewDateTime(data.dateTime.slice(0, 16)); // Format for datetime-local input
        setNewDurationMinutes(data.durationMinutes);
        setNotes(data.notes || '');
      } else {
        toastError('Failed to load appointment details');
      }
    } catch (err) {
      console.error('Error loading appointment:', err);
      toastError('Failed to load appointment details');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDateTime) {
      toastError('Please select a new date and time');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/appointments/reschedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          token,
          newDateTime,
          newDurationMinutes,
          notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        success('Appointment rescheduled successfully! You will receive a confirmation email.');
        router.push('/appointments/reschedule-success');
      } else {
        const errorData = await response.json();
        toastError(errorData.error || 'Failed to reschedule appointment');
      }
    } catch (err) {
      console.error('Error rescheduling appointment:', err);
      toastError('Failed to reschedule appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading appointment details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName = appointment.individualCustomer 
    ? `${appointment.individualCustomer.first_name || ''} ${appointment.individualCustomer.last_name || ''}`.trim()
    : appointment.member 
      ? `${appointment.member.notes || `Party Member (${appointment.member.role})`}`
      : 'Customer';

  const originalDateTime = new Date(appointment.dateTime).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Reschedule Appointment</CardTitle>
          <p className="text-gray-600">Update your appointment date and time</p>
        </CardHeader>
        <CardContent>
          {/* Current Appointment Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Current Appointment</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Customer:</strong> {customerName}</p>
              <p><strong>Date & Time:</strong> {originalDateTime}</p>
              <p><strong>Type:</strong> {appointment.type?.replace('_', ' ') || 'Fitting'}</p>
              <p><strong>Duration:</strong> {appointment.durationMinutes} minutes</p>
              {appointment.tailor && <p><strong>Staff:</strong> {appointment.tailor.name}</p>}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newDateTime">New Date & Time *</Label>
              <Input
                id="newDateTime"
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={newDurationMinutes}
                onChange={(e) => setNewDurationMinutes(parseInt(e.target.value))}
                min="15"
                max="240"
                step="15"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or notes for your rescheduled appointment..."
                rows={3}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Rescheduling...' : 'Reschedule Appointment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 