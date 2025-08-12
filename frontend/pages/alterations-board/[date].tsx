import React from 'react';
import { useRouter } from 'next/router';
import useSWR from 'swr';
import { fetcher } from '../../lib/apiClient';
import { Card } from '../../components/ui/Card';

export default function AlterationsDayPage() {
  const router = useRouter();
  const { date } = router.query;
  const { data } = useSWR(date ? `/api/alterations/board/${date}` : null, fetcher as any, { refreshInterval: 60000 });
  const items = (data && (data as any).items) ? (data as any).items : [];

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Alterations for {date}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((p: any) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{p.partName}</div>
              <div className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-800">{p.partType}</div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">Job #{p.job?.jobNumber} • {p.job?.party?.name || 'Party'} • {p.job?.partyMember?.role || ''}</div>
            <div className="text-sm mt-2">Assigned: {p.assignedUser?.name || '—'}</div>
            <div className="text-xs text-gray-500">Status: {p.status}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}


