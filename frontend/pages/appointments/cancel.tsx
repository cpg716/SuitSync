import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Textarea } from '../../components/ui/Textarea';
import { Label } from '../../components/ui/Label';
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

export default function CancelAppointment() {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [reason, setReason] = useState('');

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
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/appointments/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId,
          token,
          reason
        })
      });

      if (response.ok) {
        const result = await response.json();
        success('Appointment canceled successfully!');
        router.push('/appointments/cancel-success');
      } else {
        const errorData = await response.json();
        toastError(errorData.error || 'Failed to cancel appointment');
      }
    } catch (err) {
      console.error('Error canceling appointment:', err);
      toastError('Failed to cancel appointment');
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

  const appointmentDateTime = new Date(appointment.dateTime).toLocaleString('en-US', {
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
          <CardTitle className="text-2xl font-bold text-red-600">Cancel Appointment</CardTitle>
          <p className="text-gray-600">Are you sure you want to cancel this appointment?</p>
        </CardHeader>
        <CardContent>
          {/* Appointment Details */}
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold mb-2 text-red-800">Appointment to Cancel</h3>
            <div className="space-y-1 text-sm text-red-700">
              <p><strong>Customer:</strong> {customerName}</p>
              <p><strong>Date & Time:</strong> {appointmentDateTime}</p>
              <p><strong>Type:</strong> {appointment.type?.replace('_', ' ') || 'Fitting'}</p>
              <p><strong>Duration:</strong> {appointment.durationMinutes} minutes</p>
              {appointment.tailor && <p><strong>Staff:</strong> {appointment.tailor.name}</p>}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Cancellation (Optional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please let us know why you need to cancel this appointment..."
                rows={3}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Important Notice</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• This action cannot be undone</li>
                <li>• Your time slot will be made available to other customers</li>
                <li>• You will need to book a new appointment if you want to reschedule</li>
                <li>• Our staff will be notified of this cancellation</li>
              </ul>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Keep Appointment
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {loading ? 'Canceling...' : 'Cancel Appointment'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 