import useSWR from 'swr';
import { getLightspeedHealth, triggerSync } from '@/lib/apiClient';
import { useAuth } from '@/src/AuthContext';
import { Button } from './ui/Button';
import { ArrowsClockwise, CheckCircle, WarningCircle, Info } from '@phosphor-icons/react';
import { useToast } from './ToastContext';
import { formatDistanceToNow } from 'date-fns';

interface ResourceSyncStatusProps {
  resource: string;
}

export function ResourceSyncStatus({ resource }: ResourceSyncStatusProps) {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  // Don't show sync status if user is not authenticated or not an admin
  const shouldFetch = user && user.role === 'admin';

  const { data, mutate } = useSWR(
    shouldFetch ? '/api/lightspeed/health' : null,
    getLightspeedHealth,
    {
      refreshInterval: 10000,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const handleSync = async () => {
    try {
      await triggerSync(resource);
      toastSuccess(`${resource} sync started`);
      mutate();
    } catch (err) {
      let message = 'Sync failed';
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

  // If user is not authenticated, show a friendly message
  if (!user) {
    return (
      <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
        <Info size={16} />
        <span className="text-sm">Please log in to sync {resource}.</span>
      </div>
    );
  }

  const status = data?.syncStatuses?.find(s => s.resource === resource);
  const isSyncing = status?.status === 'SYNCING';

  if (!status) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-gray-500 dark:text-gray-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Not synced</span>
        </div>
        {user?.role === 'admin' && (
          <Button onClick={handleSync} size="sm" variant="outline">
            <ArrowsClockwise size={16} className="mr-1" />
            Sync
          </Button>
        )}
      </div>
    );
  }

  const renderStatus = () => {
    switch (status.status) {
      case 'SYNCING':
        return {
          icon: <ArrowsClockwise size={16} className="text-blue-500 animate-spin" />,
          text: 'Syncing...',
          color: 'text-blue-600 dark:text-blue-400',
        };
      case 'SUCCESS':
        return {
          icon: <CheckCircle size={16} className="text-green-500" />,
          text: status.lastSyncedAt
            ? `Synced ${formatDistanceToNow(new Date(status.lastSyncedAt), { addSuffix: true })}`
            : 'Synced (time unknown)',
          color: 'text-green-600 dark:text-green-400',
        };
      case 'FAILED':
        return {
          icon: <WarningCircle size={16} className="text-red-500" />,
          text: 'Failed',
          color: 'text-red-600 dark:text-red-400',
        };
      default:
        return {
          icon: <Info size={16} className="text-gray-500" />,
          text: 'Idle',
          color: 'text-gray-600 dark:text-gray-400',
        };
    }
  };
  
  const { icon, text, color } = renderStatus();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className={`text-sm ${color}`}>{text}</span>
      </div>
      {user?.role === 'admin' && (
        <Button onClick={handleSync} disabled={isSyncing} size="sm" variant="outline">
          <ArrowsClockwise size={16} className={`mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing' : 'Sync'}
        </Button>
      )}
    </div>
  );
} 