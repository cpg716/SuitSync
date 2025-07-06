import React, { useState, useEffect } from 'react';
import { AppointmentStatus, AppointmentType } from '../../src/types/appointments';
import { Button } from './Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { StaffSelect } from './UserSelect';
import { api } from '../../lib/apiClient';
import { format, parseISO } from 'date-fns';

export default function AppointmentModal({ open, onClose, onSubmit, appointment, loading }: any) {
  const [partyId, setPartyId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [type, setType] = useState('fitting');
  const [status, setStatus] = useState('scheduled');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [notes, setNotes] = useState('');
  const [assignedStaffId, setAssignedStaffId] = useState('');

  const [parties, setParties] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const initialDateTime = appointment?.dateTime 
        ? format(parseISO(appointment.dateTime), "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm");

    setPartyId(appointment?.partyId || '');
    setMemberId(appointment?.memberId || '');
    setDateTime(initialDateTime);
    setType(appointment?.type || 'fitting');
    setStatus(appointment?.status || 'scheduled');
    setDurationMinutes(appointment?.durationMinutes || 60);
    setRecurrenceRule(appointment?.recurrenceRule || '');
    setNotes(appointment?.notes || '');
    setAssignedStaffId(appointment?.assignedStaffId || '');
  }, [appointment]);

  useEffect(() => {
    if (open) {
      api.get('/api/parties').then(res => setParties(Array.isArray(res.data) ? res.data : [])).catch(err => setError("Failed to load parties."));
      api.get('/api/admin/settings/staff').then(res => setStaff(Array.isArray(res.data) ? res.data : [])).catch(err => console.error("Failed to load staff."));
    }
  }, [open]);

  useEffect(() => {
    if (partyId) {
      setMembers([]); // Clear previous members
      api.get(`/api/parties/${partyId}/members`).then(res => {
          setMembers(Array.isArray(res.data) ? res.data : []);
      }).catch(err => {
        // setError("Failed to load party members.");
      });
    } else {
      setMembers([]);
    }
  }, [partyId]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!partyId || !dateTime) {
        setError("Party and Date & Time are required fields.");
        return;
    };
    setError('');
    onSubmit({ id: appointment?.id, partyId, memberId, dateTime, type, status, durationMinutes, recurrenceRule, notes, assignedStaffId });
  };

  return (
    <Modal open={open} onClose={onClose} title={appointment ? 'Edit Appointment' : 'New Appointment'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-300 p-3 rounded-md text-sm">{error}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <Label htmlFor="party" className="text-sm font-medium">Party</Label>
            <Select value={partyId} onValueChange={(value) => { setPartyId(value); setMemberId(''); }} required>
              <SelectTrigger id="party" className="h-11 sm:h-10">
                <SelectValue placeholder="Select a party..." />
              </SelectTrigger>
              <SelectContent>
                {(Array.isArray(parties) ? parties : []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="member" className="text-sm font-medium">Party Member</Label>
            {(Array.isArray(members) && members.length > 0) && (
              <div>
                <Select value={memberId} onValueChange={setMemberId}>
                  <SelectTrigger id="member" className="h-11 sm:h-10">
                    <SelectValue placeholder={!partyId ? "Select a party first" : "Select a member..."} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">(No specific member)</SelectItem>
                    {(Array.isArray(members) ? members : []).map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.customer ? `${m.customer.firstName} ${m.customer.lastName}` : (m.role || m.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="dateTime" className="text-sm font-medium">Date & Time</Label>
            <Input id="dateTime" type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required className="h-11 sm:h-10" />
          </div>
          <div>
            <Label htmlFor="type" className="text-sm font-medium">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className="h-11 sm:h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(AppointmentType).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="status" className="text-sm font-medium">Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger id="status" className="h-11 sm:h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.values(AppointmentStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="duration" className="text-sm font-medium">Duration (minutes)</Label>
            <Input id="duration" type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} min={15} step={15} className="h-11 sm:h-10" />
          </div>
          <div>
            <Label htmlFor="assignedStaff" className="text-sm font-medium">Assigned Staff</Label>
            <StaffSelect
              users={staff}
              value={assignedStaffId}
              onValueChange={setAssignedStaffId}
              placeholder="Select staff member..."
              allowEmpty={true}
              emptyLabel="No staff assigned"
              className="w-full"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="recurrenceRule" className="text-sm font-medium">Recurrence Rule (iCalendar RRULE)</Label>
          <Input id="recurrenceRule" type="text" value={recurrenceRule} onChange={e => setRecurrenceRule(e.target.value)} placeholder="e.g. FREQ=WEEKLY;COUNT=4" className="h-11 sm:h-10" />
        </div>
        <div>
          <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
          <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[100px] resize-y" />
        </div>
        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-2 pt-4 sm:pt-6">
          <Button type="button" variant="ghost" onClick={onClose} className="min-h-[44px] sm:min-h-[40px] order-2 sm:order-1 touch-manipulation">Cancel</Button>
          <Button type="submit" disabled={loading} className="min-h-[44px] sm:min-h-[40px] order-1 sm:order-2 touch-manipulation">
            {loading ? 'Saving...' : 'Save Appointment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}