import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, UserCircle, RefreshCw } from 'lucide-react';
import PushSubscribeButton from './PushSubscribeButton';
import { useRouter } from 'next/router';

const routeTitles = {
  '/': 'Dashboard',
  '/parties': 'Parties',
  '/appointments': 'Appointments',
  '/alterations': 'Alterations',
  '/commission': 'Commissions',
  '/admin': 'Settings',
};

const SYNC_COLORS = {
  ok: 'bg-green-500',
  old: 'bg-yellow-400',
  error: 'bg-red-500',
};

const SYNC_LABELS = {
  ok: 'Up to date',
  old: 'Sync old',
  error: 'No connection',
};

const getSyncStatus = (lastSync) => {
  if (!lastSync) return 'error';
  const last = new Date(lastSync);
  const now = new Date();
  const diff = (now - last) / 1000 / 60; // minutes
  if (diff < 5) return 'ok';
  if (diff < 60) return 'old';
  return 'error';
};

const Appbar: React.FC = () => {
  const router = useRouter();
  const title = routeTitles[router.pathname] || '';
  const [sync, setSync] = useState({ status: 'ok', last: null, loading: false });

  const fetchSync = async () => {
    setSync(s => ({ ...s, loading: true }));
    try {
      const res = await fetch('/api/webhooks/sync-status');
      const data = await res.json();
      setSync({ status: getSyncStatus(data.lastSync), last: data.lastSync, loading: false });
    } catch {
      setSync({ status: 'error', last: null, loading: false });
    }
  };

  useEffect(() => {
    fetchSync();
  }, []);

  const handleSync = async () => {
    setSync(s => ({ ...s, loading: true }));
    try {
      await fetch('/api/sync/trigger', { method: 'POST' });
      await fetchSync();
    } catch {
      setSync(s => ({ ...s, loading: false, status: 'error' }));
    }
  };

  return (
    <header className="w-full h-16 flex items-center justify-between px-4 md:px-8 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 backdrop-blur z-30">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/suitsync-logoh.png" alt="SuitSync Logo" className="h-10 w-auto" />
        </Link>
        {title && <span className="ml-4 text-2xl font-bold text-gray-700 dark:text-gray-200 hidden sm:inline">{title}</span>}
      </div>
      <div className="flex items-center gap-4">
        <button
          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition font-medium"
          onClick={handleSync}
          aria-label="Sync"
          disabled={sync.loading}
        >
          <span>Sync</span>
          <span className={`inline-block w-3 h-3 rounded-full ${SYNC_COLORS[sync.status] || 'bg-gray-400'}`}></span>
          {sync.loading && <RefreshCw className="animate-spin ml-1" size={16} />}
        </button>
        <button className="relative p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition">
          <Bell size={20} />
          {/* Notification badge example */}
          {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> */}
        </button>
        <PushSubscribeButton />
        <button className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          <UserCircle size={22} />
          <span className="hidden md:inline text-sm font-medium">Account</span>
        </button>
      </div>
    </header>
  );
};

export default Appbar; 