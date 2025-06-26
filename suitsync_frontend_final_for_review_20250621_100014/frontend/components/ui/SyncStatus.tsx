import React from 'react';
import { useAuth } from '../../src/AuthContext';
import { RefreshCw } from 'lucide-react';

const SYNC_COLORS = {
  ok: 'bg-green-500',
  old: 'bg-yellow-400',
  error: 'bg-red-500',
};

const SYNC_LABELS = {
  ok: 'Up to date',
  old: 'Sync may be old',
  error: 'Sync error',
};

const getSyncStatus = (lastSync?: Date | string | null): keyof typeof SYNC_LABELS => {
  if (!lastSync) return 'error';
  const last = new Date(lastSync);
  const now = new Date();
  const diff = (now.getTime() - last.getTime()) / 1000 / 60; // minutes
  if (diff < 5) return 'ok';
  if (diff < 60) return 'old';
  return 'error';
};

export const SyncStatus: React.FC = () => {
  const { lastSync, syncCustomers } = useAuth();
  const status = getSyncStatus(lastSync);
  const color = SYNC_COLORS[status];
  const label = SYNC_LABELS[status];

  const handleSync = () => {
    if (syncCustomers) {
      syncCustomers();
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="relative flex h-3 w-3">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`}></span>
        <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`}></span>
      </span>
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <button onClick={handleSync} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <RefreshCw size={16} />
      </button>
    </div>
  );
}; 