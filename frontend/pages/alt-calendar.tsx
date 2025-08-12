// frontend/pages/alt-calendar.tsx
import React, { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMinutes, isValid } from 'date-fns';
import enUS from 'date-fns/locale/en-US/index.js';
import useSWR from 'swr';
import { fetcher, api } from '../lib/apiClient';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { AlterationModal } from '../components/ui/AlterationModal';
import { useToast } from '../components/ToastContext';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

type CalendarView = 'month' | 'week' | 'day' | 'agenda';
const AVAILABLE_VIEWS: CalendarView[] = ['month', 'week', 'day', 'agenda'];

// View names mapping
const viewNames = {
  month: 'Month',
  week: 'Week',
  day: 'Day',
  agenda: 'Agenda'
};

// Custom event styles for alteration jobs
const eventStyleGetter = (event: any) => {
  let style: React.CSSProperties = {
    backgroundColor: '#805ad5', // Purple for alterations
    borderRadius: '4px',
    opacity: 0.8,
    color: 'white',
    border: 'none',
    display: 'block',
    fontSize: '0.875rem'
  };

  switch (event?.resource?.status) {
    case 'complete':
      style.backgroundColor = '#48bb78';
      break;
    case 'in_progress':
      style.backgroundColor = '#ed8936';
      break;
    case 'pending':
      style.backgroundColor = '#805ad5';
      break;
    case 'canceled':
      style.backgroundColor = '#a0aec0';
      style.textDecoration = 'line-through';
      break;
  }

  // Add a border based on priority
  switch (event?.resource?.priority) {
    case 'high':
      style.borderLeft = '4px solid #e53e3e';
      break;
    case 'medium':
      style.borderLeft = '4px solid #ed8936';
      break;
    case 'low':
      style.borderLeft = '4px solid #48bb78';
      break;
  }

  return { style };
};

// Custom event component
const EventComponent = React.memo(({ event, title }: { event: any; title: string }) => {
  if (!event) return null;
  
  const priorityColors = {
    high: 'bg-red-100 dark:bg-red-900',
    medium: 'bg-yellow-100 dark:bg-yellow-900',
    low: 'bg-green-100 dark:bg-green-900'
  };

  const startTime = format(event.start, 'h:mm a');
  const endTime = format(event.end, 'h:mm a');
  
  return (
    <div className={`truncate px-1 text-sm font-medium ${priorityColors[event.resource?.priority || 'low']}`}>
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

export default function AlterationsCalendarPage() {
  const { data: alterationJobs = [], error, isLoading, mutate } = useSWR('/api/alterations', fetcher, {
    revalidateOnFocus: false,
    onError: (error) => {
      toastError('Failed to load alteration jobs: ' + error.message);
    }
  });
  const [selectedJob, setSelectedJob] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState<CalendarView>('week');
  const [date, setDate] = useState(new Date());
  const { success, error: toastError } = useToast();

  // Transform alteration jobs into calendar events
  const events = useMemo(() => {
    if (!Array.isArray(alterationJobs)) return [];
    
    return alterationJobs.reduce((acc, job) => {
      try {
        // Use scheduled date as start
         const startDate = new Date(job.scheduledDate || job.scheduledDateTime || job.jobParts?.[0]?.scheduledFor || job.dueDate || job.createdAt);
        if (!isValid(startDate)) {
          console.warn('Invalid date for alteration job:', job);
          return acc;
        }

        // Calculate end time based on estimated duration
         const endDate = addMinutes(startDate, job.estimatedMinutes || job.jobParts?.[0]?.estimatedTime || 60);
        if (!isValid(endDate)) {
          console.warn('Invalid end date for alteration job:', job);
          return acc;
        }

        // Format title with party name and garment type
         const title = `${job.party?.name || 'Party'} - ${job.garmentType || job.jobParts?.map((p:any)=>p.partName).join(', ') || 'Alteration'}`;

        acc.push({
          id: String(job.id),
          title,
          start: startDate,
          end: endDate,
          resource: job,
        });
      } catch (err) {
        console.error('Error processing alteration job:', err, job);
      }
      return acc;
    }, []);
  }, [alterationJobs]);

  function handleSelectEvent(event: any) {
    if (event?.resource) {
      setSelectedJob(event.resource);
      setModalOpen(true);
    }
  }

  function handleNavigate(newDate: Date) {
    setDate(newDate);
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <Card className="p-6 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Alteration Jobs</h2>
          <p className="text-gray-600 dark:text-gray-400">{error.message}</p>
          <Button onClick={() => mutate()} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <Card className="p-6">
        <div style={{ height: 600 }}>
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            view={view}
            onView={view => setView(view as CalendarView)}
            date={date}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
              toolbar: CustomToolbar,
            }}
            views={AVAILABLE_VIEWS}
            popup
            showMultiDayTimes
          />
        </div>
      </Card>

      {modalOpen && (
        <AlterationModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          alteration={selectedJob}
          onSubmit={async (data) => {
            try {
              if (selectedJob) {
                await api.put(`/api/alterations/${selectedJob.id}`, data);
                success('Alteration job updated successfully');
              } else {
                await api.post('/api/alterations', data);
                success('Alteration job created successfully');
              }
              mutate();
              setModalOpen(false);
            } catch (err) {
              toastError('Error saving alteration job: ' + err.message);
            }
          }}
        />
      )}
    </div>
  );
}

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