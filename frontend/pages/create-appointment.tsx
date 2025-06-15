import React, { useState } from 'react';
import useSWR from 'swr';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { useToast } from '../components/ToastContext';

const fetcher = () =>
  fetch('http://localhost:3000/api/parties').then(res => res.json());

export default function CreateAppointment() {
  const { data: parties } = useSWR('partyList', fetcher);
  const [partyId, setPartyId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [datetime, setDatetime] = useState('');
  const [notes, setNotes] = useState('');
  const [members, setMembers] = useState([]);
  const { success, error: toastError } = useToast();
  const [successToast, setSuccessToast] = useState(false);

  const handlePartyChange = async e => {
    setPartyId(e.target.value);
    setMemberId('');
    if (e.target.value) {
      const res = await fetch(`http://localhost:3000/api/parties/${e.target.value}/members`);
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
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId, memberId, datetime, notes }),
      });
      success('Appointment booked');
      setSuccessToast(true);
      setPartyId(''); setMemberId(''); setDatetime(''); setNotes(''); setMembers([]);
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
          <Button type="submit">Book</Button>
        </form>
        {successToast && <div className="mt-4 text-green-600">Appointment booked!</div>}
      </Card>
    </div>
  );
}