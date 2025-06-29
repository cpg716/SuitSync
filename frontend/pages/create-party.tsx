import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ToastContext';

export default function CreatePartyPage() {
  const [name, setName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const router = useRouter();
  const { success, error: toastError } = useToast();

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (!name || !eventDate) {
      toastError('All fields are required');
      return;
    }
    try {
      await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, eventDate }),
      });
      success('Party created');
      router.push('/party-dashboard');
    } catch (err) {
      toastError('Failed to create party');
    }
  }

  return (
    <Card>
      <h1 className="text-2xl font-semibold mb-4">New Party</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span>Party Name</span>
          <input
            type="text"
            className="mt-1 w-full px-4 py-2 border border-neutral-300 rounded-lg"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>
        <label className="block">
          <span>Event Date</span>
          <input
            type="datetime-local"
            className="mt-1 w-full px-4 py-2 border border-neutral-300 rounded-lg"
            value={eventDate}
            onChange={e => setEventDate(e.target.value)}
          />
        </label>
        <Button type="submit">Create Party</Button>
      </form>
    </Card>
  );
}