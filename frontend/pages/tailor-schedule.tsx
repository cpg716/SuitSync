import { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import '@fullcalendar/common/main.css';
import '@fullcalendar/timegrid/main.css';

export default function TailorSchedule() {
  const [tailors, setTailors] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedTailor, setSelectedTailor] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => setTailors(data.filter(u => u.role === 'tailor')));
    fetch('/api/alterations').then(r => r.json()).then(data => { setJobs(data); setLoading(false); });
  }, []);

  const events = jobs
    .filter(j => !selectedTailor || j.tailorId === Number(selectedTailor))
    .map(j => ({
      id: j.id,
      title: `${j.itemType} (${j.party?.name || ''})`,
      start: j.scheduledDateTime,
      end: j.scheduledDateTime ? new Date(new Date(j.scheduledDateTime).getTime() + (j.estimatedTime || 30) * 60000) : undefined,
      backgroundColor: '#0055A5',
      borderColor: '#0055A5',
      textColor: '#fff',
      extendedProps: { job: j },
    }));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">Tailor Schedule</h1>
      <div className="mb-4 flex gap-2 items-center">
        <label className="font-semibold">Filter by Tailor:</label>
        <select className="border p-2 rounded" value={selectedTailor} onChange={e => setSelectedTailor(e.target.value)}>
          <option value="">All Tailors</option>
          {tailors.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card p-4">
        {loading ? (
          <div className="animate-pulse h-64 bg-neutral-100 dark:bg-neutral-800 rounded" />
        ) : (
          <FullCalendar
            plugins={[timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'timeGridWeek,timeGridDay',
            }}
            events={events}
            height={600}
            eventDisplay="block"
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