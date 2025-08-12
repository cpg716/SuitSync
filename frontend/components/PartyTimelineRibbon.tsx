import React from 'react';
import { format } from 'date-fns';

type Stage = {
  key: string;
  label: string;
  date?: string | Date | null;
  status: 'past' | 'today' | 'upcoming' | 'missing';
  tooltip?: string;
};

interface Props {
  eventDate?: string | Date | null;
  firstFittingDate?: string | Date | null;
  alterationsFittingDate?: string | Date | null;
  pickupDate?: string | Date | null;
  dueDate?: string | Date | null;
}

function statusFor(date?: string | Date | null): Stage['status'] {
  if (!date) return 'missing';
  const d = new Date(date);
  const today = new Date();
  const dYMD = d.toISOString().slice(0,10);
  const tYMD = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())).toISOString().slice(0,10);
  if (dYMD === tYMD) return 'today';
  return d < today ? 'past' : 'upcoming';
}

export default function PartyTimelineRibbon(props: Props) {
  const stages: Stage[] = [
    { key: 'first', label: 'First Fitting', date: props.firstFittingDate, status: statusFor(props.firstFittingDate) },
    { key: 'alt', label: 'Alterations Fitting', date: props.alterationsFittingDate, status: statusFor(props.alterationsFittingDate) },
    { key: 'due', label: 'Alterations Due', date: props.dueDate, status: statusFor(props.dueDate), tooltip: 'Target completion 2–3 days before event' },
    { key: 'pickup', label: 'Pickup', date: props.pickupDate, status: statusFor(props.pickupDate) },
    { key: 'event', label: 'Event', date: props.eventDate, status: statusFor(props.eventDate) },
  ];

  const badgeStyles = (s: Stage['status']) =>
    s === 'past' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
    : s === 'today' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
    : s === 'upcoming' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200';

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex gap-3 items-center">
        {stages.map((s, idx) => (
          <div key={s.key} className="flex items-center gap-2 whitespace-nowrap">
            <div className={`px-3 py-1 rounded-full text-xs ${badgeStyles(s.status)}`} title={s.tooltip || ''}>
              <span className="font-medium">{s.label}</span>
              <span className="ml-2 opacity-80">{s.date ? format(new Date(s.date), 'MMM d') : '—'}</span>
            </div>
            {idx < stages.length - 1 && <div className="h-px w-10 bg-gray-300 dark:bg-gray-700" />}
          </div>
        ))}
      </div>
    </div>
  );
}


