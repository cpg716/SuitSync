import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Label } from '../components/ui/Label';
import { Textarea } from '../components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import Layout from '../components/Layout';
import { useToast } from '../components/ToastContext';
import { AppointmentStatus, AppointmentType } from '../src/types/appointments';
import { Users, User, Calendar, Clock, Search } from 'lucide-react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

export default function CreateAppointment() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  // Data fetching
  const { data: parties = [] } = useSWR('/api/parties', fetcher);
  const { data: customers = [] } = useSWR('/api/customers', fetcher);
  const { data: staff = [] } = useSWR('/api/users?role=tailor,sales', fetcher);

  // Form state
  const [selectionMode, setSelectionMode] = useState<'party' | 'individual'>('party');
  const [partyId, setPartyId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [partySearch, setPartySearch] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [appointmentType, setAppointmentType] = useState('fitting');
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [assignedStaffId, setAssignedStaffId] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('scheduled');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  // Handle party selection and load members
  const handlePartyChange = async (partyId: string) => {
    setPartyId(partyId);
    setMemberId('');
    setMembers([]);

    if (partyId) {
      try {
        const response = await fetch(`/api/parties/${partyId}/members`, { credentials: 'include' });
        if (response.ok) {
          const memberData = await response.json();
          setMembers(memberData);
        }
      } catch (error) {
        console.error('Error loading party members:', error);
      }
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter((customer: any) =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (customer.email && customer.email.toLowerCase().includes(customerSearch.toLowerCase())) ||
    (customer.phone && customer.phone.includes(customerSearch))
  );

  // Filter parties based on search
  const filteredParties = parties.filter((party: any) =>
    party.name.toLowerCase().includes(partySearch.toLowerCase()) ||
    new Date(party.eventDate).toLocaleDateString().includes(partySearch)
  );

  // Handle appointment type change with duration suggestions
  const handleAppointmentTypeChange = (type: string) => {
    setAppointmentType(type);

    // Suggest duration based on appointment type
    switch (type) {
      case 'first_fitting':
        setDurationMinutes(90);
        break;
      case 'alterations_fitting':
        setDurationMinutes(60);
        break;
      case 'pickup':
        setDurationMinutes(30);
        break;
      default:
        setDurationMinutes(60);
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dateTime) {
      toastError('Date and time are required');
      return;
    }

    if (selectionMode === 'party' && !partyId) {
      toastError('Please select a party');
      return;
    }

    if (selectionMode === 'individual' && !customerId) {
      toastError('Please select a customer');
      return;
    }

    setLoading(true);

    try {
      const appointmentData: any = {
        dateTime,
        type: appointmentType,
        status,
        durationMinutes,
        notes,
        tailorId: assignedStaffId || null
      };

      if (selectionMode === 'party') {
        appointmentData.partyId = parseInt(partyId);
        if (memberId) {
          appointmentData.memberId = parseInt(memberId);
        }
      } else {
        appointmentData.individualCustomerId = parseInt(customerId);
      }

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(appointmentData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create appointment');
      }

      success('Appointment created successfully');
      router.push('/appointments');

    } catch (error: any) {
      toastError(error.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Schedule Appointment
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create a new appointment for individual customers or wedding party members
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 lg:space-y-8">
          {/* Customer Selection Mode */}
          <Card className="p-4 sm:p-6">
            <div className="mb-4">
              <Label className="text-sm sm:text-base font-semibold">Customer Selection</Label>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Choose how you want to select the customer for this appointment
              </p>
            </div>

            <Tabs value={selectionMode} onValueChange={(value) => setSelectionMode(value as 'individual' | 'party')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Individual Customer</span>
                  <span className="sm:hidden">Individual</span>
                </TabsTrigger>
                <TabsTrigger value="party" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Wedding Party</span>
                  <span className="sm:hidden">Party</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="individual" className="mt-4">
                <div className="space-y-4">
                  <Label>Search and Select Customer</Label>
                  <CustomerSearch
                    onCustomerSelect={handleCustomerSelect}
                    onPartyMemberSelect={() => {}} // Not used in individual mode
                    mode="customers"
                    placeholder="Search customers by name, email, or phone..."
                    showProgressIndicators={true}
                  />

                  {selectedCustomer && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {selectedCustomer.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {selectedCustomer.email || selectedCustomer.phone || 'No contact info'}
                          </p>
                        </div>
                        {progressInfo && (
                          <Badge variant="outline" className={progressInfo.color}>
                            {progressInfo.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="party" className="mt-4">
                <div className="space-y-4">
                  <Label>Search and Select Wedding Party</Label>
                  <CustomerSearch
                    onCustomerSelect={() => {}} // Not used in party mode
                    onPartyMemberSelect={handlePartyMemberSelect}
                    mode="parties"
                    placeholder="Search wedding parties by name or event date..."
                    showProgressIndicators={true}
                  />

                  {selectedParty && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {selectedParty.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Event Date: {new Date(selectedParty.eventDate).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {selectedParty.members?.length || 0} members
                          </Badge>
                        </div>
                      </div>

                      {selectedParty.members && selectedParty.members.length > 0 && (
                        <div>
                          <Label>Select Party Member (Optional)</Label>
                          <PartyMemberSelector
                            party={selectedParty}
                            onMemberSelect={setSelectedMember}
                            selectedMemberId={selectedMember?.id}
                            showProgressIndicators={true}
                            className="mt-2"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Appointment Details */}
          <Card className="p-4 sm:p-6">
            <div className="mb-4">
              <Label className="text-sm sm:text-base font-semibold">Appointment Details</Label>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Configure the appointment type, timing, and staff assignment
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {/* Appointment Type */}
              <div className="space-y-2">
                <Label htmlFor="appointmentType">Appointment Type</Label>
                <Select value={appointmentType} onValueChange={handleAppointmentTypeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select appointment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEDDING_TIMELINE.map((stage) => (
                      <SelectItem key={stage.type} value={stage.type}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {stage.stage}
                          </Badge>
                          <span>{stage.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {getTimelineStage(appointmentType) && (
                  <p className="text-xs text-gray-500">
                    {getTimelineStage(appointmentType)?.description}
                  </p>
                )}
              </div>

              {/* Date & Time */}
              <div className="space-y-2">
                <Label htmlFor="dateTime">Date & Time</Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  required
                />
                {selectedParty?.eventDate && (
                  <p className="text-xs text-gray-500">
                    Event date: {new Date(selectedParty.eventDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={240}
                  step={15}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>

              {/* Assigned Staff */}
              <div className="space-y-2">
                <Label htmlFor="staff">Assigned Staff (Optional)</Label>
                <UserSelect
                  users={staff}
                  value={assignedStaffId}
                  onValueChange={setAssignedStaffId}
                  placeholder="Select staff member..."
                  allowEmpty={true}
                  emptyLabel="Unassigned"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="rescheduled">Rescheduled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-6 space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any special notes or requirements for this appointment..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </Card>

          {/* Workflow Preview */}
          {(selectedCustomer || selectedMember) && progressInfo && (
            <Card className="p-4 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
              <div className="mb-4">
                <Label className="text-sm sm:text-base font-semibold">Appointment Timeline</Label>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Track progress through the wedding appointment process
                </p>
              </div>

              <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {WEDDING_TIMELINE.map((stage, index) => {
                  const isCompleted = selectedMember?.appointments?.some(
                    apt => apt.type === stage.type && apt.status === 'completed'
                  ) || selectedCustomer?.appointments?.some(
                    apt => apt.type === stage.type && apt.status === 'completed'
                  );
                  const isCurrent = appointmentType === stage.type;

                  return (
                    <div key={stage.type} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <div className={`
                        flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg border-2 transition-all min-w-0
                        ${isCurrent
                          ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/40'
                          : isCompleted
                          ? 'border-green-500 bg-green-100 dark:bg-green-900/40'
                          : 'border-gray-300 bg-white dark:bg-gray-800'
                        }
                      `}>
                        <div className={`
                          w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${isCurrent
                            ? 'bg-blue-500 text-white'
                            : isCompleted
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-300 text-gray-600'
                          }
                        `}>
                          {isCompleted ? '✓' : stage.stage}
                        </div>
                        <div className="text-xs sm:text-sm min-w-0">
                          <div className="font-medium truncate">{stage.name}</div>
                          <div className="text-xs text-gray-500 hidden sm:block">{stage.defaultDuration}min</div>
                        </div>
                      </div>

                      {index < WEDDING_TIMELINE.length - 1 && (
                        <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-0 pt-4 sm:pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
              className="order-2 sm:order-1"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={loading || !dateTime || (!selectedCustomer && !selectedParty)}
              className="min-w-[120px] order-1 sm:order-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  <span className="hidden sm:inline">Creating...</span>
                  <span className="sm:hidden">Creating</span>
                </div>
              ) : (
                <>
                  <span className="hidden sm:inline">Create Appointment</span>
                  <span className="sm:hidden">Create</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}