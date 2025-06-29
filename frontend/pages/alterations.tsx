import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Calendar as CalendarIcon, List as ListIcon, Plus, GripVertical, Clock, User, Scissors } from 'lucide-react';
import { useRouter } from 'next/router';
import { useToast } from '@/components/ToastContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US/index.js';
import TagPreview from '@/components/ui/TagPreview';
import { AlterationModal } from '@/components/ui/AlterationModal';
import AlterationJobModal from '@/components/ui/AlterationJobModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

import { Pagination } from '@/components/ui/Pagination';
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
  const router = useRouter();
  const [tab, setTab] = useState<'list' | 'calendar'>('list');
  const { data: jobs = [], error, isLoading, mutate } = useSWR('/api/alterations', fetcher, { refreshInterval: 60_000 });
  
  // Fetch customers and parties for job creation
  const { data: customers = [] } = useSWR('/api/customers', fetcher);
  const { data: parties = [] } = useSWR('/api/parties', fetcher);
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
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [jobTab, setJobTab] = useState<'all' | 'party' | 'walkin'>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Get unique tailors from data
  const tailorOptions: string[] = Array.isArray(jobs.map(j => j.tailor?.name).filter(Boolean)) ? jobs.map(j => j.tailor?.name).filter(Boolean) : [];

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

  const filtered = (Array.isArray(jobs) ? jobs : []).filter(j => {
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

  // Create comprehensive job handler
  const handleCreateJobSubmit = async (jobData) => {
    try {
      const res = await fetch('/api/alterations/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });
      if (!res.ok) throw new Error('Failed to create job');
      success('Alteration job created successfully');
      mutate();
      setCreateJobOpen(false);
    } catch (err) {
      toastError('Failed to create alteration job');
      throw err;
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

  if (isLoading) return <Skeleton className="h-screen w-full" />;
  if (error) return <div>Error loading jobs. Please try again later.</div>;
  if (!Array.isArray(jobs)) {
    return <div>No jobs found or not authorized.</div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* Tailor Time Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Tailor Time Tracking (Today)</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(tailorTimeToday).length === 0 ? (
            <div className="text-gray-500 dark:text-gray-400">No tailor jobs today.</div>
          ) : (
            <div className="space-y-4">
              {Object.entries(tailorTimeToday).map(([name, { time, jobs, jobList }]: [string, any]) => (
                <div key={name} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 pb-4 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                    <span className="font-semibold text-primary dark:text-accent">{name}</span>
                    <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{jobs} job{jobs !== 1 ? 's' : ''}</span>
                      <span>{time.toFixed(2)} hrs</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    {jobList.map(j => (
                      <div key={j.id} className="flex flex-col sm:flex-row sm:items-center gap-1 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="font-medium">{j.itemType}</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {j.scheduledDateTime ? new Date(j.scheduledDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                          j.status === 'complete' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 
                          j.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                        }`}>
                          {j.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Header and Controls - Responsive */}
      <div className="flex flex-col space-y-4">
        {/* Tab Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div role="tablist" className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 w-full sm:w-auto">
            <button 
              role="tab"
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === 'list' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => setTab('list')}
            >
              <ListIcon className="w-4 h-4 mr-2" />
              List View
            </button>
            <button 
              role="tab"
              className={`flex-1 sm:flex-none px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                tab === 'calendar' 
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
              onClick={() => setTab('calendar')}
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Calendar
            </button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setCreateJobOpen(true)}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
            <Button 
              onClick={() => setCreateOpen(true)}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Alteration
            </Button>
            <Button 
              onClick={() => router.push('/tag')}
              variant="outline"
              className="flex-1 sm:flex-none"
            >
              <Scissors className="w-4 h-4 mr-2" />
              Print Tag
            </Button>
          </div>
        </div>

        {/* Filters for List View */}
        {tab === 'list' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              type="text"
              placeholder="Search alterations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="sm:col-span-1"
            />
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)} 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-black dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
            </select>
            <select 
              value={tailorFilter} 
              onChange={e => setTailorFilter(e.target.value)} 
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-black dark:text-white"
            >
              <option value="">All Tailors</option>
              {tailorOptions.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
              {filtered.length} of {jobs.length} alterations
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      {tab === 'list' && (
        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600 dark:text-red-400">
              Failed to load alterations. Please try again.
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500 dark:text-gray-400">
              No alterations found.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Party/Customer
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Item Type
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Tailor
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Due Date
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginated.map(job => (
                      <ExpandableAlterationCard 
                        key={job.id} 
                        job={job} 
                        setPrintJob={setPrintJob}
                        setEditJob={setEditJob}
                        setDeleteJob={setDeleteJob}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginated.map(job => (
                    <div key={job.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                            {job.party?.name || job.customer?.name || 'Walk-in'}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {job.itemType}
                          </p>
                        </div>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                          job.status === 'complete' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : job.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                          {job.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Tailor</p>
                          <p className="text-gray-900 dark:text-gray-100">
                            {job.tailor?.name || 'Unassigned'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400">Due Date</p>
                          <p className="text-gray-900 dark:text-gray-100">
                            {job.dueDate ? new Date(job.dueDate).toLocaleDateString() : 'Not set'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setEditJob(job)}
                          className="flex-1 text-xs"
                        >
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setPrintJob(job)}
                          className="flex-1 text-xs"
                        >
                          Print
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => setDeleteJob(job)}
                          className="flex-1 text-xs text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Pagination */}
          {filtered.length > pageSize && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Pagination
                page={page}
                pageSize={pageSize}
                total={filtered.length}
                onPageChange={setPage}
                className="flex justify-center"
              />
            </div>
          )}
        </Card>
      )}

      {/* Calendar View */}
      {tab === 'calendar' && (
        <Card className="p-4 lg:p-6">
          <div className="h-[600px] lg:h-[700px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              onSelectEvent={handleSelectEvent}
              className="rbc-calendar-responsive"
            />
          </div>
        </Card>
      )}

      {/* Modals */}
      {printJob && (
        <Modal open={!!printJob} onClose={() => setPrintJob(null)}>
          <TagPreview job={printJob} />
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
      <AlterationJobModal open={createJobOpen} onClose={() => setCreateJobOpen(false)} onSubmit={handleCreateJobSubmit} customers={Array.isArray(customers) ? customers : []} parties={parties} />

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
                    {Object.entries(job.measurements).map(([k, v]) => v ? <div key={k}><span className="capitalize text-gray-500">{k.replace(/([A-Z])/g, ' $1')}</span>: <span className="font-mono ml-2">{String(v)}{/in|length|waist|chest|hips|shoulder|overarm|neck|inseam|outseam|collar|sleeve/.test(k) ? '"' : ''}</span></div> : null)}
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