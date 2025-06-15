import { useState, useEffect } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Calendar as CalendarIcon, List as ListIcon, Plus, GripVertical, Clock, User } from 'lucide-react';
import { useToast } from '../components/ToastContext';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

const statusCols = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Completed' },
];

export default function AlterationKanban() {
  const { data: alterations = [], mutate } = useSWR('/api/alterations', fetcher);
  const { data: parties = [] } = useSWR('/api/parties', fetcher);
  const { data: users = [] } = useSWR('/api/users', fetcher);
  const [tab, setTab] = useState<'list' | 'schedule'>('list');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ partyId: '', notes: '', timeSpent: '', scheduledDateTime: '', tailorId: '', status: 'pending' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ id: '', partyId: '', notes: '', timeSpent: '', scheduledDateTime: '', tailorId: '', status: 'pending' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [skills, setSkills] = useState([]);
  const [tailors, setTailors] = useState({});
  const [dragged, setDragged] = useState(null);
  const [loading, setLoading] = useState(true);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    fetch('/api/alterations').then(r => r.json()).then(data => { setJobs(data); setLoading(false); });
    fetch('/api/alterations/skills').then(r => r.json()).then(setSkills);
  }, []);

  const getEligibleTailors = async (itemType) => {
    if (tailors[itemType]) return tailors[itemType];
    const res = await fetch(`/api/alterations/available-tailors?skill=${encodeURIComponent(itemType)}`);
    const data = await res.json();
    setTailors(t => ({ ...t, [itemType]: data }));
    return data;
  };

  const handleStatusChange = async (job, newStatus) => {
    await fetch(`/api/alterations/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...job, status: newStatus })
    });
    setJobs(jobs => jobs.map(j => j.id === job.id ? { ...j, status: newStatus } : j));
  };

  const handleTailorChange = async (job, tailorId) => {
    await fetch(`/api/alterations/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...job, tailorId })
    });
    setJobs(jobs => jobs.map(j => j.id === job.id ? { ...j, tailorId } : j));
  };

  const handleTimeEdit = async (job, estimatedTime) => {
    await fetch(`/api/alterations/${job.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...job, estimatedTime })
    });
    setJobs(jobs => jobs.map(j => j.id === job.id ? { ...j, estimatedTime } : j));
  };

  const events = alterations.filter((a: any) => a.scheduledDateTime).map((a: any) => ({
    title: `Alt: ${parties.find((p: any) => p.id === a.partyId)?.name || ''}`,
    start: a.scheduledDateTime,
    allDay: false,
  }));

  async function handleAddAlteration(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    if (!form.partyId || !form.status) {
      setError('Party and status are required');
      toastError('Party and status are required');
      setSaving(false);
      return;
    }
    try {
      const res = await fetch('/api/alterations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          partyId: Number(form.partyId),
          notes: form.notes,
          timeSpent: form.timeSpent ? Number(form.timeSpent) : null,
          scheduledDateTime: form.scheduledDateTime || null,
          tailorId: form.tailorId ? Number(form.tailorId) : null,
          status: form.status,
        }),
      });
      if (!res.ok) throw new Error('Failed to add alteration');
      setModalOpen(false);
      setForm({ partyId: '', notes: '', timeSpent: '', scheduledDateTime: '', tailorId: '', status: 'pending' });
      mutate();
      success('Alteration added');
    } catch (err) {
      setError('Could not add alteration');
      toastError('Could not add alteration');
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(alt: any) {
    setEditForm({
      id: alt.id,
      partyId: String(alt.partyId),
      notes: alt.notes || '',
      timeSpent: alt.timeSpent ? String(alt.timeSpent) : '',
      scheduledDateTime: alt.scheduledDateTime ? alt.scheduledDateTime.slice(0, 16) : '',
      tailorId: alt.tailorId ? String(alt.tailorId) : '',
      status: alt.status,
    });
    setEditModalOpen(true);
    setEditError('');
  }

  async function handleEditAlteration(e: React.FormEvent) {
    e.preventDefault();
    setEditSaving(true); setEditError('');
    if (!editForm.partyId || !editForm.status) {
      setEditError('Party and status are required');
      toastError('Party and status are required');
      setEditSaving(false);
      return;
    }
    try {
      const res = await fetch(`/api/alterations/${editForm.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          partyId: Number(editForm.partyId),
          notes: editForm.notes,
          timeSpent: editForm.timeSpent ? Number(editForm.timeSpent) : null,
          scheduledDateTime: editForm.scheduledDateTime || null,
          tailorId: editForm.tailorId ? Number(editForm.tailorId) : null,
          status: editForm.status,
        }),
      });
      if (!res.ok) throw new Error('Failed to update alteration');
      setEditModalOpen(false);
      mutate();
      success('Alteration updated');
    } catch (err) {
      setEditError('Could not update alteration');
      toastError('Could not update alteration');
    } finally {
      setEditSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Button className={`px-4 py-2 ${tab === 'list' ? 'bg-primary text-white' : 'bg-white text-primary border border-primary'}`} onClick={() => setTab('list')} aria-label="List view"><ListIcon className="mr-2" /> List</Button>
        <Button className={`px-4 py-2 ${tab === 'schedule' ? 'bg-primary text-white' : 'bg-white text-primary border border-primary'}`} onClick={() => setTab('schedule')} aria-label="Schedule view"><CalendarIcon className="mr-2" /> Schedule</Button>
        <div className="flex-1" />
        <Button onClick={() => setModalOpen(true)} aria-label="Add Alteration"><Plus className="mr-1" /> Add Alteration</Button>
      </div>
      {tab === 'list' ? (
        <Card className="p-0">
          <div className="p-4 border-b flex items-center font-semibold"><CalendarIcon className="mr-2" /> Alterations Schedule</div>
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
      ) : (
        <Card className="p-0">
          <div className="p-4 border-b flex items-center font-semibold"><CalendarIcon className="mr-2" /> Alteration Queue</div>
          <div className="p-4 max-w-full overflow-x-auto">
            <div className="flex gap-4 overflow-x-auto">
              {statusCols.map(col => (
                <div key={col.key} className="flex-1 min-w-[320px] bg-neutral-100 dark:bg-neutral-900 rounded-2xl shadow-card p-3">
                  <h2 className="font-semibold mb-2 text-primary dark:text-accent">{col.label}</h2>
                  <div className="flex flex-col gap-3 min-h-[200px]">
                    {loading ? (
                      <div className="animate-pulse h-32 bg-neutral-200 dark:bg-neutral-800 rounded" />
                    ) : (
                      jobs.filter(j => j.status === col.key).map(job => (
                        <KanbanCard key={job.id} job={job} getEligibleTailors={getEligibleTailors} onStatusChange={handleStatusChange} onTailorChange={handleTailorChange} onTimeEdit={handleTimeEdit} />
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
      {/* Add Alteration Modal */}
      <Modal isOpen={modalOpen}>
        <form onSubmit={handleAddAlteration} className="space-y-4 p-4 w-80">
          <h2 className="text-lg font-semibold mb-2">Add Alteration</h2>
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
            placeholder="Notes"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            aria-label="Notes"
          />
          <Input
            type="number"
            placeholder="Time spent (min)"
            value={form.timeSpent}
            onChange={e => setForm(f => ({ ...f, timeSpent: e.target.value }))}
            aria-label="Time spent"
          />
          <Input
            type="datetime-local"
            value={form.scheduledDateTime}
            onChange={e => setForm(f => ({ ...f, scheduledDateTime: e.target.value }))}
            aria-label="Scheduled date/time"
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
            <option value="pending">Pending</option>
            <option value="complete">Complete</option>
            <option value="cancelled">Cancelled</option>
          </select>
          {error && <div className="text-red-600 text-sm">{error}</div>}
          <Button type="submit" className="w-full" disabled={saving}>{saving ? 'Saving…' : 'Add Alteration'}</Button>
        </form>
      </Modal>
      {/* Edit Alteration Modal */}
      <Modal isOpen={editModalOpen}>
        <form onSubmit={handleEditAlteration} className="space-y-4 p-4 w-80">
          <h2 className="text-lg font-semibold mb-2">Edit Alteration</h2>
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
            placeholder="Notes"
            value={editForm.notes}
            onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
            aria-label="Notes"
          />
          <Input
            type="number"
            placeholder="Time spent (min)"
            value={editForm.timeSpent}
            onChange={e => setEditForm(f => ({ ...f, timeSpent: e.target.value }))}
            aria-label="Time spent"
          />
          <Input
            type="datetime-local"
            value={editForm.scheduledDateTime}
            onChange={e => setEditForm(f => ({ ...f, scheduledDateTime: e.target.value }))}
            aria-label="Scheduled date/time"
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
            <option value="pending">Pending</option>
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

function KanbanCard({ job, getEligibleTailors, onStatusChange, onTailorChange, onTimeEdit }) {
  const [tailorList, setTailorList] = useState([]);
  const [editTime, setEditTime] = useState(false);
  const [timeVal, setTimeVal] = useState(job.estimatedTime || 30);
  useEffect(() => {
    getEligibleTailors(job.itemType).then(setTailorList);
  }, [job.itemType]);
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl shadow p-3 flex flex-col gap-2 touch-manipulation">
      <div className="flex items-center gap-2 mb-1">
        <GripVertical size={16} className="text-neutral-400" />
        <span className="font-semibold text-primary dark:text-accent">{job.itemType}</span>
        <span className="ml-auto text-xs text-neutral-400">Due: {job.scheduledDateTime ? new Date(job.scheduledDateTime).toLocaleDateString() : '-'}</span>
      </div>
      <div className="flex items-center gap-2">
        <User size={16} className="text-neutral-400" />
        <select className="border rounded p-1 text-sm" value={job.tailorId || ''} onChange={e => onTailorChange(job, Number(e.target.value))}>
          <option value="">Unassigned</option>
          {tailorList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <span className="ml-auto flex items-center gap-1 text-xs text-neutral-500">
          <Clock size={14} />
          {editTime ? (
            <input type="number" className="w-12 border rounded p-1 text-xs" value={timeVal} min={5} max={240} onChange={e => setTimeVal(Number(e.target.value))} onBlur={() => { setEditTime(false); onTimeEdit(job, timeVal); }} />
          ) : (
            <span onClick={() => setEditTime(true)} className="cursor-pointer">{job.estimatedTime || 30} min</span>
          )}
        </span>
      </div>
      <div className="flex gap-2 mt-2">
        {['pending', 'in_progress', 'complete'].filter(s => s !== job.status).map(s => (
          <button key={s} className="px-2 py-1 rounded bg-primary text-white text-xs hover:bg-primary-light" onClick={() => onStatusChange(job, s)}>{s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</button>
        ))}
      </div>
    </div>
  );
}