import React, { useState } from 'react';
import useSWR from 'swr';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ToastContext';
import { AppointmentStatus, AppointmentType } from '../src/types/appointments';

const fetcher = () =>
  fetch('/api/parties').then(res => res.json());

export default function CreateAppointment() {
  const { data: parties } = useSWR('partyList', fetcher);
  const [partyId, setPartyId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [datetime, setDatetime] = useState('');
  const [notes, setNotes] = useState('');
  const [members, setMembers] = useState([]);
  const { success, error: toastError } = useToast();
  const [successToast, setSuccessToast] = useState(false);
  const [type, setType] = useState('fitting');
  const [status, setStatus] = useState('scheduled');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [recurrenceRule, setRecurrenceRule] = useState('');

  const handlePartyChange = async e => {
    setPartyId(e.target.value);
    setMemberId('');
    if (e.target.value) {
      const res = await fetch(`/api/parties/${e.target.value}/members`);
      setMembers(await res.json());
    } else {
      setMembers([]);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!partyId || !datetime) {
      toastError('Party and date/time are required');
      return;
    }
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId, memberId, dateTime: datetime, notes, type, status, durationMinutes, recurrenceRule }),
      });
      if (!res.ok) {
        const err = await res.json();
        toastError(err.error || 'Failed to book appointment');
        return;
      }
      success('Appointment booked');
      setSuccessToast(true);
      setPartyId(''); setMemberId(''); setDatetime(''); setNotes(''); setMembers([]); setType('fitting'); setStatus('scheduled'); setDurationMinutes(60); setRecurrenceRule('');
      setTimeout(() => setSuccessToast(false), 2000);
    } catch (err) {
      toastError('Failed to book appointment');
    }
  };

  return (
    <div className="p-8 bg-neutral-50 min-h-screen">
      <Card className="max-w-lg mx-auto p-8">
        <h1 className="text-2xl font-semibold mb-4">Book a Fitting</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Party</label>
            <select className="w-full border rounded px-3 py-2" value={partyId} onChange={handlePartyChange} required>
              <option value="">Select a party...</option>
              {parties?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {members.length > 0 && (
            <div>
              <label className="block mb-1">Member</label>
              <select className="w-full border rounded px-3 py-2" value={memberId} onChange={e => setMemberId(e.target.value)}>
                <option value="">(Optional) Select a member...</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.role || m.id}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block mb-1">Date & Time</label>
            <Input type="datetime-local" value={datetime} onChange={e => setDatetime(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Notes</label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div>
            <label className="block mb-1">Type</label>
            <select className="w-full border rounded px-3 py-2" value={type} onChange={e => setType(e.target.value as AppointmentType)}>
              {(Object.values(AppointmentType) as string[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1">Status</label>
            <select className="w-full border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value as AppointmentStatus)}>
              {(Object.values(AppointmentStatus) as string[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1">Duration (minutes)</label>
            <input type="number" className="w-full border rounded px-3 py-2" value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))} min={15} max={240} />
          </div>
          <div>
            <label className="block mb-1">Recurrence Rule</label>
            <input type="text" className="w-full border rounded px-3 py-2" value={recurrenceRule} onChange={e => setRecurrenceRule(e.target.value)} placeholder="e.g. FREQ=WEEKLY;COUNT=4" />
          </div>
          <Button type="submit">Book</Button>
        </form>
        {successToast && <div className="mt-4 text-green-600">Appointment booked!</div>}
      </Card>
    </div>
  );
}