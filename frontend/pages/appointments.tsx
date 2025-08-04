import React, { useState, useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '../components/ToastContext';
import { AppointmentStatus, AppointmentType } from '../src/types/appointments';
import AppointmentModal from '../components/ui/AppointmentModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { toast } from 'react-hot-toast';
import { Pagination } from '../components/ui/Pagination';
import useSWR from 'swr';
import { simpleFetcher } from '../lib/simpleApiClient';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMinutes, isValid } from 'date-fns';
import enUS from 'date-fns/locale/en-US/index.js';
import { useAuth } from '@/src/AuthContext';
import { ListIcon, CalendarIcon, Plus } from 'lucide-react';
import { api } from '@/lib/apiClient';

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
  const { user } = useAuth();

  const { data: appointments = [], error: swrError, isLoading, mutate } = useSWR(
    '/api/customers', 
    simpleFetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshInterval: 5000,
      onError: (error) => {
        toastError('Failed to load appointments: ' + error.message);
      }
    }
  );

  // List view logic
  const filtered = (Array.isArray(appointments) ? appointments : []).filter((a: any) =>
    (a.party?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (a.tailor?.name || '').toLowerCase().includes(search.toLowerCase())
  ).filter((a: any) =>
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

  function handleSelectSlot(slotInfo: any) {
    // Prevent opening modal when clicking on calendar slots
    // This prevents interference with the appointment modal
  }

  function handleNavigate(newDate: Date) {
    setDate(newDate);
  }

  const handleSave = async (data: any) => {
    try {
      if (editAppt) {
        // Update
        await api.put(`/api/appointments/${editAppt.id}`, data);
        success('Appointment updated successfully');
      } else {
        // Create
        await api.post('/api/appointments', data);
        success('Appointment created successfully');
      }
      mutate();
      setEditAppt(null);
      setModalOpen(false);
    } catch (err) {
      toastError('Error saving appointment: ' + err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteAppt) return;
    try {
      await api.delete(`/api/appointments/${deleteAppt.id}`);
      success('Appointment deleted successfully');
      mutate((appointments as any[])?.filter((a: any) => a.id !== deleteAppt.id));
      setDeleteAppt(null);
    } catch (err) {
      toastError('Error deleting appointment: ' + err.message);
    }
  };

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
    <div className="w-full space-y-6">
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
          
          <Button 
            onClick={() => setModalOpen(true)}
            className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>

        {/* Filters for List View */}
        {tab === 'list' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search appointments..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-black dark:text-white"
            />
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-black dark:text-white"
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e: any) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-black dark:text-white"
            >
              <option value="">All Types</option>
              <option value="fitting">Fitting</option>
              <option value="pickup">Pickup</option>
              <option value="consultation">Consultation</option>
            </select>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
              {filtered.length} of {(appointments as any[])?.length || 0} appointments
            </div>
          </div>
        )}
      </div>

      {/* Content Area */}
      {isLoading ? (
        <Card className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </Card>
      ) : swrError ? (
        <Card className="p-6 text-center text-red-600 dark:text-red-400">
          Failed to load appointments. Please try again.
        </Card>
      ) : (
        <>
          {/* List View */}
          {tab === 'list' && (
            <Card className="overflow-hidden">
              {filtered.length === 0 ? (
                <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                  No appointments found.
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Party
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Date & Time
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Type
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Tailor
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginated.map((appt: any) => (
                          <tr key={appt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-medium text-gray-900 dark:text-gray-100">
                                {appt.party?.name || 'Walk-in'}
                              </div>
                              {appt.member && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {appt.member.role}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                              <div>{format(new Date(appt.dateTime), 'MMM d, yyyy')}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {format(new Date(appt.dateTime), 'h:mm a')}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                {appt.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-gray-900 dark:text-gray-100">
                              {appt.tailor?.name || 'Unassigned'}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                appt.status === 'completed' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : appt.status === 'canceled'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              }`}>
                                {appt.status}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => { setEditAppt(appt); setModalOpen(true); }}
                                  className="text-xs"
                                >
                                  Edit
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => setDeleteAppt(appt)}
                                  className="text-xs text-red-600 hover:text-red-700"
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="lg:hidden">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {paginated.map((appt: any) => (
                        <div key={appt.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
                                {appt.party?.name || 'Walk-in'}
                              </h3>
                              {appt.member && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {appt.member.role}
                                </p>
                              )}
                            </div>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ml-2 ${
                              appt.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : appt.status === 'canceled'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {appt.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Date</p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {format(new Date(appt.dateTime), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Time</p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {format(new Date(appt.dateTime), 'h:mm a')}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Type</p>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                {appt.type}
                              </span>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Tailor</p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {appt.tailor?.name || 'Unassigned'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => { setEditAppt(appt); setModalOpen(true); }}
                              className="flex-1 text-xs"
                            >
                              Edit
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => setDeleteAppt(appt)}
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
                    page={currentPage}
                    pageSize={pageSize}
                    total={filtered.length}
                    onPageChange={setCurrentPage}
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
                  onSelectSlot={handleSelectSlot}
                  onNavigate={handleNavigate}
                  onView={view => setView(view as CalendarView)}
                  view={view}
                  views={AVAILABLE_VIEWS}
                  date={date}
                  eventPropGetter={eventStyleGetter}
                  components={{
                    toolbar: CustomToolbar,
                    event: EventComponent,
                  }}
                  className="rbc-calendar-responsive"
                />
              </div>
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      <AppointmentModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditAppt(null);
        }}
        onSubmit={handleSave}
        appointment={editAppt}
        loading={actionLoading}
      />

      <ConfirmModal
        open={!!deleteAppt}
        onClose={() => setDeleteAppt(null)}
        onConfirm={handleDelete}
        loading={actionLoading}
        title="Delete Appointment"
        message="Are you sure you want to delete this appointment? This action cannot be undone."
      />
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