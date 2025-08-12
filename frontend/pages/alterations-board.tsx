import React from 'react';
import useSWR from 'swr';
import { fetcher } from '../lib/apiClient';
import { Card } from '../components/ui/Card';

function DayCard({ day }: { day: any }) {
  return (
    <Card className="p-4 hover:shadow-md transition cursor-pointer" onClick={() => {
      const d = new Date(day.date).toISOString().slice(0,10);
      window.location.href = `/alterations-board/${d}`;
    }}>
      <div className="flex items-center justify-between">
        <div className="font-semibold">{new Date(day.date).toLocaleDateString()}</div>
        {day.isThursday && <span className="text-xs px-2 py-1 rounded bg-amber-100 text-amber-800">Thursday</span>}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Jackets</div>
          <div>{day.assignedJackets}/{day.jacketCapacity} <span className="text-gray-400">({day.jacketsLeft} left)</span></div>
        </div>
        <div>
          <div className="text-gray-500">Pants</div>
          <div>{day.assignedPants}/{day.pantsCapacity} <span className="text-gray-400">({day.pantsLeft} left)</span></div>
        </div>
      </div>
      {day.isThursday && <div className="mt-2 text-xs text-amber-700">Only last-minute items allowed.</div>}
      {day.notes && <div className="mt-2 text-xs text-gray-600">{day.notes}</div>}
    </Card>
  );
}

export default function AlterationsBoardPage() {
  const { data } = useSWR('/api/alterations/board?days=21', fetcher as any, { refreshInterval: 60000 });
  const days = (data && (data as any).days) ? (data as any).days : [];

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Alterations Daily Board</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {days.map((d: any) => <DayCard key={d.date} day={d} />)}
      </div>
    </div>
  );
}


