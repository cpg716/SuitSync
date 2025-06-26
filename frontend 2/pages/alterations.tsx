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
        toastError('Failed to load alterations');
        setLoading(false);
      });
  }, [toastError]);

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

  if (isLoading) return <Skeleton className="h-screen w-full" />;
  if (error) return <div>Error loading jobs. Please try again later.</div>;
  if (!Array.isArray(jobs)) {
    return <div>No jobs found or not authorized.</div>;
  }

  return (
    <div className="w-full max-w-screen-xl mx-auto p-4 md:p-6">
      {/* Tailor Time Tracking */}
      <Card title="Tailor Time Tracking (Today)" className="mb-6">
        {loading ? <Skeleton className="h-24 w-full" /> : (
          Object.keys(tailorTimeToday).length === 0 ? <div className="text-gray-500">No tailor jobs today.</div> :
          <ul className="divide-y">
            {Object.entries(tailorTimeToday).map(([name, { time, jobs, jobList }]: [string, any]) => (
              <li key={name} className="py-2">
                <div className="flex flex-col md:flex-row md:items-center md:gap-4">
                  <span className="font-semibold text-primary">{name}</span>
                  <span className="ml-2 text-xs">{jobs} job{jobs !== 1 ? 's' : ''}</span>
                  <span className="ml-2 text-xs">{time.toFixed(2)} hrs</span>
                </div>
                <ul className="ml-4 mt-1 text-xs text-gray-500">
                  {jobList.map(j => (
                    <li key={j.id} className="flex gap-2 items-center">
                      <span>{j.itemType}</span>
                      <span>{j.scheduledDateTime ? new Date(j.scheduledDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      <span>{j.timeSpentMinutes ? `${j.timeSpentMinutes} min` : ''}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${j.status === 'complete' ? 'bg-green-100 text-green-700' : j.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{j.status}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
      
      {/* Main Content */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center"><Scissors className="mr-3 text-primary"/>Alterations Queue</h1>
        <div className="flex gap-2 items-center">
          <Button 
            variant={tab === 'list' ? "default" : "outline"}
            onClick={() => setTab('list')}
            className="rounded-full"
          >
            <ListIcon className="mr-2 h-4 w-4"/> List
          </Button>
          <Button 
            variant={tab === 'calendar' ? "default" : "outline"}
            onClick={() => setTab('calendar')}
            className="rounded-full"
          >
            <CalendarIcon className="mr-2 h-4 w-4"/> Calendar
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="ml-auto rounded-full">
            <Plus className="mr-2 h-4 w-4"/> New Job
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <Input
          type="text"
          placeholder="Search by party, tailor, or item type..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="md:col-span-2"
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full p-2 border rounded-md bg-white dark:bg-gray-700">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
        </select>
        <select value={tailorFilter} onChange={e => setTailorFilter(e.target.value)} className="w-full p-2 border rounded-md bg-white dark:bg-gray-700">
          <option value="">All Tailors</option>
          {tailorOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {tab === 'list' && (
        <Card className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-3 text-red-600">{error.message}</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-gray-500">No alterations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800">
                    <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">ID</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Party/Customer</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Tailor</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
                    <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginated.map(a => (
                    <ExpandableAlterationCard 
                      key={a.id} 
                      job={a} 
                      setPrintJob={setPrintJob}
                      setEditJob={setEditJob}
                      setDeleteJob={setDeleteJob}
                    />
                  ))}
                </tbody>
              </table>
            </div>
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
        <Card className="p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 600 }}
            onSelectEvent={handleSelectEvent}
          />
        </Card>
      )}

      {/* Modals */}
      {printJob && (
        <Modal open={!!printJob} onClose={() => setPrintJob(null)}>
          <TagPreview job={printJob} onPrint={() => window.print()} />
        </Modal>
      )}
      {selectedJob && (
        <AlterationModal
          open={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          alteration={selectedJob}
          onSubmit={handleEditSubmit}
          loading={editLoading}
        />
      )}
      <AlterationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        loading={editLoading}
      />
      <ConfirmModal
        open={!!deleteJob}
        onClose={() => setDeleteJob(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        title="Delete Alteration"
        message="Are you sure you want to delete this alteration? This cannot be undone."
      />
    </div>
  );
}

function ExpandableAlterationCard({ job, setPrintJob, setEditJob, setDeleteJob }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
        <td className="p-3 font-medium">{job.id}</td>
        <td className="p-3">{job.party?.name || job.customer?.name || '—'}</td>
        <td className="p-3">{job.tailor?.name || 'Unassigned'}</td>
        <td className="p-3">
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${job.status === 'complete' ? 'bg-green-100 text-green-700' : job.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{job.status}</span>
        </td>
        <td className="p-3">{job.itemType}</td>
        <td className="p-3">{job.dueDate ? format(new Date(job.dueDate), 'MMM d, yyyy') : 'N/A'}</td>
        <td className="p-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditJob(job)}>Edit</Button>
            <Button size="sm" variant="outline" onClick={() => setPrintJob(job)}>Tag</Button>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(e => !e)}>{expanded ? 'Hide' : 'Details'}</Button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 dark:bg-gray-800">
          <td colSpan={7} className="p-4">
            <div className="text-sm space-y-2">
              <div>
                <span className="font-bold">Items to Alter:</span>
                <ul className="list-disc list-inside ml-2">
                  {(job.parts || []).map((part, i) => (
                    <li key={i}>
                      <span className="font-semibold">{part.part}:</span> {part.workType || '—'} {part.inches ? `(${part.inches}in)` : ''}
                      {part.notes && <span className="ml-2 italic text-gray-500"> - "{part.notes}"</span>}
                    </li>
                  ))}
                </ul>
              </div>
              {job.measurements && (
                <div>
                  <span className="font-bold">Measurements:</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1">
                    {Object.entries(job.measurements).map(([k, v]) => (
                      v ? <div key={k}><span className="capitalize text-gray-500">{k.replace(/([A-Z])/g, ' $1')}</span>: <span className="font-mono ml-2">{v}{/in|length|waist|chest|hips|shoulder|overarm|neck|inseam|outseam|collar|sleeve/.test(k) ? '"' : ''}</span></div> : null
                    ))}
                  </div>
                </div>
              )}
              {job.notes && <div><span className="font-bold">Notes:</span> {job.notes}</div>}
              <div className="flex justify-end mt-4">
                <Button size="sm" variant="destructive" onClick={() => setDeleteJob(job)}>Delete Job</Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}