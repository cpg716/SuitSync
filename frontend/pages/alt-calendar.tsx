// frontend/pages/alt-calendar.tsx
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import useSWR from 'swr';
import { Scissors } from 'lucide-react';
import { useState } from 'react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import TagPreview from '../components/ui/TagPreview';

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error('Fetch error');
    return r.json();
  });

export default function AlterationsCalendar() {
  const { data: alts, error } = useSWR('/api/alterations', fetcher);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  if (error) return <div className="text-red-600">Error loading alterations.</div>;
  if (!alts) return <div>Loading…</div>;

  const events = alts.map((a: any) => ({
    title: `🔧 ${a.notes || 'Alteration'}`,
    start: a.scheduledDateTime,
    allDay: false,
    extendedProps: { job: a },
    id: a.id,
  }));

  function handleEventClick(info: any) {
    setSelectedJob(info.event.extendedProps.job);
  }

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
        eventClick={handleEventClick}
      />
      {/* Tag Print Modal */}
      {selectedJob && (
        <Modal open={!!selectedJob} onClose={() => setSelectedJob(null)}>
          <div className="p-4">
            <TagPreview job={{
              ...selectedJob,
              customerName: selectedJob.party?.customer?.name,
              tailorName: selectedJob.tailor?.name,
              remarks: selectedJob.notes,
            }} />
            <div className="flex justify-end mt-4">
              <Button className="px-4 py-2 bg-accent text-black rounded print:hidden" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}