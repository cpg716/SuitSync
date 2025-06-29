import React, { useState, useEffect } from 'react';
import { AppointmentStatus, AppointmentType } from '../../src/types/appointments';
import { Button } from './Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { api } from '../../lib/apiClient';
import { format, parseISO } from 'date-fns';

export default function AppointmentModal({ open, onClose, onSubmit, appointment, loading }) {
  const [partyId, setPartyId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [type, setType] = useState('fitting');
  const [status, setStatus] = useState('scheduled');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [recurrenceRule, setRecurrenceRule] = useState('');
  const [notes, setNotes] = useState('');
  
  const [parties, setParties] = useState([]);
  const [members, setMembers] = useState([]);
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
  }, [appointment]);

  useEffect(() => {
    if (open) {
      api.get('/parties').then(res => setParties(Array.isArray(res.data) ? res.data : [])).catch(err => setError("Failed to load parties."));
    }
  }, [open]);

  useEffect(() => {
    if (partyId) {
      setMembers([]); // Clear previous members
      api.get(`/parties/${partyId}/members`).then(res => {
          setMembers(Array.isArray(res.data) ? res.data : []);
      }).catch(err => {
        // setError("Failed to load party members.");
      });
    } else {
      setMembers([]);
    }
  }, [partyId]);

  const handleSubmit = e => {
    e.preventDefault();
    if (!partyId || !dateTime) {
        setError("Party and Date & Time are required fields.");
        return;
    };
    setError('');
    onSubmit({ id: appointment?.id, partyId, memberId, dateTime, type, status, durationMinutes, recurrenceRule, notes });
  };

  return (
    <Modal open={open} onClose={onClose} title={appointment ? 'Edit Appointment' : 'New Appointment'}>
        <form onSubmit={handleSubmit} className="space-y-4">
            {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/20 dark:text-red-300 p-3 rounded-md">{error}</p>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="party">Party</Label>
                <Select value={partyId} onValueChange={(value) => { setPartyId(value); setMemberId(''); }} required>
                    <SelectTrigger id="party">
                        <SelectValue placeholder="Select a party..." />
                    </SelectTrigger>
                    <SelectContent>
                        {(Array.isArray(parties) ? parties : []).map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="member">Party Member</Label>
                {(Array.isArray(members) && members.length > 0) && (
                    <div>
                        <label className="block mb-1">Member</label>
                        <Select value={memberId} onValueChange={setMemberId}>
                            <SelectTrigger id="member">
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
                <Label htmlFor="dateTime">Date & Time</Label>
                <Input id="dateTime" type="datetime-local" value={dateTime} onChange={e => setDateTime(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                    <SelectTrigger id="type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.values(AppointmentType).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                 <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {Object.values(AppointmentStatus).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" type="number" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} min={15} step={15} />
              </div>
            </div>
            <div>
                <Label htmlFor="recurrenceRule">Recurrence Rule (iCalendar RRULE)</Label>
                <Input id="recurrenceRule" type="text" value={recurrenceRule} onChange={e => setRecurrenceRule(e.target.value)} placeholder="e.g. FREQ=WEEKLY;COUNT=4" />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Appointment'}
                </Button>
            </div>
        </form>
    </Modal>
  );
}