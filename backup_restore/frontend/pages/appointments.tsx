import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import { useToast } from '../components/ToastContext';
import { AppointmentStatus, AppointmentType } from '../src/types/appointments';
import AppointmentModal from '../components/ui/AppointmentModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { toast } from 'react-hot-toast';
import Pagination from '../components/ui/Pagination';
import useSWR from 'swr';
import { api, fetcher } from '../lib/apiClient';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function AppointmentsPage() {
  const [tab, setTab] = useState<'list' | 'calendar'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { success, error: toastError } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editAppt, setEditAppt] = useState(null);
  const [deleteAppt, setDeleteAppt] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarEditAppt, setCalendarEditAppt] = useState(null);
  const [calendarActionLoading, setCalendarActionLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: appointments = [], error: swrError, isLoading, mutate } = useSWR('/api/appointments', fetcher, { revalidateOnFocus: false });

  // List view logic
  const filtered = appointments.filter(a =>
    (a.party?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.tailor?.name || '').toLowerCase().includes(search.toLowerCase())
  ).filter(a =>
    (!statusFilter || a.status === statusFilter) &&
    (!typeFilter || a.type === typeFilter)
  );
  const paginated = filtered.slice((page-1)*pageSize, page*pageSize);

  // react-big-calendar event mapping
  const events = useMemo(() => appointments.map(appt => ({
    id: appt.id,
    title: `${appt.party?.name || 'Party'}${appt.member ? ' - ' + appt.member.role : ''}`,
    start: new Date(appt.dateTime),
    end: appt.endDatetime ? new Date(appt.endDatetime) : new Date(new Date(appt.dateTime).getTime() + (appt.durationMinutes || 60) * 60000),
    resource: appt,
  })), [appointments]);

  function handleSelectEvent(event) {
    setCalendarEditAppt(event.resource);
    setCalendarModalOpen(true);
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
        <Card className="p-0 bg-white dark:bg-gray-dark border-2 border-gray-400 dark:border-gray-700">
          {isLoading ? (
            <div className="space-y-4 p-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : swrError ? (
            <div className="p-3 text-red-600">{swrError.message}</div>
          ) : filtered.length === 0 ? (
            <div className="p-3 text-gray-500">No appointments found.</div>
          ) : (
            <table className="w-full border-t-2 rounded text-black dark:text-white bg-white dark:bg-gray-dark border-gray-400 dark:border-gray-700">
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
                {paginated.map(a => (
                  <tr key={a.id} className="border-t hover:bg-blue-50 transition">
                    <td className="p-2 font-medium">{a.id}</td>
                    <td className="p-2">{a.party?.name || '—'}</td>
                    <td className="p-2">{a.tailor?.name || '—'}</td>
                    <td className="p-2">{a.dateTime ? new Date(a.dateTime).toLocaleString() : '—'}</td>
                    <td className="p-2">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${a.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' : a.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : a.status === 'canceled' ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200' : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'}`}>{a.status || '—'}</span>
                      <span className={`ml-2 inline-block px-2 py-1 rounded text-xs ${a.type === 'fitting' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : a.type === 'pickup' ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-orange-50 text-orange-700 dark:bg-orange-900 dark:text-orange-200'}`}>{a.type}</span>
                      {a.recurrenceRule && <span className="ml-2 text-xs text-purple-600">Recurring</span>}
                    </td>
                    <td className="p-2">
                      <span className={`inline-block px-2 py-1 text-xs rounded ${a.syncedToLightspeed ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'}`}>{a.syncedToLightspeed ? 'Synced' : 'Sync Error'}</span>
                    </td>
                    <td className="p-2">
                      <Button className="text-xs px-2 py-1" onClick={() => { setEditAppt(a); setModalOpen(true); }}>Edit</Button>
                      <Button className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 ml-2" onClick={() => setDeleteAppt(a)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pagination page={page} pageSize={pageSize} total={filtered.length} onPageChange={setPage} />
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
            onSelectEvent={handleSelectEvent}
          />
        </div>
      )}
      {modalOpen && (
        <AppointmentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          appointment={editAppt}
          onSubmit={async (data) => {
            setActionLoading(true);
            try {
              await api[editAppt ? 'put' : 'post'](
                editAppt ? `/api/appointments/${editAppt.id}` : '/api/appointments',
                data
              );
              success(editAppt ? 'Appointment updated' : 'Appointment created');
              setModalOpen(false);
              mutate();
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
          title="Delete Appointment"
          message="Are you sure you want to delete this appointment?"
          onConfirm={async () => {
            setActionLoading(true);
            try {
              await api.delete(`/api/appointments/${deleteAppt.id}`);
              success('Appointment deleted');
              setDeleteAppt(null);
              mutate();
            } catch (err) {
              toastError(err.message);
            } finally {
              setActionLoading(false);
            }
          }}
          loading={actionLoading}
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
              await api[calendarEditAppt ? 'put' : 'post'](
                calendarEditAppt ? `/api/appointments/${calendarEditAppt.id}` : '/api/appointments',
                data
              );
              success(calendarEditAppt ? 'Appointment updated' : 'Appointment created');
              setCalendarModalOpen(false);
              mutate();
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