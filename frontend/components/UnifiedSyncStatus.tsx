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
  const overallStatus = data?.lightspeedConnection === 'ERROR' ? 'ERROR' : 'OK';
  const hasErrors = data?.lightspeedApiError || data?.databaseError || false;

  let summaryIcon, summaryColor, summaryText;
  if (overallStatus === 'ERROR' || hasErrors) {
    summaryIcon = <WarningCircle size={20} className="text-red-500" />;
    summaryColor = 'text-red-600 dark:text-red-400';
    summaryText = 'ERROR';
  } else if (overallStatus === 'OK') {
    summaryIcon = <CheckCircle size={20} className="text-green-500" />;
    summaryColor = 'text-green-600 dark:text-green-400';
    summaryText = 'OK';
  } else {
    summaryIcon = <Info size={20} className="text-gray-500" />;
    summaryColor = 'text-gray-600 dark:text-gray-400';
    summaryText = 'IDLE';
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
        <TooltipContent side="bottom" className="min-w-[300px]">
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
                      onClick={() => handleSync(s.resource)}
                      disabled={syncingResource === s.resource}
                      className="px-2 py-0 text-xs"
                    >
                      {syncingResource === s.resource ? 'Syncing...' : 'Sync'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasErrors && (
            <div className="text-xs text-red-600 mt-2">
              ⚠️ Some sync operations have failed. Check individual resource status above.
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 