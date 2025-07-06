import useSWR from 'swr';
import { getLightspeedHealth, triggerSync } from '@/lib/apiClient';
import { useAuth } from '@/src/AuthContext';
import { Button } from './ui/Button';
import { Card, CardContent } from './ui/Card';
import { ArrowsClockwise, CheckCircle, WarningCircle, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import { useToast } from './ToastContext';
import { formatDistanceToNow } from 'date-fns';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SyncStatusData {
  resource: string;
  status: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'FAILED';
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

export interface LightspeedHealth {
  lightspeedConnection: 'OK' | 'ERROR';
  lightspeedApiError: string | null;
  syncStatuses: SyncStatusData[];
  databaseError?: string;
}

export function LightspeedStatus() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Don't show sync status if user is not authenticated or not an admin
  const shouldFetch = user && user.role === 'admin';

  const { data, error, mutate } = useSWR<LightspeedHealth>(
    shouldFetch ? '/api/lightspeed/health' : null,
    getLightspeedHealth,
    {
      refreshInterval: 15000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const handleSync = async (resource: string) => {
    try {
      await triggerSync(resource);
      toastSuccess(`Sync started for ${resource}. Status will update shortly.`);
      mutate();
    } catch (err) {
      let message = `Failed to start sync for ${resource}.`;
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data && typeof err.response.data.message === 'string') {
        message = err.response.data.message || message;
      }
      toastError(message);
    }
  };

  const handleManualHealthCheck = async () => {
    try {
      toastSuccess('Performing health check...');
      await mutate(); // Refresh the health data
      toastSuccess('Health check completed!');
    } catch (err) {
      let message = 'Failed to perform health check';
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data && typeof err.response.data.message === 'string') {
        message = err.response.data.message || message;
      }
      toastError(message);
    }
  };

  // Don't show sync status if user is not authenticated or not an admin
  if (!shouldFetch) {
    return null; // Hide the component entirely for non-admin users
  }

  if (error) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <WifiSlash size={20} />
              <span className="text-sm font-medium">Error</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Could not fetch Lightspeed status: {error.message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
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
  
  if (data.lightspeedConnection === 'ERROR') {
    return (
       <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <WifiSlash size={20} />
              <span className="text-sm font-medium">Connection Failed</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Lightspeed API Error: {data.lightspeedApiError}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const failedSyncs = data.syncStatuses.filter(s => s.status === 'FAILED');
  const isSyncing = data.syncStatuses.some(s => s.status === 'SYNCING');

  if (failedSyncs.length > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
              <WarningCircle size={20} />
              <span className="text-sm font-medium">{failedSyncs.length} Sync Issue(s)</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {failedSyncs.map(s => (
              <div key={s.resource} className="mb-2 last:mb-0">
                <p className="font-bold capitalize">{s.resource} Sync Failed</p>
                <p className="text-xs">{s.errorMessage}</p>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => handleSync(s.resource)}>
                  Retry Sync
                </Button>
              </div>
            ))}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (isSyncing) {
     return (
        <div className="flex items-center gap-2 text-blue-500">
          <ArrowsClockwise size={20} className="animate-spin" />
          <span className="text-sm font-medium">Syncing...</span>
        </div>
     );
  }

  // Everything is OK
  const lastSyncTime = data.syncStatuses.length > 0
    ? Math.max(...data.syncStatuses.map(s => s.lastSyncedAt ? new Date(s.lastSyncedAt).getTime() : 0))
    : null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle size={20} />
            <span className="text-sm font-medium">Synced</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-2">
            <p>All systems operational.</p>
            {lastSyncTime && <p className="text-xs">Last sync activity: {formatDistanceToNow(new Date(lastSyncTime))} ago</p>}
            {user?.role === 'admin' && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-auto p-1 text-xs" 
                onClick={handleManualHealthCheck}
              >
                Run Health Check
              </Button>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
} 