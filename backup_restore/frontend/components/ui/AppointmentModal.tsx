import React, { useState, useEffect } from 'react';
import { AppointmentStatus, AppointmentType } from '../../src/types/appointments';
import Card from './Card';
import Button from './Button';

export default function AppointmentModal({ open, onClose, onSubmit, appointment, loading }) {
  const [partyId, setPartyId] = useState(appointment?.partyId || '');
  const [memberId, setMemberId] = useState(appointment?.memberId || '');
  const [dateTime, setDateTime] = useState(appointment?.dateTime ? appointment.dateTime.slice(0,16) : '');
  const [type, setType] = useState(appointment?.type || 'fitting');
  const [status, setStatus] = useState(appointment?.status || 'scheduled');
  const [durationMinutes, setDurationMinutes] = useState(appointment?.durationMinutes || 60);
  const [recurrenceRule, setRecurrenceRule] = useState(appointment?.recurrenceRule || '');
  const [notes, setNotes] = useState(appointment?.notes || '');
  const [parties, setParties] = useState([]);
  const [members, setMembers] = useState([]);
  useEffect(() => {
    fetch('/api/parties').then(res => res.json()).then(setParties);
  }, []);
  useEffect(() => {
    if (partyId) {
      fetch(`/api/parties/${partyId}/members`).then(res => res.json()).then(setMembers);
    } else {
      setMembers([]);
    }
  }, [partyId]);
  const handleSubmit = e => {
    e.preventDefault();
    if (!partyId || !dateTime) return;
    onSubmit({ partyId, memberId, dateTime, type, status, durationMinutes, recurrenceRule, notes });
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <Card className="max-w-lg w-full p-8 relative">
        <button className="absolute top-2 right-2 text-xl" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-4">{appointment ? 'Edit' : 'Add'} Appointment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1">Party</label>
            <select className="w-full border rounded px-3 py-2" value={partyId} onChange={e => setPartyId(e.target.value)} required>
              <option value="">Select a party...</option>
              {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
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
            <input type="datetime-local" className="w-full border rounded px-3 py-2" value={dateTime} onChange={e => setDateTime(e.target.value)} required />
          </div>
          <div>
            <label className="block mb-1">Type</label>
            <select className="w-full border rounded px-3 py-2" value={type} onChange={e => setType(e.target.value)}>
              {(Object.values(AppointmentType) as string[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1">Status</label>
            <select className="w-full border rounded px-3 py-2" value={status} onChange={e => setStatus(e.target.value)}>
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
          <div>
            <label className="block mb-1">Notes</label>
            <input className="w-full border rounded px-3 py-2" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
        </form>
      </Card>
    </div>
  );
} 