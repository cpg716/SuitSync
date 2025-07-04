import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Users, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { Textarea } from './Textarea';
import { Badge } from './Badge';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { CustomerSearch } from './CustomerSearchSimple';
import { useToast } from '../ToastContext';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  appointments?: Appointment[];
  alterationJobs?: AlterationJob[];
}

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
  alterationJobs?: AlterationJob[];
}

interface Appointment {
  id: number;
  type: 'first_fitting' | 'alterations_fitting' | 'pickup' | 'fitting';
  status: string;
  dateTime: string;
}

interface AlterationJob {
  id: number;
  status: string;
  jobNumber: string;
}

interface AppointmentFormData {
  customerId?: number;
  partyId?: number;
  partyMemberId?: number;
  dateTime: string;
  durationMinutes: number;
  type: 'first_fitting' | 'alterations_fitting' | 'pickup' | 'fitting';
  notes: string;
  tailorId?: number;
  autoScheduleNext: boolean;
}

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<AppointmentFormData>;
  tailors: Array<{ id: number; name: string; role: string }>;
}

const APPOINTMENT_TYPES = [
  { value: 'first_fitting', label: 'First Fitting', description: '3 months before wedding - Initial measurements' },
  { value: 'alterations_fitting', label: 'Alterations Fitting', description: '1.5 months before wedding - Adjustments' },
  { value: 'pickup', label: 'Pickup', description: '7 days before wedding - Final collection' },
  { value: 'fitting', label: 'General Fitting', description: 'Standard fitting appointment' },
];

const getNextAppointmentType = (currentType: string, eventDate?: string): string | null => {
  if (!eventDate) return null;
  
  const weddingDate = new Date(eventDate);
  const now = new Date();
  
  switch (currentType) {
    case 'first_fitting':
      return 'alterations_fitting';
    case 'alterations_fitting':
      return 'pickup';
    default:
      return null;
  }
};

const calculateDefaultDate = (type: string, eventDate?: string): string => {
  if (!eventDate) return '';
  
  const weddingDate = new Date(eventDate);
  const defaultDate = new Date();
  
  switch (type) {
    case 'first_fitting':
      defaultDate.setTime(weddingDate.getTime() - (90 * 24 * 60 * 60 * 1000)); // 3 months before
      break;
    case 'alterations_fitting':
      defaultDate.setTime(weddingDate.getTime() - (45 * 24 * 60 * 60 * 1000)); // 1.5 months before
      break;
    case 'pickup':
      defaultDate.setTime(weddingDate.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days before
      break;
    default:
      defaultDate.setTime(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 1 week from now
  }
  
  return defaultDate.toISOString().slice(0, 16);
};

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  tailors
}) => {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedMember, setSelectedMember] = useState<PartyMember | null>(null);
  
  const [formData, setFormData] = useState<AppointmentFormData>({
    dateTime: '',
    durationMinutes: 60,
    type: 'fitting',
    notes: '',
    autoScheduleNext: false,
    ...initialData
  });

  // Update default date when appointment type or party changes
  useEffect(() => {
    if (formData.type && selectedParty) {
      const defaultDate = calculateDefaultDate(formData.type, selectedParty.eventDate);
      if (defaultDate && !formData.dateTime) {
        setFormData(prev => ({ ...prev, dateTime: defaultDate }));
      }
    }
  }, [formData.type, selectedParty]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSelectedParty(null);
    setSelectedMember(null);
    setFormData(prev => ({
      ...prev,
      customerId: customer.id,
      partyId: undefined,
      partyMemberId: undefined
    }));
  };

  const handlePartyMemberSelect = (party: Party, member: PartyMember) => {
    setSelectedParty(party);
    setSelectedMember(member);
    setSelectedCustomer(null);
    setFormData(prev => ({
      ...prev,
      partyId: party.id,
      partyMemberId: member.id,
      customerId: undefined,
      // Auto-suggest appointment type based on existing appointments
      type: suggestAppointmentType(member.appointments || []),
      // Auto-enable next appointment scheduling for wedding parties
      autoScheduleNext: true
    }));
  };

  const suggestAppointmentType = (appointments: Appointment[]): AppointmentFormData['type'] => {
    const hasFirstFitting = appointments.some(a => a.type === 'first_fitting');
    const hasAlterationsFitting = appointments.some(a => a.type === 'alterations_fitting');
    
    if (!hasFirstFitting) return 'first_fitting';
    if (!hasAlterationsFitting) return 'alterations_fitting';
    return 'pickup';
  };

  const getProgressStatus = (appointments: Appointment[] = [], jobs: AlterationJob[] = []) => {
    const hasFirstFitting = appointments.some(a => a.type === 'first_fitting');
    const hasAlterationsFitting = appointments.some(a => a.type === 'alterations_fitting');
    const hasPickup = appointments.some(a => a.type === 'pickup');
    const hasCompletedJob = jobs.some(j => j.status === 'COMPLETE');
    
    if (hasPickup || hasCompletedJob) return { status: 'completed', label: 'Ready for Pickup', icon: Package, color: 'bg-green-100 text-green-800' };
    if (hasAlterationsFitting) return { status: 'alterations', label: 'Alterations Phase', icon: Clock, color: 'bg-blue-100 text-blue-800' };
    if (hasFirstFitting) return { status: 'measured', label: 'Measured', icon: CheckCircle, color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'new', label: 'New Customer', icon: AlertCircle, color: 'bg-gray-100 text-gray-800' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomer && !selectedMember) {
      error('Please select a customer or party member');
      return;
    }
    
    if (!formData.dateTime) {
      error('Please select a date and time');
      return;
    }
    
    setLoading(true);
    try {
      await onSubmit(formData);
      success('Appointment scheduled successfully');
    } catch (err) {
      error('Failed to schedule appointment');
    } finally {
      setLoading(false);
    }
  };

  const selectedEntity = selectedCustomer || selectedMember;
  const progress = selectedEntity ? getProgressStatus(
    selectedEntity.appointments || [],
    selectedEntity.alterationJobs || []
  ) : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer/Party Selection */}
      <div className="space-y-4">
        <Label htmlFor="customer-search">Customer or Party Member</Label>
        <CustomerSearch
          onCustomerSelect={handleCustomerSelect}
          onPartyMemberSelect={handlePartyMemberSelect}
          placeholder="Search customers or wedding parties..."
          showProgressIndicators={true}
        />
        
        {/* Selected Customer/Member Info */}
        {(selectedCustomer || selectedMember) && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {selectedParty ? (
                    <Users className="h-5 w-5 text-blue-500" />
                  ) : (
                    <User className="h-5 w-5 text-gray-500" />
                  )}
                  <div>
                    <div className="font-medium">
                      {selectedCustomer?.name || selectedMember?.role}
                    </div>
                    {selectedParty && (
                      <div className="text-sm text-gray-500">
                        {selectedParty.name} • {new Date(selectedParty.eventDate).toLocaleDateString()}
                      </div>
                    )}
                    {selectedCustomer?.email && (
                      <div className="text-sm text-gray-500">{selectedCustomer.email}</div>
                    )}
                  </div>
                </div>
                {progress && (
                  <div className="flex items-center space-x-2">
                    <progress.icon className="h-4 w-4" />
                    <Badge className={progress.color}>{progress.label}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Appointment Type */}
      <div className="space-y-2">
        <Label htmlFor="type">Appointment Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value: AppointmentFormData['type']) => 
            setFormData(prev => ({ ...prev, type: value }))
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {APPOINTMENT_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div>
                  <div className="font-medium">{type.label}</div>
                  <div className="text-sm text-gray-500">{type.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateTime">Date & Time</Label>
          <Input
            id="dateTime"
            type="datetime-local"
            value={formData.dateTime}
            onChange={(e) => setFormData(prev => ({ ...prev, dateTime: e.target.value }))}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Select
            value={formData.durationMinutes.toString()}
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, durationMinutes: parseInt(value) }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="60">1 hour</SelectItem>
              <SelectItem value="90">1.5 hours</SelectItem>
              <SelectItem value="120">2 hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tailor Assignment */}
      <div className="space-y-2">
        <Label htmlFor="tailor">Assigned Tailor (Optional)</Label>
        <Select
          value={formData.tailorId?.toString() || ''}
          onValueChange={(value) => 
            setFormData(prev => ({ ...prev, tailorId: value ? parseInt(value) : undefined }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a tailor..." />
          </SelectTrigger>
          <SelectContent>
            {tailors.map((tailor) => (
              <SelectItem key={tailor.id} value={tailor.id.toString()}>
                {tailor.name} ({tailor.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes for this appointment..."
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </div>

      {/* Auto-schedule Next Appointment */}
      {selectedParty && (
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="autoScheduleNext"
            checked={formData.autoScheduleNext}
            onChange={(e) => setFormData(prev => ({ ...prev, autoScheduleNext: e.target.checked }))}
            className="rounded border-gray-300"
          />
          <Label htmlFor="autoScheduleNext" className="text-sm">
            Automatically schedule next appointment in wedding timeline
          </Label>
        </div>
      )}

      {/* Wedding Timeline Info */}
      {selectedParty && formData.type !== 'fitting' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              Wedding Timeline for {selectedParty.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-blue-700 space-y-1">
              <div>Wedding Date: {new Date(selectedParty.eventDate).toLocaleDateString()}</div>
              {formData.type === 'first_fitting' && (
                <div>• Next: Alterations fitting will be auto-scheduled for 1.5 months before wedding</div>
              )}
              {formData.type === 'alterations_fitting' && (
                <div>• This will create an alteration job and schedule pickup for 7 days before wedding</div>
              )}
              {formData.type === 'pickup' && (
                <div>• Final appointment - customer will collect completed garments</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Scheduling...' : 'Schedule Appointment'}
        </Button>
      </div>
    </form>
  );
};