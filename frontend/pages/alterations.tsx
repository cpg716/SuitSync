import { useState, useEffect } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Calendar as CalendarIcon, List as ListIcon, Plus, GripVertical, Clock, User, Scissors } from 'lucide-react';
import { useToast } from '../components/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import TagPreview from '../components/ui/TagPreview';
import AlterationModal from '../components/ui/AlterationModal';
import ConfirmModal from '../components/ui/ConfirmModal';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

const statusCols = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Completed' },
];

export default function AlterationsPage() {
  const [tab, setTab] = useState<'list' | 'calendar'>('list');
  const [alterations, setAlterations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const { success, error: toastError } = useToast();
  const [printJob, setPrintJob] = useState<any | null>(null);
  const [calendarJob, setCalendarJob] = useState<any | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [timeEditing, setTimeEditing] = useState(false);
  const [timeVal, setTimeVal] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [tailorFilter, setTailorFilter] = useState('');
  const [editJob, setEditJob] = useState<any | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteJob, setDeleteJob] = useState<any | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [jobTab, setJobTab] = useState<'all' | 'party' | 'walkin'>('all');

  // Get unique tailors from data
  const tailorOptions = Array.from(new Set(alterations.map(a => a.tailor?.name).filter(Boolean)));

  // Tailor time tracking for today
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tailorTimeToday = {};
  alterations.forEach(a => {
    if (a.scheduledDateTime && a.scheduledDateTime.slice(0, 10) === todayStr && a.tailor?.name) {
      if (!tailorTimeToday[a.tailor.name]) {
        tailorTimeToday[a.tailor.name] = { time: 0, jobs: 0, jobList: [] };
      }
      tailorTimeToday[a.tailor.name].time += a.timeSpent || 0;
      tailorTimeToday[a.tailor.name].jobs += 1;
      tailorTimeToday[a.tailor.name].jobList.push(a);
    }
  });

  useEffect(() => {
    setLoading(true);
    fetch('/api/alterations')
      .then(res => res.json())
      .then(data => {
        setAlterations(data);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load alterations');
        setLoading(false);
      });
  }, []);

  const filtered = alterations.filter(a => {
    if (jobTab === 'party' && !a.party) return false;
    if (jobTab === 'walkin' && !a.customer) return false;
    return (
      ((a.party?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.tailor?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (a.itemType || '').toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || a.status === statusFilter) &&
      (!tailorFilter || a.tailor?.name === tailorFilter)
    );
  });

  // Calendar events
  const events = filtered.map((a: any) => ({
    title: `🔧 ${a.notes || 'Alteration'}`,
    start: a.scheduledDateTime,
    allDay: false,
    extendedProps: { job: a },
    id: a.id,
  }));

  function handleEventClick(info: any) {
    setCalendarJob(info.event.extendedProps.job);
    setTimeVal(info.event.extendedProps.job.estimatedTime || 30);
  }

  async function handleStatusChange(job: any, status: string) {
    setStatusUpdating(true);
    try {
      await fetch(`/api/alterations/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      success('Status updated');
      setAlterations(alterations => alterations.map(a => a.id === job.id ? { ...a, status } : a));
      setCalendarJob((j: any) => j && j.id === job.id ? { ...j, status } : j);
    } catch {
      toastError('Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleTimeEdit(job: any, newTime: number) {
    setTimeEditing(true);
    try {
      await fetch(`/api/alterations/${job.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeSpentMinutes: newTime }),
      });
      success('Time updated');
      setAlterations(alterations => alterations.map(a => a.id === job.id ? { ...a, timeSpentMinutes: newTime } : a));
      setCalendarJob((j: any) => j && j.id === job.id ? { ...j, timeSpentMinutes: newTime } : j);
    } catch {
      toastError('Failed to update time');
    } finally {
      setTimeEditing(false);
    }
  }

  // Edit handler
  const handleEditSubmit = async (formData) => {
    setEditLoading(true);
    try {
      const res = await fetch(`/api/alterations/${editJob.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to update');
      success('Alteration updated');
      setAlterations(alterations => alterations.map(a => a.id === editJob.id ? { ...a, ...formData } : a));
      setEditJob(null);
    } catch (err) {
      toastError('Failed to update alteration');
    } finally {
      setEditLoading(false);
    }
  };

  // Create handler
  const handleCreateSubmit = async (formData) => {
    setEditLoading(true);
    try {
      const res = await fetch('/api/alterations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Failed to create');
      const newAlt = await res.json();
      success('Alteration created');
      setAlterations(alterations => [...alterations, newAlt]);
      setCreateOpen(false);
    } catch (err) {
      toastError('Failed to create alteration');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete handler
  const handleDeleteConfirm = async () => {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/alterations/${deleteJob.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete');
      success('Alteration deleted');
      setAlterations(alterations => alterations.filter(a => a.id !== deleteJob.id));
      setDeleteJob(null);
    } catch (err) {
      toastError('Failed to delete alteration');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="w-full max-w-screen-lg mx-auto bg-white text-black dark:bg-gray-dark dark:text-white">
      {/* Tailor Time Tracking */}
      <Card title="Tailor Time Tracking (Today)" className="mb-6 bg-white dark:bg-gray-dark border border-gray-light dark:border-neutral-700">
        {loading ? <Skeleton className="h-24 w-full" /> : (
          Object.keys(tailorTimeToday).length === 0 ? <div className="text-gray-500">No tailor jobs today.</div> :
          <ul className="divide-y">
            {Object.entries(tailorTimeToday).map(([name, { time, jobs, jobList }]) => (
              <li key={name} className="py-2">
                <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                  <span className="font-semibold text-primary">{name}</span>
                  <span className="ml-2 text-xs">{jobs} job{jobs !== 1 ? 's' : ''}</span>
                  <span className="ml-2 text-xs">{time} min</span>
                </div>
                <ul className="ml-4 mt-1 text-xs text-gray-700">
                  {jobList.map(j => (
                    <li key={j.id} className="flex gap-2 items-center">
                      <span>{j.itemType}</span>
                      <span>{j.scheduledDateTime ? new Date(j.scheduledDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      <span>{j.timeSpent ? `${j.timeSpent} min` : ''}</span>
                      <span className={`px-2 py-1 rounded-full ${j.status === 'complete' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : j.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>{j.status}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {/* Tabs for job type */}
      <div className="flex gap-4 mb-6 border-b">
        <button className={`px-4 py-2 font-semibold ${jobTab === 'all' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`} onClick={() => setJobTab('all')}>All</button>
        <button className={`px-4 py-2 font-semibold ${jobTab === 'party' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`} onClick={() => setJobTab('party')}>Party Jobs</button>
        <button className={`px-4 py-2 font-semibold ${jobTab === 'walkin' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`} onClick={() => setJobTab('walkin')}>Walk-In Jobs</button>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-primary flex items-center"><Scissors className="mr-2" />Alterations</h1>
        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search by party, tailor, or item type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-neutral-300 rounded-lg px-4 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="complete">Complete</option>
          </select>
          <select value={tailorFilter} onChange={e => setTailorFilter(e.target.value)} className="border rounded px-2 py-1">
            <option value="">All Tailors</option>
            {tailorOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Button className="ml-2 px-4 py-2" aria-label="Add Alteration" onClick={() => setCreateOpen(true)}>+ Add Alteration</Button>
        </div>
      </div>
      {tab === 'list' && (
        <Card className="p-0 bg-white dark:bg-gray-dark border border-gray-light dark:border-neutral-700">
          {loading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-gray-500">No alterations found.</div>
          ) : (
            <table className="w-full border-t rounded text-black dark:text-white bg-white dark:bg-gray-dark border-gray-light dark:border-neutral-700">
              <thead>
                <tr className="bg-gray-100 dark:bg-neutral-800">
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Party</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Tailor</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Item Type</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-t hover:bg-blue-50 transition">
                    <td className="p-3 font-medium">{a.id}</td>
                    <td className="p-3">{a.party?.name || '—'}</td>
                    <td className="p-3">{a.customer?.name || '—'}</td>
                    <td className="p-3">{a.tailor?.name || '—'}</td>
                    <td className="p-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${a.status === 'complete' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : a.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>{a.status}</span>
                    </td>
                    <td className="p-3">{a.itemType}</td>
                    <td className="p-3">
                      <Button className="px-3 py-1 text-xs bg-yellow-400 text-black mr-2" onClick={() => setEditJob(a)}>Edit</Button>
                      <Button className="px-3 py-1 text-xs bg-red-500 text-white mr-2" onClick={() => setDeleteJob(a)}>Delete</Button>
                      <Button className="px-3 py-1 text-xs bg-blue-500 text-white" onClick={() => setPrintJob(a)}>Print Tag</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      {tab === 'calendar' && (
        <div>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events}
            height="auto"
            eventClick={handleEventClick}
          />
        </div>
      )}
      {/* Tag Print Modal (List) */}
      {printJob && (
        <Modal open={!!printJob} onClose={() => setPrintJob(null)}>
          <div className="p-4">
            <TagPreview job={{
              ...printJob,
              customerName: printJob.party?.customer?.name,
              tailorName: printJob.tailor?.name,
              remarks: printJob.notes,
            }} />
            <div className="flex justify-end mt-4">
              <Button className="px-4 py-2 bg-accent text-black rounded print:hidden" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Calendar Event Modal with Tag Print, Status, and Time Controls */}
      {calendarJob && (
        <Modal open={!!calendarJob} onClose={() => setCalendarJob(null)}>
          <div className="p-4">
            <TagPreview job={{
              ...calendarJob,
              customerName: calendarJob.party?.customer?.name,
              tailorName: calendarJob.tailor?.name,
              remarks: calendarJob.notes,
            }} />
            <div className="flex gap-2 mt-4 items-center">
              <span className="font-semibold">Status:</span>
              {['pending', 'in_progress', 'complete'].map(s => (
                <Button
                  key={s}
                  className={`px-3 py-1 text-xs ${calendarJob.status === s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                  disabled={statusUpdating || calendarJob.status === s}
                  onClick={() => handleStatusChange(calendarJob, s)}
                >
                  {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Button>
              ))}
            </div>
            <div className="flex gap-2 mt-4 items-center">
              <span className="font-semibold">Time Est:</span>
              {timeEditing ? (
                <input
                  type="number"
                  className="w-16 border rounded p-1 text-xs"
                  value={timeVal ?? ''}
                  min={5}
                  max={240}
                  onChange={e => setTimeVal(Number(e.target.value))}
                  onBlur={() => { setTimeEditing(false); if (timeVal !== null) handleTimeEdit(calendarJob, timeVal); }}
                  autoFocus
                />
              ) : (
                <span onClick={() => setTimeEditing(true)} className="cursor-pointer">{calendarJob.estimatedTime || 30} min</span>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <Button className="px-4 py-2 bg-accent text-black rounded print:hidden" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        </Modal>
      )}
      {/* Edit Modal */}
      <AlterationModal
        open={!!editJob}
        onClose={() => setEditJob(null)}
        onSubmit={handleEditSubmit}
        alteration={editJob}
        loading={editLoading}
      />
      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteJob}
        onClose={() => setDeleteJob(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        title="Delete Alteration"
        message="Are you sure you want to delete this alteration? This cannot be undone."
      />
      {/* Create Modal */}
      <AlterationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        alteration={null}
        loading={editLoading}
      />
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