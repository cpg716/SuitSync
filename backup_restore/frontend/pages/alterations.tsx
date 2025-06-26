import React, { useMemo, useState, useEffect } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Calendar as CalendarIcon, List as ListIcon, Plus, GripVertical, Clock, User, Scissors } from 'lucide-react';
import { useToast } from '../components/ToastContext';
import Skeleton from '../components/ui/Skeleton';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import TagPreview from '../components/ui/TagPreview';
import AlterationModal from '../components/ui/AlterationModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import Pagination from '../components/ui/Pagination';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

const statusCols = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Completed' },
];

export default function AlterationsPage() {
  const [tab, setTab] = useState<'list' | 'calendar'>('list');
  const { data: jobs = [], error, isLoading, mutate } = useSWR('/api/alterations', fetcher, { refreshInterval: 60_000 });
  const [selectedJob, setSelectedJob] = useState(null);
  const [alterations, setAlterations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { success, error: toastError } = useToast();
  const [printJob, setPrintJob] = useState<any | null>(null);
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
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Get unique tailors from data
  const tailorOptions = Array.from(new Set(jobs.map(j => j.tailor?.name).filter(Boolean)));

  // Tailor time tracking for today
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const tailorTimeToday = {};
  jobs.forEach(j => {
    if (j.scheduledDateTime && j.scheduledDateTime.slice(0, 10) === todayStr && j.tailor?.name) {
      if (!tailorTimeToday[j.tailor.name]) {
        tailorTimeToday[j.tailor.name] = { time: 0, jobs: 0, jobList: [] };
      }
      tailorTimeToday[j.tailor.name].time += j.durationMinutes ? j.durationMinutes / 60 : 0;
      tailorTimeToday[j.tailor.name].jobs += 1;
      tailorTimeToday[j.tailor.name].jobList.push(j);
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

  const filtered = jobs.filter(j => {
    if (jobTab === 'party' && !j.party) return false;
    if (jobTab === 'walkin' && !j.customer) return false;
    return (
      ((j.party?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (j.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (j.tailor?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (j.itemType || '').toLowerCase().includes(search.toLowerCase())) &&
      (!statusFilter || j.status === statusFilter) &&
      (!tailorFilter || j.tailor?.name === tailorFilter)
    );
  });

  const paginated = filtered.slice((page-1)*pageSize, page*pageSize);

  const events = useMemo(() => jobs.map(job => ({
    id: job.id,
    title: `${job.partyName || job.party?.name || 'Party'} - ${job.memberName || job.member?.name || ''}`,
    start: new Date(job.dueDate || job.scheduledDateTime || job.createdAt),
    end: new Date(job.dueDate || job.scheduledDateTime || job.createdAt),
    resource: job,
    tailorId: job.tailorId,
  })), [jobs]);

  function handleSelectEvent(event) {
    setSelectedJob(event.resource);
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
      mutate();
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
      mutate();
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
      mutate();
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
      success('Alteration created');
      mutate();
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
      mutate();
      setDeleteJob(null);
    } catch (err) {
      toastError('Failed to delete alteration');
    } finally {
      setDeleteLoading(false);
    }
  };

  AlterationsPage.title = 'Alterations';

  if (!Array.isArray(jobs)) {
    return <div>No jobs found or not authorized.</div>;
  }

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
        <Card className="p-0 bg-white dark:bg-gray-dark border-2 border-gray-400 dark:border-gray-700">
          {loading ? (
            <div className="space-y-4 p-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-3 text-red-600">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-gray-500">No alterations found.</div>
          ) : (
            <table className="w-full border-t-2 rounded text-black dark:text-white bg-white dark:bg-gray-dark border-gray-400 dark:border-gray-700">
              <thead>
                <tr className="bg-gray-100 dark:bg-neutral-800">
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Party</th>
                  <th className="p-2 text-left">Customer</th>
                  <th className="p-2 text-left">Tailor</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2 text-left">Item Type</th>
                  <th className="p-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(a => (
                  <ExpandableAlterationCard key={a.id} job={a} setPrintJob={setPrintJob} />
                ))}
              </tbody>
            </table>
          )}
          <Pagination
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            className="my-4 flex justify-center"
          />
        </Card>
      )}
      {tab === 'calendar' && (
        <div className="bg-white dark:bg-gray-dark rounded-lg shadow p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            onSelectEvent={event => setPrintJob(event.resource)}
          />
        </div>
      )}
      {/* Tag Preview/Print Modal */}
      {printJob && (
        <Modal isOpen={!!printJob} onClose={() => setPrintJob(null)}>
          <div className="flex flex-col items-center">
            <TagPreview job={printJob} />
            <Button className="mt-4 bg-blue-600 text-white" onClick={() => window.print()}>Print Tag</Button>
            <Button className="mt-2" onClick={() => setPrintJob(null)}>Close</Button>
          </div>
        </Modal>
      )}
      {/* Selected Job Modal */}
      {selectedJob && (
        <Modal open={!!selectedJob} onClose={() => setSelectedJob(null)}>
          <div className="p-4">
            <h2 className="font-semibold mb-4">Selected Job</h2>
            <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selectedJob, null, 2)}</pre>
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

function ExpandableAlterationCard({ job, setPrintJob }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="border-t hover:bg-blue-50 transition">
        <td className="p-2 font-medium">{job.id}</td>
        <td className="p-2">{job.party?.name || '—'}</td>
        <td className="p-2">{job.customer?.name || '—'}</td>
        <td className="p-2">{job.tailor?.name || '—'}</td>
        <td className="p-2">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${job.status === 'complete' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : job.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>{job.status}</span>
        </td>
        <td className="p-2">{job.itemType}</td>
        <td className="p-2">
          <Button className="px-3 py-1 text-xs bg-yellow-400 text-black mr-2" onClick={() => setEditJob(job)}>Edit</Button>
          <Button className="px-3 py-1 text-xs bg-red-500 text-white mr-2" onClick={() => setDeleteJob(job)}>Delete</Button>
          <Button className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white mr-2" onClick={() => setPrintJob(job)}>Preview/Print Tag</Button>
          <button className="px-2 py-1 text-xs text-blue-600 underline" onClick={() => setExpanded(e => !e)}>{expanded ? 'Hide Details' : 'Show Details'}</button>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-blue-50 dark:bg-gray-900">
          <td colSpan={7} className="p-3">
            <div className="text-xs space-y-2">
              <div>
                <span className="font-bold">Items to Alter:</span>
                <ul className="list-disc ml-5">
                  {(job.parts || []).map((part, i) => (
                    <li key={i}>
                      <span className="font-semibold">{part.part}:</span> {part.workType || '—'} {part.inches ? `(${part.inches}in)` : ''}
                      {part.notes && <span className="ml-2 italic text-gray-500">{part.notes}</span>}
                    </li>
                  ))}
                </ul>
              </div>
              {job.measurements && (
                <div>
                  <span className="font-bold">Measurements:</span>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                    {Object.entries(job.measurements).map(([k, v]) => (
                      v ? <div key={k}><span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>: <span className="font-mono">{v}{/in|length|waist|chest|hips|shoulder|overarm|neck|inseam|outseam|collar|sleeve/.test(k) ? 'in' : ''}</span></div> : null
                    ))}
                  </div>
                </div>
              )}
              {job.notes && <div><span className="font-bold">Notes:</span> {job.notes}</div>}
              <div className="flex gap-4 mt-2">
                <span><b>Tailor:</b> {job.tailor?.name || '—'}</span>
                <span><b>Status:</b> {job.status}</span>
                <span><b>Time Spent:</b> {job.timeSpentMinutes ? `${job.timeSpentMinutes} min` : '—'}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}