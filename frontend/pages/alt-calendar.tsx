// frontend/pages/alt-calendar.tsx
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import { Scissors } from 'lucide-react';

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false });
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error('Fetch error');
    return r.json();
  });

export default function AlterationsCalendar() {
  const { data: alts, error } = useSWR('/api/alterations', fetcher);

  if (error) return <div className="text-red-600">Error loading alterations.</div>;
  if (!alts) return <div>Loading…</div>;

  const events = alts.map((a: any) => ({
    title: `🔧 ${a.notes || 'Alteration'}`,
    start: a.scheduledDateTime,
    allDay: false,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4 flex items-center">
        <Scissors className="mr-2" /> Alterations Schedule
      </h1>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        height="auto"
      />
    </div>
  );
}