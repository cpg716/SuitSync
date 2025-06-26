import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '../components/ToastContext';
import { AppointmentStatus, AppointmentType } from '../src/types/appointments';
import AppointmentModal from '../components/ui/AppointmentModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import { toast } from 'react-hot-toast';
import Pagination from '../components/ui/Pagination';
import useSWR from 'swr';
import { api, fetcher } from '../lib/apiClient';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMinutes, isValid } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

type CalendarView = 'month' | 'week' | 'day' | 'agenda';
const AVAILABLE_VIEWS: CalendarView[] = ['month', 'week', 'day', 'agenda'];

// Custom event styles
const eventStyleGetter = (event: any) => {
  let style: React.CSSProperties = {
    backgroundColor: '#3182ce',
    borderRadius: '4px',
    opacity: 0.8,
    color: 'white',
    border: 'none',
    display: 'block',
    fontSize: '0.875rem'
  };

  if (event?.resource?.status === 'completed') {
    style.backgroundColor = '#48bb78';
  } else if (event?.resource?.status === 'canceled') {
    style.backgroundColor = '#a0aec0';
    style.textDecoration = 'line-through';
  }

  if (event?.resource?.type === 'fitting') {
    style.borderLeft = '4px solid #4299e1';
  } else if (event?.resource?.type === 'pickup') {
    style.borderLeft = '4px solid #48bb78';
  }

  return { style };
};

// Custom event component
const EventComponent = React.memo(({ event, title }: { event: any; title: string }) => {
  if (!event) return null;
  
  const startTime = format(event.start, 'h:mm a');
  const endTime = format(event.end, 'h:mm a');
  
  return (
    <div className="truncate px-1 text-sm font-medium">
      <div className="font-semibold">{String(title || '')}</div>
      <div className="text-xs opacity-75">
        {startTime} - {endTime}
      </div>
    </div>
  );
});

EventComponent.displayName = 'EventComponent';

// Custom toolbar component
const CustomToolbar = React.memo(({ label, onNavigate, onView, view }: any) => {
  const viewNames = {
    month: 'Month',
    week: 'Week',
    day: 'Day',
    agenda: 'Agenda'
  };

  return (
    <div className="rbc-toolbar dark:bg-gray-800">
      <span className="rbc-btn-group">
        <button type="button" onClick={() => onNavigate('PREV')} className="dark:text-white dark:hover:bg-gray-700">Back</button>
        <button type="button" onClick={() => onNavigate('TODAY')} className="dark:text-white dark:hover:bg-gray-700">Today</button>
        <button type="button" onClick={() => onNavigate('NEXT')} className="dark:text-white dark:hover:bg-gray-700">Next</button>
      </span>
      <span className="rbc-toolbar-label dark:text-white">{String(label)}</span>
      <span className="rbc-btn-group">
        {AVAILABLE_VIEWS.map((name) => (
          <button
            key={name}
            type="button"
            className={`dark:text-white dark:hover:bg-gray-700 ${view === name ? 'rbc-active' : ''}`}
            onClick={() => onView(name)}
          >
            {viewNames[name]}
          </button>
        ))}
      </span>
    </div>
  );
});

CustomToolbar.displayName = 'CustomToolbar';

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
  const [view, setView] = useState<CalendarView>('week');
  const [date, setDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: appointments = [], error: swrError, isLoading, mutate } = useSWR('/api/appointments', fetcher, { 
    revalidateOnFocus: false,
    onError: (error) => {
      toastError('Failed to load appointments: ' + error.message);
    }
  });

  // List view logic
  const filtered = appointments.filter(a =>
    (a.party?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.tailor?.name || '').toLowerCase().includes(search.toLowerCase())
  ).filter(a =>
    (!statusFilter || a.status === statusFilter) &&
    (!typeFilter || a.type === typeFilter)
  );

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Enhanced event mapping with validation
  const events = useMemo(() => {
    if (!Array.isArray(appointments)) return [];
    
    return appointments.reduce((acc: any[], appt: any) => {
      try {
        // Validate required date
        const startDate = new Date(appt.dateTime);
        if (!isValid(startDate)) {
          console.warn('Invalid date for appointment:', appt);
          return acc;
        }

        // Calculate end time
        const endDate = appt.endDatetime 
          ? new Date(appt.endDatetime)
          : addMinutes(startDate, appt.durationMinutes || 60);

        if (!isValid(endDate)) {
          console.warn('Invalid end date for appointment:', appt);
          return acc;
        }

        // Safe string conversions
        const partyName = String(appt.party?.name || 'Unnamed Party');
        const memberRole = appt.member ? String(appt.member.role || '') : '';
        const title = memberRole ? `${partyName} - ${memberRole}` : partyName;

        acc.push({
          id: String(appt.id),
          title,
          start: startDate,
          end: endDate,
          resource: appt,
        });
      } catch (err) {
        console.error('Error processing appointment:', err, appt);
      }
      return acc;
    }, []);
  }, [appointments]);

  function handleSelectEvent(event: any) {
    if (event?.resource) {
      setEditAppt(event.resource);
      setModalOpen(true);
    }
  }

  function handleNavigate(newDate: Date) {
    setDate(newDate);
  }

  if (swrError) {
    return (
      <div className="w-full max-w-screen-lg mx-auto p-4">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Appointments</h2>
          <p className="text-gray-600 dark:text-gray-400">{swrError.message}</p>
          <Button onClick={() => mutate()} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-screen-lg mx-auto bg-white dark:bg-gray-900 text-black dark:text-white">
      <div className="flex gap-2 mb-3 border-b border-gray-200 dark:border-gray-700">
        <button 
          className={`px-4 py-2 font-semibold ${tab === 'list' ? 'border-b-2 border-primary text-primary' : 'text-gray-600 dark:text-gray-400'}`} 
          onClick={() => setTab('list')}
        >
          List
        </button>
        <button 
          className={`px-4 py-2 font-semibold ${tab === 'calendar' ? 'border-b-2 border-primary text-primary' : 'text-gray-600 dark:text-gray-400'}`} 
          onClick={() => setTab('calendar')}
        >
          Calendar
        </button>
      </div>

      {tab === 'calendar' && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-4">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-primary">Appointments Calendar</h1>
            <Button 
              className="px-4 py-2" 
              aria-label="Add Appointment" 
              onClick={() => { setEditAppt(null); setModalOpen(true); }}
            >
              + Add Appointment
            </Button>
          </div>
          
          {isLoading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
            </div>
          ) : (
            <div className="calendar-wrapper dark:text-white">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 600 }}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                views={AVAILABLE_VIEWS}
                view={view}
                onView={(newView: CalendarView) => setView(newView)}
                date={date}
                onNavigate={handleNavigate}
                defaultView="week"
                tooltipAccessor={(event: any) => {
                  if (!event || !event.resource) return '';
                  const startTime = format(event.start, 'PPp');
                  const endTime = format(event.end, 'p');
                  const title = String(event.title || '');
                  const status = String(event.resource.status || 'N/A');
                  const type = String(event.resource.type || 'N/A');
                  const notes = event.resource.notes ? `\nNotes: ${String(event.resource.notes)}` : '';
                  
                  return `${title}
                    \nTime: ${startTime} - ${endTime}
                    \nStatus: ${status}
                    \nType: ${type}${notes}`;
                }}
                className="dark:bg-gray-900 dark:text-white"
                components={{
                  event: EventComponent,
                  toolbar: CustomToolbar
                }}
              />
            </div>
          )}
        </div>
      )}

      {tab === 'list' && (
        <>
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
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)} 
                className="border rounded px-2 py-1"
              >
                <option value="">All Statuses</option>
                {Object.values(AppointmentStatus).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select 
                value={typeFilter} 
                onChange={e => setTypeFilter(e.target.value)} 
                className="border rounded px-2 py-1"
              >
                <option value="">All Types</option>
                {Object.values(AppointmentType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Button 
                className="ml-2 px-4 py-2" 
                aria-label="Add Appointment" 
                onClick={() => { setEditAppt(null); setModalOpen(true); }}
              >
                + Add Appointment
              </Button>
            </div>
          </div>

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
              <>
                <table className="w-full border-t-2 rounded text-black dark:text-white bg-white dark:bg-gray-dark border-gray-400 dark:border-gray-700">
                  <thead>
                    <tr className="bg-gray-light dark:bg-gray">
                      <th className="p-2 text-left font-semibold">ID</th>
                      <th className="p-2 text-left font-semibold">Party</th>
                      <th className="p-2 text-left font-semibold">Tailor</th>
                      <th className="p-2 text-left font-semibold">Date/Time</th>
                      <th className="p-2 text-left font-semibold">Status</th>
                      <th className="p-2 text-left font-semibold">Type</th>
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
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            a.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' :
                            a.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                            a.status === 'canceled' ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                          }`}>{a.status || '—'}</span>
                        </td>
                        <td className="p-2">
                          <span className={`inline-block px-2 py-1 rounded text-xs ${
                            a.type === 'fitting' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                            a.type === 'pickup' ? 'bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200' :
                            'bg-orange-50 text-orange-700 dark:bg-orange-900 dark:text-orange-200'
                          }`}>{a.type}</span>
                        </td>
                        <td className="p-2">
                          <Button 
                            className="text-xs px-2 py-1" 
                            onClick={() => { setEditAppt(a); setModalOpen(true); }}
                          >
                            Edit
                          </Button>
                          <Button 
                            className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600 ml-2" 
                            onClick={() => setDeleteAppt(a)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination 
                  page={currentPage} 
                  pageSize={pageSize} 
                  total={filtered.length} 
                  onPageChange={setCurrentPage} 
                />
              </>
            )}
          </Card>
        </>
      )}

      {modalOpen && (
        <AppointmentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          appointment={editAppt}
          onSubmit={async (data) => {
            try {
              if (editAppt) {
                await api.put(`/api/appointments/${editAppt.id}`, data);
                success('Appointment updated successfully');
              } else {
                await api.post('/api/appointments', data);
                success('Appointment created successfully');
              }
              mutate();
              setModalOpen(false);
            } catch (err) {
              toastError('Error saving appointment: ' + err.message);
            }
          }}
        />
      )}

      {deleteAppt && (
        <ConfirmModal
          open={!!deleteAppt}
          onClose={() => setDeleteAppt(null)}
          title="Delete Appointment"
          message="Are you sure you want to delete this appointment? This action cannot be undone."
          onConfirm={async () => {
            try {
              await api.delete(`/api/appointments/${deleteAppt.id}`);
              success('Appointment deleted successfully');
              mutate();
              setDeleteAppt(null);
            } catch (err) {
              toastError('Error deleting appointment: ' + err.message);
            }
          }}
        />
      )}
    </div>
  );
}

AppointmentsPage.title = 'Appointments';

// Add dark mode styles
const darkModeStyles = `
  .rbc-calendar.dark {
    background-color: #1a202c;
    color: white;
  }
  
  .dark .rbc-toolbar button {
    color: white;
  }
  
  .dark .rbc-header {
    background-color: #2d3748;
    color: white;
    border-bottom: 1px solid #4a5568;
  }
  
  .dark .rbc-off-range-bg {
    background-color: #2d3748;
  }
  
  .dark .rbc-today {
    background-color: rgba(66, 153, 225, 0.1);
  }

  .dark .rbc-time-content,
  .dark .rbc-time-header-content {
    background-color: #1a202c;
    border-color: #4a5568;
  }

  .dark .rbc-time-header {
    background-color: #2d3748;
    border-color: #4a5568;
  }

  .dark .rbc-timeslot-group {
    border-color: #4a5568;
  }

  .dark .rbc-time-slot {
    border-color: #4a5568;
  }

  .dark .rbc-day-slot .rbc-time-slot {
    border-color: #4a5568;
  }

  .dark .rbc-time-view {
    border-color: #4a5568;
  }

  .dark .rbc-current-time-indicator {
    background-color: #4299e1;
  }
`;

// Inject dark mode styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = darkModeStyles;
  document.head.appendChild(style);
}