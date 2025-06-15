import { useState, useMemo } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useToast } from '../components/ToastContext';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });
import dayGridPlugin from '@fullcalendar/daygrid';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function PartyDashboard() {
  const { data: parties = [], mutate } = useSWR('/api/parties', fetcher);
  const { data: customers = [] } = useSWR('/api/customers', fetcher);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', eventDate: '', customerId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', name: '', eventDate: '', customerId: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const { success, error: toastError } = useToast();

  const filtered = useMemo(() =>
    parties.filter((p: any) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      customers.find((c: any) => c.id === p.customerId)?.name?.toLowerCase().includes(search.toLowerCase())
    ), [parties, customers, search]);

  async function handleAddParty(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    if (!form.name || !form.eventDate || !form.customerId) {
      setError('All fields are required');
      toastError('All fields are required');
      setSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          eventDate: form.eventDate,
          customerId: Number(form.customerId),
        }),
      });
      if (!res.ok) throw new Error('Failed to add party');
      setModalOpen(false);
      setForm({ name: '', eventDate: '', customerId: '' });
      mutate();
      success('Party added');
    } catch (err) {
      setError('Could not add party');
      toastError('Could not add party');
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(party: any) {
    setEditForm({
      id: party.id,
      name: party.name,
      eventDate: party.eventDate.slice(0, 10),
      customerId: String(party.customerId),
    });
    setEditModalOpen(true);
    setEditError('');
  }

  async function handleEditParty(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true); setEditError('');
    if (!editForm.name || !editForm.eventDate || !editForm.customerId) {
      setEditError('All fields are required');
      toastError('All fields are required');
      setEditSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/parties/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editForm.name,
          eventDate: editForm.eventDate,
          customerId: Number(editForm.customerId),
        }),
      });
      if (!res.ok) throw new Error('Failed to update party');
      setEditModalOpen(false);
      mutate();
      success('Party updated');
    } catch (err) {
      setEditError('Could not update party');
      toastError('Could not update party');
    } finally {
      setEditSaving(false);
    }
  }

  const events = parties.map((p: any) => ({
    title: `💍 ${p.name}`,
    date: p.eventDate.split('T')[0],
    allDay: true,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left: Party List */}
      <Card className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center"><CalendarIcon className="mr-2" /> Parties</h2>
          <Button onClick={() => setModalOpen(true)} aria-label="Add Party"><Plus className="mr-1" /> Add Party</Button>
        </div>
        <div className="p-4">
          <Input
            placeholder="Search parties or customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="mb-4 w-full"
            aria-label="Search parties"
          />
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2">Name</th>
                  <th className="py-2">Date</th>
                  <th className="py-2">Customer</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p: any) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2">{p.eventDate.slice(0, 10)}</td>
                    <td className="py-2">{customers.find((c: any) => c.id === p.customerId)?.name || ''}</td>
                    <td className="py-2">
                      <Button className="mr-2 px-3 py-1 text-sm" onClick={() => openEditModal(p)}>Edit</Button>
                      <Button className="px-3 py-1 text-sm border border-primary bg-white text-primary hover:bg-primary/10">Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
      {/* Right: Calendar */}
      <Card className="p-0">
        <div className="p-4 border-b flex items-center font-semibold"><CalendarIcon className="mr-2" /> Weddings Calendar</div>
        <div className="p-4">
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            events={events}
            height="auto"
          />
        </div>
      </Card>
      {/* Add Party Modal */}
      <Modal isOpen={modalOpen}>
        <form onSubmit={handleAddParty} className="space-y-4 p-4 w-80">
          <h2 className="text-lg font-semibold mb-2">Add Party</h2>
          <Input
            placeholder="Party name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            aria-label="Party name"
          />
          <Input
            type="date"
            value={form.eventDate}
            onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
            required
            aria-label="Event date"
          />
          <select
            value={form.customerId}
            onChange={e => setForm(f => ({ ...f, customerId: e.target.value }))}
            required
            className="w-full border rounded px-3 py-2"
            aria-label="Customer"
          >
            <option value="">Select customer…</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving…' : 'Add Party'}</Button>
        </form>
      </Modal>
      {/* Edit Party Modal */}
      <Modal isOpen={editModalOpen}>
        <form onSubmit={handleEditParty} className="space-y-4 p-4 w-80">
          <h2 className="text-lg font-semibold mb-2">Edit Party</h2>
          <Input
            placeholder="Party name"
            value={editForm.name}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
            required
            aria-label="Party name"
          />
          <Input
            type="date"
            value={editForm.eventDate}
            onChange={e => setEditForm(f => ({ ...f, eventDate: e.target.value }))}
            required
            aria-label="Event date"
          />
          <select
            value={editForm.customerId}
            onChange={e => setEditForm(f => ({ ...f, customerId: e.target.value }))}
            required
            className="w-full border rounded px-3 py-2"
            aria-label="Customer"
          >
            <option value="">Select customer…</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {editError && <div className="text-red-600 text-sm">{editError}</div>}
          <Button type="submit" className="w-full" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</Button>
        </form>
      </Modal>
    </div>
  );
}