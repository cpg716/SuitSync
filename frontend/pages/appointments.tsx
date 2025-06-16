import { useEffect, useState, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../components/ToastContext';
import { AppointmentStatus, AppointmentType } from '../src/types/appointments';
import AppointmentModal from '../components/ui/AppointmentModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { toast } from 'react-hot-toast';

export default function AppointmentsPage() {
  const [tab, setTab] = useState<'list' | 'calendar'>('list');
  // List state
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { success, error: toastError } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editAppt, setEditAppt] = useState(null);
  const [deleteAppt, setDeleteAppt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  // Calendar state
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarAppts, setCalendarAppts] = useState<any[]>([]);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarEditAppt, setCalendarEditAppt] = useState(null);
  const [calendarActionLoading, setCalendarActionLoading] = useState(false);
  const calendarRef = useRef(null);

  // Fetch for list
  useEffect(() => {
    if (tab === 'list') {
      setLoading(true);
      fetch('http://localhost:3000/api/appointments', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setAppointments(data);
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to load appointments');
          setLoading(false);
        });
    }
  }, [tab]);

  // Fetch for calendar
  useEffect(() => {
    if (tab === 'calendar') {
      setCalendarLoading(true);
      fetch('http://localhost:3000/api/appointments', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          setCalendarAppts(data);
          setCalendarLoading(false);
        });
    }
  }, [tab]);

  // List view logic
  const filtered = appointments.filter(a =>
    (a.party?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.tailor?.name || '').toLowerCase().includes(search.toLowerCase())
  ).filter(a =>
    (!statusFilter || a.status === statusFilter) &&
    (!typeFilter || a.type === typeFilter)
  );

  // Calendar logic
  const events = calendarAppts.map(appt => ({
    id: appt.id,
    title: `${appt.party?.name || 'Party'}${appt.member ? ' - ' + appt.member.role : ''}`,
    start: appt.dateTime,
    end: appt.endDatetime || undefined,
    backgroundColor: getEventColor(appt),
    borderColor: getEventColor(appt),
    textColor: '#fff',
    extendedProps: { appt },
  }));
  function getEventColor(appt) {
    if (!appt.syncedToLightspeed) return '#dc2626';
    if (appt.status === 'completed') return '#22c55e';
    if (appt.status === 'canceled') return '#6b7280';
    if (appt.type === 'fitting') return '#2563eb';
    if (appt.type === 'pickup') return '#16a34a';
    if (appt.type === 'final_try') return '#f59e42';
    return '#0055A5';
  }
  const handleEventDrop = async (info) => {
    const newDate = info.event.start;
    await fetch(`http://localhost:3000/api/appointments/${info.event.id}`, {
      credentials: 'include',
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateTime: newDate })
    });
    toast.success('Appointment rescheduled!');
    setCalendarLoading(true);
    fetch('http://localhost:3000/api/appointments', { credentials: 'include' }).then(res => res.json()).then(setCalendarAppts).finally(() => setCalendarLoading(false));
  };
  const handleEventClick = (info) => {
    setCalendarEditAppt(info.event.extendedProps.appt);
    setCalendarModalOpen(true);
  };
  function renderEventContent(arg) {
    const appt = arg.event.extendedProps.appt;
    return (
      <div className="flex flex-col">
        <span className="font-semibold text-xs">{arg.event.title}</span>
        <span className="text-xs text-neutral-400">{appt.tailor?.name || ''}</span>
        <span className={`text-xs ${appt.syncedToLightspeed ? 'text-green-600' : 'text-red-600'}`}>{appt.syncedToLightspeed ? 'Synced' : 'Sync Error'}</span>
      </div>
    );
  }
  // Print handler
  function handlePrint() {
    window.print();
  }

  return (
    <div className="w-full max-w-screen-lg mx-auto bg-white text-black dark:bg-gray-dark dark:text-white">
      <div className="flex gap-2 mb-3 border-b border-gray-light dark:border-gray">
        <button className={`px-4 py-2 font-semibold ${tab === 'list' ? 'border-b-2 border-primary text-primary' : 'text-gray'}`} onClick={() => setTab('list')}>List</button>
        <button className={`px-4 py-2 font-semibold ${tab === 'calendar' ? 'border-b-2 border-primary text-primary' : 'text-gray'}`} onClick={() => setTab('calendar')}>Calendar</button>
      </div>
      {tab === 'list' && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-primary">Appointments</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="Search by party or tailor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="border border-neutral-300 rounded-lg px-4 py-2 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded px-2 py-1">
              <option value="">All Statuses</option>
              {(Object.values(AppointmentStatus) as string[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border rounded px-2 py-1">
              <option value="">All Types</option>
              {(Object.values(AppointmentType) as string[]).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Button className="ml-2 px-4 py-2" aria-label="Add Appointment" onClick={() => { setEditAppt(null); setModalOpen(true); }}>+ Add Appointment</Button>
          </div>
        </div>
      )}
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
            <div className="p-6 text-gray-500">No appointments found.</div>
          ) : (
            <table className="w-full border-t rounded text-black dark:text-white bg-white dark:bg-gray-dark border-gray-light dark:border-neutral-700">
              <thead>
                <tr className="bg-gray-light dark:bg-gray">
                  <th className="p-2 text-left font-semibold">ID</th>
                  <th className="p-2 text-left font-semibold">Party</th>
                  <th className="p-2 text-left font-semibold">Tailor</th>
                  <th className="p-2 text-left font-semibold">Date/Time</th>
                  <th className="p-2 text-left font-semibold">Status</th>
                  <th className="p-2 text-left font-semibold">Type</th>
                  <th className="p-2 text-left font-semibold">Sync Status</th>
                  <th className="p-2 text-left font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="border-t hover:bg-blue-50 transition">
                    <td className="p-3 font-medium">{a.id}</td>
                    <td className="p-3">{a.party?.name || '—'}</td>
                    <td className="p-3">{a.tailor?.name || '—'}</td>
                    <td className="p-3">{a.dateTime ? new Date(a.dateTime).toLocaleString() : '—'}</td>
                    <td className="p-3">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${a.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' : a.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : a.status === 'canceled' ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'}`}>
                        {a.status || '—'}
                      </span>
                      <span className={`ml-2 inline-block px-2 py-1 rounded text-xs ${a.type === 'fitting' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : a.type === 'pickup' ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-orange-50 text-orange-700 dark:bg-orange-900 dark:text-orange-200'}`}>
                        {a.type}
                      </span>
                      {a.recurrenceRule && <span className="ml-2 text-xs text-purple-600">Recurring</span>}
                    </td>
                    <td className="p-3">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${a.syncedToLightspeed ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>
                        {a.syncedToLightspeed ? 'Synced' : 'Sync Error'}
                      </span>
                    </td>
                    <td className="p-3">
                      <Button className="px-3 py-1 text-xs bg-yellow-400 text-black mr-2" onClick={() => { setEditAppt(a); setModalOpen(true); }}>Edit</Button>
                      <Button className="px-3 py-1 text-xs bg-red-500 text-white" onClick={() => setDeleteAppt(a)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
      {tab === 'calendar' && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-primary">Calendar</h1>
          <div className="flex gap-2 w-full md:w-auto">
            <Button className="ml-2 px-4 py-2" aria-label="Add Appointment" onClick={() => { setCalendarEditAppt(null); setCalendarModalOpen(true); }}>+ Add Appointment</Button>
            <Button className="ml-2 px-4 py-2" aria-label="Print Calendar" onClick={handlePrint}>Print</Button>
          </div>
        </div>
      )}
      {tab === 'calendar' && (
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventDrop={handleEventDrop}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
          loading={(isLoading) => setCalendarLoading(isLoading)}
        />
      )}
      {modalOpen && (
        <AppointmentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          appointment={editAppt}
          onSubmit={async (data) => {
            setActionLoading(true);
            try {
              const res = await fetch(editAppt
                ? `http://localhost:3000/api/appointments/${editAppt.id}`
                : 'http://localhost:3000/api/appointments', {
                credentials: 'include',
                method: editAppt ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error((await res.json()).error || 'Failed');
              success(editAppt ? 'Appointment updated' : 'Appointment created');
              setModalOpen(false);
              // reload list
              setLoading(true);
              fetch('http://localhost:3000/api/appointments', { credentials: 'include' }).then(res => res.json()).then(setAppointments).finally(() => setLoading(false));
            } catch (err) {
              toastError(err.message);
            } finally {
              setActionLoading(false);
            }
          }}
          loading={actionLoading}
        />
      )}
      {deleteAppt && (
        <ConfirmModal
          open={!!deleteAppt}
          onClose={() => setDeleteAppt(null)}
          onConfirm={async () => {
            setActionLoading(true);
            try {
              const res = await fetch(`http://localhost:3000/api/appointments/${deleteAppt.id}`, {
                credentials: 'include',
                method: 'DELETE'
              });
              if (!res.ok) throw new Error((await res.json()).error || 'Failed');
              success('Appointment deleted');
              setDeleteAppt(null);
              setLoading(true);
              fetch('http://localhost:3000/api/appointments', { credentials: 'include' }).then(res => res.json()).then(setAppointments).finally(() => setLoading(false));
            } catch (err) {
              toastError(err.message);
            } finally {
              setActionLoading(false);
            }
          }}
          loading={actionLoading}
          title="Delete Appointment"
          message="Are you sure you want to delete this appointment? This cannot be undone."
        />
      )}
      {calendarModalOpen && (
        <AppointmentModal
          open={calendarModalOpen}
          onClose={() => setCalendarModalOpen(false)}
          appointment={calendarEditAppt}
          onSubmit={async (data) => {
            setCalendarActionLoading(true);
            try {
              const res = await fetch(calendarEditAppt
                ? `http://localhost:3000/api/appointments/${calendarEditAppt.id}`
                : 'http://localhost:3000/api/appointments', {
                credentials: 'include',
                method: calendarEditAppt ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
              });
              if (!res.ok) throw new Error((await res.json()).error || 'Failed');
              success(calendarEditAppt ? 'Appointment updated' : 'Appointment created');
              setCalendarModalOpen(false);
              // reload list
              setCalendarLoading(true);
              fetch('http://localhost:3000/api/appointments', { credentials: 'include' }).then(res => res.json()).then(setCalendarAppts).finally(() => setCalendarLoading(false));
            } catch (err) {
              toastError(err.message);
            } finally {
              setCalendarActionLoading(false);
            }
          }}
          loading={calendarActionLoading}
        />
      )}
    </div>
  );
}

AppointmentsPage.title = 'Appointments';