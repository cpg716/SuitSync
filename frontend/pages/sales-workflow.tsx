import React, { useMemo, useState } from 'react';
import Layout from '../components/Layout';
import useSWR from 'swr';
import { fetcher } from '../lib/apiClient';
import { format, addMonths, differenceInMonths, differenceInDays, isBefore, isAfter, addDays } from 'date-fns';
import type { Party } from '../src/types/parties';
import { Button } from '../components/ui/Button';
import { CalendarClock, Users, PartyPopper, Ruler, Shirt, ArrowRight, Bell } from 'lucide-react';
import { Modal } from '../components/ui/Modal';

// Helper: phase calculation
const PHASES = [
  { name: 'Suit Selection', color: 'bg-blue-500', monthsFrom: 6, monthsTo: 3 },
  { name: 'Measurements', color: 'bg-green-500', monthsFrom: 3, monthsTo: 1 },
  { name: 'Alteration Fitting', color: 'bg-yellow-400', monthsFrom: 1, monthsTo: 0.25 },
  { name: 'Pick-Up Reminder', color: 'bg-orange-400', monthsFrom: 0.25, monthsTo: 0 },
];

function getPhase(eventDate: Date, now: Date) {
  const months = differenceInMonths(eventDate, now) + (differenceInDays(eventDate, now) % 30) / 30;
  for (const [i, phase] of PHASES.entries()) {
    if (months <= phase.monthsFrom && months > phase.monthsTo) return i;
  }
  return PHASES.length - 1;
}

function getNextAction(parties: Party[], now: Date) {
  let soonest = null;
  let soonestMsg = '';
  for (const party of parties) {
    const eventDate = new Date(party.eventDate);
    const months = differenceInMonths(eventDate, now) + (differenceInDays(eventDate, now) % 30) / 30;
    for (const phase of PHASES) {
      if (months <= phase.monthsFrom && months > phase.monthsTo) {
        const phaseStart = addMonths(eventDate, -phase.monthsFrom);
        const daysUntil = differenceInDays(phaseStart, now);
        if (soonest === null || daysUntil < soonest) {
          soonest = daysUntil;
          soonestMsg = `Next: ${phase.name} for ${party.name} in ${daysUntil} days`;
        }
      }
    }
  }
  return soonestMsg || 'No upcoming actions';
}

function ProgressBar({ phase }: { phase: number }) {
  return (
    <div className="flex w-full h-3 rounded overflow-hidden mt-2">
      {PHASES.map((p, i) => (
        <div
          key={p.name}
          className={`${p.color} ${i <= phase ? '' : 'bg-gray-200 dark:bg-gray-700'} flex-1 transition-all`}
        />
      ))}
    </div>
  );
}

function PartyDetailModal({ open, onClose, party }: any) {
  if (!party) return null;
  const members = party.members || [];
  const completedPhases = getPhase(new Date(party.eventDate), new Date());
  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2"><Users className="w-5 h-5" /> {party.name}</h2>
        <div className="mb-2 text-gray-600 dark:text-gray-300 flex items-center gap-2"><PartyPopper className="w-4 h-4" /> Event: {format(new Date(party.eventDate), 'PPP')}</div>
        <ProgressBar phase={completedPhases} />
        <div className="mt-4">
          <h3 className="font-semibold mb-1">Members</h3>
          <ul className="space-y-1">
            {members.map((m: any) => (
              <li key={m.id} className="flex justify-between items-center border-b py-1">
                <span>{m.name} <span className="text-xs text-gray-400">({m.role})</span></span>
                <span className="text-xs text-gray-500">{m.measurements || '—'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm">{Math.round(((completedPhases+1)/PHASES.length)*100)}% Complete</span>
          <div className="flex-1" />
        </div>
      </div>
    </Modal>
  );
}

export default function SalesWorkflowPage() {
  const { data: parties = [], error } = useSWR('/api/parties?status=active', fetcher, { refreshInterval: 60_000 });
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const now = new Date();

  // Timeline range: today to max eventDate
  const minDate = now;
  const safeParties = Array.isArray(parties) ? parties : [];
  const maxDate = safeParties.length ? new Date(Math.max(...safeParties.map((p: any) => new Date(p.eventDate).getTime()))) : addMonths(now, 6);
  const daysSpan = differenceInDays(maxDate, minDate) || 1;

  // Position cards by eventDate
  function getCardPosition(eventDate: string) {
    const daysFromStart = differenceInDays(new Date(eventDate), minDate);
    return `${(daysFromStart/daysSpan)*100}%`;
  }

  return (
    <Layout title="Sales Workflow">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="mb-6 flex items-center gap-4 p-4 bg-primary-light dark:bg-gray-800 rounded-lg">
          <ArrowRight className="w-5 h-5 text-primary" />
          <span className="font-medium text-lg">{getNextAction(safeParties, now)}</span>
        </div>
        <div className="relative w-full h-56 bg-gray-100 dark:bg-gray-900 rounded-lg overflow-x-auto border border-gray-300 dark:border-gray-700">
          {/* Timeline axis */}
          <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-300 dark:bg-gray-700" style={{ zIndex: 1 }} />
          {/* Cards */}
          {safeParties.map((party: any) => {
            const left = getCardPosition(party.eventDate);
            const phase = getPhase(new Date(party.eventDate), now);
            return (
              <div
                key={party.id}
                className="absolute top-8" style={{ left, zIndex: 2, minWidth: '220px', maxWidth: '260px' }}
              >
                <div
                  className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 border border-primary cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => setSelectedParty(party)}
                >
                  <div className="font-bold text-lg flex items-center gap-2"><Users className="w-4 h-4" /> {party.name}</div>
                  <div className="text-xs text-gray-500 mb-1 flex items-center gap-1"><PartyPopper className="w-3 h-3" /> {format(new Date(party.eventDate), 'PPP')}</div>
                  <ProgressBar phase={phase} />
                </div>
              </div>
            );
          })}
        </div>
        {/* Reminder button */}
        <div className="mt-8 flex gap-2 items-center">
          <Button
            className="bg-orange-500 text-white flex items-center gap-1"
            onClick={async () => {
              if (!selectedParty) return;
              await fetch(`/api/notifications/reminder?partyId=${selectedParty.id}`, { method: 'POST' });
            }}
            disabled={!selectedParty}
          >
            <Bell className="w-4 h-4" /> Send Reminder
          </Button>
        </div>
        {/* Party Detail Modal */}
        <PartyDetailModal open={!!selectedParty} onClose={() => setSelectedParty(null)} party={selectedParty} />
      </div>
    </Layout>
  );
} 