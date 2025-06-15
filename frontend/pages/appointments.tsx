import { useState } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Calendar as CalendarIcon, List as ListIcon, Plus } from 'lucide-react';
import { useToast } from '../components/ToastContext';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

export default function AppointmentsPage() {
  const { data: appointments = [], mutate } = useSWR('/api/appointments', fetcher);
  const { data: parties = [] } = useSWR('/api/parties', fetcher);
  const { data: users = [] } = useSWR('/api/users', fetcher);
  const [tab, setTab] = useState<'list' | 'calendar'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ partyId: '', dateTime: '', duration: '', tailorId: '', status: 'scheduled' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', partyId: '', dateTime: '', duration: '', tailorId: '', status: 'scheduled' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const { success, error: toastError } = useToast();

  async function handleAddAppointment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    if (!form.partyId || !form.dateTime || !form.duration) {
      setError('All fields are required');
      toastError('All fields are required');
      setSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          partyId: Number(form.partyId),
          dateTime: form.dateTime,
          duration: Number(form.duration),
          tailorId: form.tailorId ? Number(form.tailorId) : null,
          status: form.status,
        }),
      });
      if (!res.ok) throw new Error('Failed to add appointment');
      setModalOpen(false);
      setForm({ partyId: '', dateTime: '', duration: '', tailorId: '', status: 'scheduled' });
      mutate();
      success('Appointment added');
    } catch (err) {
      setError('Could not add appointment');
      toastError('Could not add appointment');
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(appt: any) {
    setEditForm({
      id: appt.id,
      partyId: String(appt.partyId),
      dateTime: appt.dateTime.slice(0, 16),
      duration: String(appt.duration || ''),
      tailorId: appt.tailorId ? String(appt.tailorId) : '',
      status: appt.status,
    });
    setEditModalOpen(true);
    setEditError('');
  }

  async function handleEditAppointment(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true); setEditError('');
    if (!editForm.partyId || !editForm.dateTime || !editForm.duration) {
      setEditError('All fields are required');
      toastError('All fields are required');
      setEditSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/appointments/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          partyId: Number(editForm.partyId),
          dateTime: editForm.dateTime,
          duration: Number(editForm.duration),
          tailorId: editForm.tailorId ? Number(editForm.tailorId) : null,
          status: editForm.status,
        }),
      });
      if (!res.ok) throw new Error('Failed to update appointment');
      setEditModalOpen(false);
      mutate();
      success('Appointment updated');
    } catch (err) {
      setEditError('Could not update appointment');
      toastError('Could not update appointment');
    } finally {
      setEditSaving(false);
    }
  }

  const events = appointments.map((a: any) => ({
    title: `Appt: ${parties.find((p: any) => p.id === a.partyId)?.name || ''}`,
    start: a.dateTime,
    allDay: false,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button className={`px-4 py-2 ${tab === 'list' ? 'bg-primary text-white' : 'bg-white text-primary border border-primary'}`} onClick={() => setTab('list')} aria-label="List view"><ListIcon className="mr-2" /> List</Button>
        <Button className={`px-4 py-2 ${tab === 'calendar' ? 'bg-primary text-white' : 'bg-white text-primary border border-primary'}`} onClick={() => setTab('calendar')} aria-label="Calendar view"><CalendarIcon className="mr-2" /> Calendar</Button>
        <div className="flex-1" />
        <Button onClick={() => setModalOpen(true)} aria-label="Add Appointment"><Plus className="mr-1" /> Add Appointment</Button>
      </div>
      {tab === 'list' ? (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2">Party</th>
                  <th className="py-2">Date/Time</th>
                  <th className="py-2">Duration</th>
                  <th className="py-2">Tailor</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a: any) => (
                  <tr key={a.id} className="border-t">
                    <td className="py-2">{parties.find((p: any) => p.id === a.partyId)?.name || ''}</td>
                    <td className="py-2">{a.dateTime.replace('T', ' ').slice(0, 16)}</td>
                    <td className="py-2">{a.duration} min</td>
                    <td className="py-2">{users.find((u: any) => u.id === a.tailorId)?.name || ''}</td>
                    <td className="py-2">{a.status}</td>
                    <td className="py-2">
                      <Button className="mr-2 px-3 py-1 text-sm" onClick={() => openEditModal(a)}>Edit</Button>
                      <Button className="px-3 py-1 text-sm border border-primary bg-white text-primary hover:bg-primary/10">Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="p-0">
          <div className="p-4 border-b flex items-center font-semibold"><CalendarIcon className="mr-2" /> Appointments Calendar</div>
          <div className="p-4">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,timeGridDay' }}
              events={events}
              height="auto"
            />
          </div>
        </Card>
      )}
      {/* Add Appointment Modal */}
      <Modal isOpen={modalOpen}>
        <form onSubmit={handleAddAppointment} className="space-y-4 p-4 w-80">
          <h2 className="text-lg font-semibold mb-2">Add Appointment</h2>
          <select
            value={form.partyId}
            onChange={e => setForm(f => ({ ...f, partyId: e.target.value }))}
            required
            className="w-full border rounded px-3 py-2"
            aria-label="Party"
          >
            <option value="">Select party…</option>
            {parties.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Input
            type="datetime-local"
            value={form.dateTime}
            onChange={e => setForm(f => ({ ...f, dateTime: e.target.value }))}
            required
            aria-label="Date/time"
          />
          <Input
            type="number"
            placeholder="Duration (min)"
            value={form.duration}
            onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
            required
            aria-label="Duration"
          />
          <select
            value={form.tailorId}
            onChange={e => setForm(f => ({ ...f, tailorId: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            aria-label="Tailor"
          >
            <option value="">Select tailor…</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={form.status}
            onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            aria-label="Status"
          >
            <option value="scheduled">Scheduled</option>
            <option value="complete">Complete</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving…' : 'Add Appointment'}</Button>
        </form>
      </Modal>
      {/* Edit Appointment Modal */}
      <Modal isOpen={editModalOpen}>
        <form onSubmit={handleEditAppointment} className="space-y-4 p-4 w-80">
          <h2 className="text-lg font-semibold mb-2">Edit Appointment</h2>
          <select
            value={editForm.partyId}
            onChange={e => setEditForm(f => ({ ...f, partyId: e.target.value }))}
            required
            className="w-full border rounded px-3 py-2"
            aria-label="Party"
          >
            <option value="">Select party…</option>
            {parties.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <Input
            type="datetime-local"
            value={editForm.dateTime}
            onChange={e => setEditForm(f => ({ ...f, dateTime: e.target.value }))}
            required
            aria-label="Date/time"
          />
          <Input
            type="number"
            placeholder="Duration (min)"
            value={editForm.duration}
            onChange={e => setEditForm(f => ({ ...f, duration: e.target.value }))}
            required
            aria-label="Duration"
          />
          <select
            value={editForm.tailorId}
            onChange={e => setEditForm(f => ({ ...f, tailorId: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            aria-label="Tailor"
          >
            <option value="">Select tailor…</option>
            {users.map((u: any) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <select
            value={editForm.status}
            onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            aria-label="Status"
          >
            <option value="scheduled">Scheduled</option>
            <option value="complete">Complete</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {editError && <div className="text-red-600 text-sm">{editError}</div>}
          <Button type="submit" className="w-full" disabled={editSaving}>{editSaving ? 'Saving…' : 'Save Changes'}</Button>
        </form>
      </Modal>
    </div>
  );
}