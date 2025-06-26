// frontend/pages/alt-calendar.tsx
import React, { useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import useSWR from 'swr';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function AltCalendarPage() {
  const { data: appointments = [], error, isLoading } = useSWR('/api/appointments');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const events = useMemo(() => appointments.map(appt => ({
    id: appt.id,
    title: `${appt.party?.name || 'Party'}${appt.member ? ' - ' + appt.member.role : ''}`,
    start: new Date(appt.dateTime),
    end: appt.endDatetime ? new Date(appt.endDatetime) : new Date(new Date(appt.dateTime).getTime() + (appt.durationMinutes || 60) * 60000),
    resource: appt,
  })), [appointments]);

  function handleSelectEvent(event) {
    setSelectedEvent(event.resource);
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Alternate Calendar</h1>
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
      {selectedEvent && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <h2 className="font-semibold">Selected Appointment</h2>
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(selectedEvent, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}