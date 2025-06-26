import React, { useMemo, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import useSWR from 'swr';
import { fetcher } from '../lib/apiClient';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isToday } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { Button } from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Users, Scissors, Timer, ArrowRight, AlertTriangle } from 'lucide-react';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card } from '../components/ui/Card';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const POINT_LIMITS = { 'Jacket': 28, 'Shirt': 28, 'Pants': 24 };

function getJobType(job) {
  // Example: job.type or job.itemType, fallback to 'Jacket'
  return job.type || job.itemType || 'Jacket';
}

function getTailorCapacity(jobs, tailorId) {
  // Sum points for today for this tailor
  const today = new Date();
  const jobsToday = jobs.filter(j => j.tailorId === tailorId && isToday(new Date(j.dueDate)));
  let points = 0;
  for (const job of jobsToday) {
    points += job.points || 0;
  }
  return points;
}

function CapacityBar({ jobs, tailor, limit }) {
  const points = getTailorCapacity(jobs, tailor.id);
  const over = points > limit;
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded mb-1">
      <div
        className={`h-2 rounded ${over ? 'bg-red-500' : 'bg-green-500'}`}
        style={{ width: `${Math.min(100, (points/limit)*100)}%` }}
      />
    </div>
  );
}

function TimeTrackingModal({ open, onClose, job, onSave }) {
  const [timeSpent, setTimeSpent] = useState(job?.timeSpentMinutes || 0);
  const [notes, setNotes] = useState(job?.notes || '');
  return (
    <Modal isOpen={open} onClose={onClose}>
      <div className="w-full max-w-md">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2"><Timer className="w-5 h-5" /> Log Time for {job?.partyName}</h2>
        <div className="mb-2">Member: <span className="font-semibold">{job?.memberName}</span></div>
        <input
          type="number"
          className="border rounded p-2 w-full mb-2"
          placeholder="Time Spent (minutes)"
          value={timeSpent}
          onChange={e => setTimeSpent(Number(e.target.value))}
        />
        <textarea
          className="border rounded p-2 w-full mb-2"
          placeholder="Notes"
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <Button className="bg-gray-300 text-black dark:bg-gray-800 dark:text-gray-100" onClick={onClose}>Cancel</Button>
          <Button className="bg-primary text-white" onClick={() => onSave({ timeSpentMinutes: timeSpent, notes })}>Save</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function TailorSchedulePage() {
  const { data: jobs = [], mutate } = useSWR('/api/alterations', fetcher, { refreshInterval: 60_000 });
  const { data: tailors = [] } = useSWR('/api/users?role=tailor', fetcher, { credentials: 'include' });
  const [selectedJob, setSelectedJob] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);

  // Map jobs to calendar events
  const events = useMemo(() => jobs.map(job => ({
    id: job.id,
    title: `${job.partyName || job.party?.name || 'Party'} - ${job.memberName || job.member?.name || ''}`,
    start: new Date(job.dueDate || job.scheduledDateTime || job.createdAt),
    end: new Date(job.dueDate || job.scheduledDateTime || job.createdAt),
    resource: job,
    tailorId: job.tailorId,
  })), [jobs]);

  // Custom resource accessors for tailor rows
  const resources = tailors.map(t => ({ resourceId: t.id, resourceTitle: t.name }));

  // Drag-and-drop assignment
  const onEventDrop = useCallback(async ({ event, resourceId }) => {
    await fetch(`/api/alterations/${event.id}/assign?tailorId=${resourceId}`, { method: 'PUT' });
    mutate();
  }, [mutate]);

  // Event click: open time tracking modal
  const onSelectEvent = useCallback((event) => {
    setSelectedJob(event.resource);
    setShowTimeModal(true);
  }, []);

  // Save time tracking
  const handleSaveTime = async ({ timeSpentMinutes, notes }) => {
    await fetch(`/api/alterations/${selectedJob.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timeSpentMinutes, notes })
    });
    setShowTimeModal(false);
    setSelectedJob(null);
    mutate();
  };

  // Only show today's jobs
  const today = new Date();
  const start = new Date(today.setHours(0,0,0,0));
  const end = new Date(today.setHours(23,59,59,999));
  const eventsToday = events.filter(e => e.start >= start && e.end <= end);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {tailors.map(tailor => (
              <div key={tailor.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex items-center gap-2 mb-2"><Users className="w-4 h-4" /> <span className="font-semibold">{tailor.name}</span></div>
                <CapacityBar jobs={jobs} tailor={tailor} limit={POINT_LIMITS['Jacket']} />
                <div className="text-xs text-gray-500">Capacity: {getTailorCapacity(jobs, tailor.id)} / {POINT_LIMITS['Jacket']} pts</div>
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
            <Calendar
              localizer={localizer}
              events={eventsToday}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 600 }}
              resources={resources}
              resourceIdAccessor="resourceId"
              resourceTitleAccessor="resourceTitle"
              defaultView={Views.DAY}
              views={{ day: true }}
              onSelectEvent={onSelectEvent}
              draggableAccessor={() => true}
              onEventDrop={onEventDrop}
              resizable={false}
            />
          </div>
          {showTimeModal && selectedJob && (
            <TimeTrackingModal
              open={showTimeModal}
              onClose={() => { setShowTimeModal(false); setSelectedJob(null); }}
              job={selectedJob}
              onSave={handleSaveTime}
            />
          )}
        </Card>
      </div>
    </Layout>
  );
} 