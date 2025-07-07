import React, { useState } from 'react';
import useSWR from 'swr';
import { getLightspeedHealth, triggerSync } from '@/lib/apiClient';
import { useAuth } from '@/src/AuthContext';
import { Button } from './ui/Button';
import { ArrowsClockwise, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react';
import { useToast } from './ToastContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import { Modal } from './ui/Modal';

export function UnifiedSyncStatus() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [syncingResource, setSyncingResource] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const shouldFetch = user && user.role === 'admin';
  const { data, error, mutate } = useSWR(
    shouldFetch ? '/api/lightspeed/health' : null,
    getLightspeedHealth,
    {
      refreshInterval: 10000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const syncStatuses = data?.syncStatuses || [];
  const anyFailed = syncStatuses.some(s => s.status === 'FAILED');
  const anySyncing = syncStatuses.some(s => s.status === 'SYNCING');
  const allSuccess = syncStatuses.length > 0 && syncStatuses.every(s => s.status === 'SUCCESS');

  let summaryIcon, summaryColor, summaryText;
  if (anyFailed) {
    summaryIcon = <WarningCircle size={20} className="text-red-500" />;
    summaryColor = 'text-red-600 dark:text-red-400';
    summaryText = 'Sync Issue';
  } else if (anySyncing) {
    summaryIcon = <ArrowsClockwise size={20} className="text-blue-500 animate-spin" />;
    summaryColor = 'text-blue-600 dark:text-blue-400';
    summaryText = 'Syncing...';
  } else if (allSuccess) {
    summaryIcon = <CheckCircle size={20} className="text-green-500" />;
    summaryColor = 'text-green-600 dark:text-green-400';
    summaryText = 'Synced';
  } else {
    summaryIcon = <Info size={20} className="text-gray-500" />;
    summaryColor = 'text-gray-600 dark:text-gray-400';
    summaryText = 'Idle';
  }

  const handleSync = async (resource: string) => {
    setSyncingResource(resource);
    setSyncError(null);
    try {
      await triggerSync(resource);
      toastSuccess(`${resource.charAt(0).toUpperCase() + resource.slice(1)} sync started`);
      mutate();
    } catch (err: any) {
      setSyncError(err?.response?.data?.message || 'Failed to start sync');
      toastError(err?.response?.data?.message || 'Failed to start sync');
    } finally {
      setSyncingResource(null);
    }
  };

  if (!shouldFetch) return null;
  if (error) {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
        <WarningCircle size={20} />
        <span className="text-sm font-medium">Sync Error</span>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <ArrowsClockwise size={20} className="animate-spin" />
        <span className="text-sm font-medium">Checking...</span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="sm" className={`flex items-center gap-2 ${summaryColor}`} aria-label="Sync Status">
            {summaryIcon}
            <span className="text-sm font-medium">{summaryText}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="min-w-[260px]">
          <div className="font-semibold mb-2">Sync Status Details</div>
          <table className="w-full text-xs mb-2">
            <thead>
              <tr>
                <th className="text-left font-medium">Resource</th>
                <th className="text-left font-medium">Status</th>
                <th className="text-left font-medium">Last Sync</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {syncStatuses.map(s => (
                <tr key={s.resource}>
                  <td className="pr-2 capitalize">{s.resource}</td>
                  <td className="pr-2">
                    {s.status === 'SUCCESS' && <span className="text-green-600">Success</span>}
                    {s.status === 'FAILED' && <span className="text-red-600">Failed</span>}
                    {s.status === 'SYNCING' && <span className="text-blue-600">Syncing</span>}
                    {s.status === 'IDLE' && <span className="text-gray-500">Idle</span>}
                  </td>
                  <td className="pr-2">
                    {s.lastSyncedAt ? formatDistanceToNow(new Date(s.lastSyncedAt), { addSuffix: true }) : '—'}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModalOpen(true)}
                      className="px-2 py-0 text-xs"
                    >
                      Sync
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TooltipContent>
      </Tooltip>
      {/* Sync Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="p-6 min-w-[320px] max-w-xs">
          <h2 className="text-lg font-bold mb-2">Manual Sync</h2>
          <div className="mb-4 text-sm text-gray-700 dark:text-gray-200">
            Select a resource to sync:
          </div>
          {syncError && <div className="text-red-600 mb-2">{syncError}</div>}
          <div className="space-y-2">
            {syncStatuses.map(s => (
              <Button
                key={s.resource}
                onClick={() => handleSync(s.resource)}
                disabled={syncingResource === s.resource}
                className="w-full justify-start"
                variant="outline"
              >
                {syncingResource === s.resource ? (
                  <span className="flex items-center gap-2"><ArrowsClockwise className="animate-spin" size={16} /> Syncing...</span>
                ) : (
                  <span className="capitalize">Sync {s.resource}</span>
                )}
              </Button>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </TooltipProvider>
  );
} 