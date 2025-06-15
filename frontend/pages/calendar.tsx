// frontend/pages/calendar.tsx
import { useEffect, useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { toast } from 'react-hot-toast';
import '@fullcalendar/core/index.css';
import '@fullcalendar/daygrid/index.css';
import '@fullcalendar/timegrid/index.css';

export default function AppointmentCalendar() {
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const calendarRef = useRef(null);

  useEffect(() => {
    fetch('/api/appointments')
      .then(res => res.json())
      .then(data => {
        setAppts(data);
        setLoading(false);
      });
  }, []);

  const events = appts.map(appt => ({
    id: appt.id,
    title: `${appt.party?.name || 'Party'}${appt.member ? ' - ' + appt.member.role : ''}`,
    start: appt.dateTime,
    end: appt.endDatetime || undefined,
    backgroundColor: '#0055A5',
    borderColor: '#0055A5',
    textColor: '#fff',
    extendedProps: { appt },
  }));

  const handleEventDrop = async (info) => {
    // Update backend with new date/time
    const newDate = info.event.start;
    await fetch(`/api/appointments/${info.event.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dateTime: newDate })
    });
    toast.success('Appointment rescheduled!');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Appointment Calendar</h1>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card p-4">
        {loading ? (
          <div className="animate-pulse h-64 bg-neutral-100 dark:bg-neutral-800 rounded" />
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay',
            }}
            events={events}
            editable
            droppable={false}
            eventDrop={handleEventDrop}
            eventContent={renderEventContent}
            height={600}
            eventDisplay="block"
            dayMaxEvents={3}
            nowIndicator
            slotMinTime="08:00:00"
            slotMaxTime="20:00:00"
            aspectRatio={1.5}
          />
        )}
      </div>
    </div>
  );
}

function renderEventContent(arg) {
  const appt = arg.event.extendedProps.appt;
  return (
    <div className="flex flex-col">
      <span className="font-semibold text-xs">{arg.event.title}</span>
      <span className="text-xs text-neutral-400">{appt.tailor?.name || ''}</span>
    </div>
  );
}