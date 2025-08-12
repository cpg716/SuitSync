import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, Users, AlertCircle, CheckCircle, Package, Plus, Search } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Label } from './Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './Select';
import { Textarea } from './Textarea';
import { Badge } from './Badge';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { CustomerSearch } from './CustomerSearchSimple';
import { useToast } from '../ToastContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';
import { format } from 'date-fns';

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  appointments?: Appointment[];
  alterationJobs?: AlterationJob[];
  first_name?: string;
  last_name?: string;
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
  individualCustomerId?: number;
  partyId?: number;
  partyMemberId?: number;
  dateTime: string;
  durationMinutes: number;
  type: 'first_fitting' | 'alterations_fitting' | 'pickup' | 'fitting';
  status: string;
  notes: string;
  staffId?: number;
  autoScheduleNext: boolean;
  assignedStaffId?: string;
}

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<AppointmentFormData>;
  loading?: boolean;
  isEdit?: boolean;
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
  initialData = {},
  loading = false,
  isEdit = false
}) => {
  const { success, error } = useToast();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedMember, setSelectedMember] = useState<PartyMember | null>(null);
  const [activeTab, setActiveTab] = useState<'individual' | 'party'>('individual');
  const [staffMembers, setStaffMembers] = useState<Array<{ id: number; name: string; role: string }>>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [formData, setFormData] = useState<AppointmentFormData>({
    individualCustomerId: undefined,
    partyId: undefined,
    partyMemberId: undefined,
    dateTime: initialData.dateTime || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    durationMinutes: initialData.durationMinutes || 60,
    type: initialData.type || 'fitting',
    status: initialData.status || 'pending',
    notes: initialData.notes || '',
    staffId: initialData.staffId,
    autoScheduleNext: initialData.autoScheduleNext || false,
    assignedStaffId: initialData.assignedStaffId
  });

  // Load staff members when component mounts (Sales and Managers only)
  useEffect(() => {
    const loadStaffMembers = async () => {
      try {
        // Use public staff endpoint filtered to sales; API returns associate and sales
        const salesRes = await fetch('/api/public/staff?role=sales');
        const sales = salesRes.ok ? await salesRes.json() : [];
        // Also fetch managers if available
        const mgrRes = await fetch('/api/public/staff?role=manager');
        const managers = mgrRes.ok ? await mgrRes.json() : [];
        const merged = [...(Array.isArray(sales) ? sales : []), ...(Array.isArray(managers) ? managers : [])];
        // Filter to Sales and Managers only
        const filtered = merged.filter((u: any) => ['sales', 'manager'].includes(String(u.role || '').toLowerCase()));
        // De-duplicate by id
        const unique = Array.from(new Map(filtered.map((u: any) => [u.id, u])).values());
        setStaffMembers(unique);
      } catch (err) {
        console.error('Failed to load staff members:', err);
      }
    };
    
    loadStaffMembers();
  }, []);

  // Fetch availability slots when staff/date/duration changes
  useEffect(() => {
    const staffId = formData.assignedStaffId ? Number(formData.assignedStaffId) : undefined;
    const dateOnly = formData.dateTime ? String(formData.dateTime).slice(0, 10) : '';
    if (!staffId || !dateOnly) { setAvailableSlots([]); setSelectedSlot(null); return; }
    const duration = formData.durationMinutes || 60;
    fetch(`/api/public/availability?userId=${staffId}&date=${dateOnly}&duration=${duration}`)
      .then(r => r.json())
      .then((slots: string[]) => {
        const arr = Array.isArray(slots) ? slots : [];
        setAvailableSlots(arr);
        if (arr.length === 1) {
          setSelectedSlot(arr[0]);
          setFormData(prev => ({ ...prev, dateTime: arr[0].slice(0, 16) }));
        }
      })
      .catch(() => { setAvailableSlots([]); setSelectedSlot(null); });
  }, [formData.assignedStaffId, formData.dateTime, formData.durationMinutes]);

  // Load initial data when component mounts or initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData
      }));

      // Set active tab based on initial data
      if (initialData.partyId && initialData.partyMemberId) {
        setActiveTab('party');
      } else if (initialData.individualCustomerId) {
        setActiveTab('individual');
      }
    }
  }, [initialData]);

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
    setActiveTab('individual');
    setFormData(prev => ({
      ...prev,
      individualCustomerId: customer.id,
      partyId: undefined,
      partyMemberId: undefined,
      type: 'fitting', // Default to general fitting for individual customers
      autoScheduleNext: false
    }));
  };

  const handlePartyMemberSelect = (party: Party, member: PartyMember) => {
    setSelectedParty(party);
    setSelectedMember(member);
    setSelectedCustomer(null);
    setActiveTab('party');
    setFormData(prev => ({
      ...prev,
      partyId: party.id,
      partyMemberId: member.id,
      individualCustomerId: undefined,
      // Auto-suggest appointment type based on existing appointments
      type: suggestAppointmentType(member.appointments || []),
      // Auto-enable next appointment scheduling for wedding parties
      autoScheduleNext: true
    }));
  };

  const suggestAppointmentType = (appointments: Appointment[]): AppointmentFormData['type'] => {
    const completedTypes = appointments
      .filter(a => a.status === 'completed')
      .map(a => a.type);
    
    if (!completedTypes.includes('first_fitting')) return 'first_fitting';
    if (!completedTypes.includes('alterations_fitting')) return 'alterations_fitting';
    if (!completedTypes.includes('pickup')) return 'pickup';
    return 'fitting';
  };

  const getProgressStatus = (appointments: Appointment[] = [], jobs: AlterationJob[] = []) => {
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const totalAppointments = appointments.length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const totalJobs = jobs.length;

    if (totalAppointments === 0 && totalJobs === 0) {
      return { label: 'Not Started', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    }

    const progress = ((completedAppointments + completedJobs) / (totalAppointments + totalJobs)) * 100;

    if (progress === 0) {
      return { label: 'Not Started', color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    } else if (progress < 50) {
      return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
    } else if (progress < 100) {
      return { label: 'Almost Done', color: 'bg-blue-100 text-blue-800', icon: Package };
    } else {
      return { label: 'Complete', color: 'bg-green-100 text-green-800', icon: CheckCircle };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.dateTime) {
      error('Date & Time is required');
      return;
    }

    if (!formData.individualCustomerId && !formData.partyId) {
      error('Please select either an individual customer or a party member');
      return;
    }

    try {
      await onSubmit(formData);
      success('Appointment scheduled successfully');
    } catch (error) {
      error('Failed to schedule appointment');
    }
  };

  const selectedEntity = selectedCustomer || selectedMember;
  const progress = selectedEntity ? getProgressStatus(selectedEntity.appointments, selectedEntity.alterationJobs) : null;

  const clearSelection = () => {
    setSelectedCustomer(null);
    setSelectedParty(null);
    setSelectedMember(null);
    setFormData(prev => ({
      ...prev,
      individualCustomerId: undefined,
      partyId: undefined,
      partyMemberId: undefined,
      type: 'fitting',
      autoScheduleNext: false
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer/Party Selection */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Select Customer or Party Member</Label>
          {(selectedCustomer || selectedMember) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="text-xs"
            >
              Clear Selection
            </Button>
          )}
        </div>

        {!selectedCustomer && !selectedMember ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'individual' | 'party')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Individual Customer
              </TabsTrigger>
              <TabsTrigger value="party" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Wedding Party Member
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="individual" className="space-y-4">
              <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-sm">Individual Customer Appointment</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Schedule appointments for individual customers not part of a wedding party. 
                  Perfect for regular fittings, alterations, or consultations.
                </p>
                <CustomerSearch
                  onCustomerSelect={handleCustomerSelect}
                  onPartyMemberSelect={handlePartyMemberSelect}
                  placeholder="Search individual customers..."
                  showProgressIndicators={true}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="party" className="space-y-4">
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-sm">Wedding Party Member Appointment</span>
                </div>
                <p className="text-sm text-blue-600 mb-4">
                  Schedule appointments for wedding party members with automated timeline tracking. 
                  The system will suggest appropriate appointment types based on the wedding date.
                </p>
                <CustomerSearch
                  onCustomerSelect={handleCustomerSelect}
                  onPartyMemberSelect={handlePartyMemberSelect}
                  placeholder="Search wedding parties and members..."
                  showProgressIndicators={true}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          /* Selected Customer/Member Info */
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
                    {selectedCustomer?.phone && (
                      <div className="text-sm text-gray-500">{selectedCustomer.phone}</div>
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
              
              {/* Appointment History Summary */}
              {selectedEntity && selectedEntity.appointments && selectedEntity.appointments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-2">Recent Appointments:</div>
                  <div className="space-y-1">
                    {selectedEntity.appointments.slice(0, 3).map((apt) => (
                      <div key={apt.id} className="flex items-center justify-between text-xs">
                        <span className="capitalize">{apt.type.replace('_', ' ')}</span>
                        <span className="text-gray-500">
                          {new Date(apt.dateTime).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Staff Assignment (choose who the appointment is with) */}
      <div className="space-y-2">
        <Label htmlFor="assignedStaff">Assigned Staff (Sales / Manager)</Label>
        <Select
          value={formData.assignedStaffId || ''}
          onValueChange={(value) => 
            setFormData(prev => ({ ...prev, assignedStaffId: value || undefined }))
          }
        >
          <SelectTrigger aria-label="Assigned Staff">
            <SelectValue placeholder="Select staff member" />
          </SelectTrigger>
          <SelectContent>
            {staffMembers.map((staff) => (
              <SelectItem key={staff.id} value={staff.id.toString()}>
                {staff.name} ({staff.role})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.assignedStaffId && (
          <div className="text-xs text-gray-500">
            Pick a date and duration next to load available time slots.
          </div>
        )}
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
          {/* Available slots when staff selected */}
          {availableSlots.length > 0 && (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-2">
                {availableSlots.slice(0, 12).map((iso) => {
                  const label = new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
                  const isActive = formData.dateTime && new Date(formData.dateTime).toISOString() === iso;
                  return (
                    <Button
                      key={iso}
                      type="button"
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => { setSelectedSlot(iso); setFormData(prev => ({ ...prev, dateTime: iso.slice(0, 16) })); }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <div>
                <Label className="text-xs text-gray-600">Or choose a slot</Label>
                <select
                  className="mt-1 w-full border rounded px-2 py-1 bg-white dark:bg-gray-800 text-black dark:text-white"
                  value={selectedSlot || ''}
                  onChange={(e) => { const iso = e.target.value; setSelectedSlot(iso || null); if (iso) setFormData(prev => ({ ...prev, dateTime: iso.slice(0, 16) })); }}
                >
                  <option value="">Select available time…</option>
                  {availableSlots.map(iso => (
                    <option key={iso} value={iso}>{new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
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

      {/* Status and Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, status: value }))
            }
          >
            <SelectTrigger aria-label="Status">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="no-show">No Show</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="type">Appointment Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: AppointmentFormData['type']) => 
              setFormData(prev => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger aria-label="Appointment Type">
              <SelectValue placeholder="Select type" />
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
      </div>

      {/* Availability Hint */}
      {formData.assignedStaffId && (
        <div className="text-xs text-gray-500">
          Availability is validated on save. For fastest booking, start from the Calendar tab and pick an open slot.
        </div>
      )}

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

      {/* Individual Customer Info */}
      {selectedCustomer && !selectedParty && (
        <Card className="bg-gray-50 border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-800">
              Individual Customer Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-sm text-gray-700 space-y-1">
              <div>• This appointment will be tracked independently</div>
              <div>• No automatic timeline scheduling</div>
              <div>• Perfect for regular fittings, alterations, or consultations</div>
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
          {loading ? 'Saving...' : isEdit ? 'Update Appointment' : 'Schedule Appointment'}
        </Button>
      </div>
    </form>
  );
};