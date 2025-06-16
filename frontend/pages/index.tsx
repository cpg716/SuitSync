import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import Skeleton from '../components/ui/Skeleton';

const statusColors = {
  success: 'text-green-600',
  error: 'text-red-600',
  syncing: 'text-yellow-500',
};

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [sync, setSync] = useState({ status: 'syncing', last: null });
  useEffect(() => {
    Promise.all([
      fetch('/api/parties').then(r => r.json()),
      fetch('/api/appointments').then(r => r.json()),
      fetch('/api/alterations').then(r => r.json()),
      fetch('/api/commissions/leaderboard').then(r => r.json()),
      fetch('/api/webhooks/sync-status').then(r => r.json()).catch(() => ({ status: 'syncing', last: null })),
    ]).then(([parties, appts, alterations, commissions, syncStatus]) => {
      setMetrics({ parties, appts, alterations, commissions });
      setSync(syncStatus);
    });
  }, []);

  const alterationStatus = metrics?.alterations?.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {}) || {};
  const alterationPie = Object.entries(alterationStatus).map(([k, v]) => ({ name: k, value: v }));
  const partyTimeline = metrics?.parties?.map(p => ({ date: p.eventDate.slice(0, 10), count: 1 })) || [];
  const commissionBar = metrics?.commissions
    ? metrics.commissions.filter(c => c.associate?.role === 'associate' || c.associate?.role === 'sales' || !c.associate?.role) // fallback: show all if no role
      .map(c => ({ name: c.associate?.name, commission: c.totalCommission }))
    : [];

  // Today's Appointments and Alterations
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todaysAppts = metrics?.appts?.filter(a => a.dateTime && a.dateTime.slice(0, 10) === todayStr) || [];
  const todaysAlts = metrics?.alterations?.filter(a => a.scheduledDateTime && a.scheduledDateTime.slice(0, 10) === todayStr) || [];

  // Tailor time tracking for today
  const tailorTimeToday = {};
  if (metrics?.alterations) {
    metrics.alterations.forEach(a => {
      if (a.scheduledDateTime && a.scheduledDateTime.slice(0, 10) === todayStr && a.tailor?.name) {
        if (!tailorTimeToday[a.tailor.name]) {
          tailorTimeToday[a.tailor.name] = { time: 0, jobs: 0 };
        }
        tailorTimeToday[a.tailor.name].time += a.timeSpent || 0;
        tailorTimeToday[a.tailor.name].jobs += 1;
      }
    });
  }

  return (
    <div className="w-full max-w-screen-lg mx-auto bg-white text-black dark:bg-gray-dark dark:text-white">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Metrics Cards */}
        <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          <Card title="Total Parties" value={metrics ? metrics.parties.length : null} link="/parties" iconColor="bg-primary" />
          <Card title="Upcoming Appointments" value={metrics ? metrics.appts.length : null} link="/calendar" iconColor="bg-primary-light" />
          <Card title="Pending Alterations" value={metrics ? metrics.alterations.filter(a => a.status === 'pending').length : null} link="/alterations" iconColor="bg-gray" />
          <Card title="Top Commission" value={metrics ? `$${Math.max(...commissionBar.map(c => c.commission || 0)).toFixed(2)}` : null} link="/commission" iconColor="bg-gray-light" />
        </div>
        {/* Today's Schedules */}
        <div className="col-span-1 md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Card title="Today's Appointments">
              {metrics === null ? <Skeleton className="h-24 w-full" /> : (
                todaysAppts.length === 0 ? <div className="text-gray-500">No appointments today.</div> :
                <ul className="divide-y">
                  {todaysAppts.map(a => (
                    <li key={a.id} className="py-2 flex flex-col md:flex-row md:items-center md:gap-2">
                      <span className="font-semibold text-primary dark:text-accent">{a.dateTime ? new Date(a.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      <span className="ml-2">{a.party?.name || '—'}</span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200`}>{a.type}</span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${a.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : a.status === 'canceled' ? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'}`}>{a.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Today's Alterations">
              {metrics === null ? <Skeleton className="h-24 w-full" /> : (
                todaysAlts.length === 0 ? <div className="text-gray-500">No alterations scheduled today.</div> :
                <ul className="divide-y">
                  {todaysAlts.map(a => (
                    <li key={a.id} className="py-2 flex flex-col md:flex-row md:items-center md:gap-2">
                      <span className="font-semibold text-primary dark:text-accent">{a.scheduledDateTime ? new Date(a.scheduledDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      <span className="ml-2">{a.party?.name || '—'}</span>
                      <span className="ml-2 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200">{a.itemType}</span>
                      <span className={`ml-2 text-xs px-2 py-1 rounded-full ${a.status === 'complete' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : a.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}>{a.status}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
        {/* Charts */}
        <div className="bg-white dark:bg-gray-dark rounded-2xl shadow-card p-3 flex flex-col">
          <h2 className="font-semibold mb-2">Parties Timeline</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={partyTimeline}>
              <XAxis dataKey="date" stroke="#0055A5" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0055A5" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-dark rounded-2xl shadow-card p-3 flex flex-col">
          <h2 className="font-semibold mb-2">Alteration Status</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={alterationPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#0055A5">
                {alterationPie.map((entry, i) => <Cell key={i} fill={["#0055A5", "#FFC200", "#4B5563"][i % 3]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-gray-dark rounded-2xl shadow-card p-3 flex flex-col md:col-span-1">
          <h2 className="font-semibold mb-2">Commission Leaderboard</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={commissionBar} layout="vertical">
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="commission" fill="#FFC200" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Quick Links & Sync Status */}
        <div className="col-span-1 md:col-span-3 flex flex-col md:flex-row gap-3 items-center mt-2">
          <div className="flex gap-4 flex-wrap">
            <QuickLink href="/parties" label="View Parties" />
            <QuickLink href="/calendar" label="Appointments" />
            <QuickLink href="/alterations" label="Alterations" />
            <QuickLink href="/tag" label="Print Tags" />
            <QuickLink href="/commission" label="Commissions" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <RefreshCw className={`animate-spin ${sync.status === 'syncing' ? '' : 'hidden'}`} size={18} />
            <span className={`text-sm font-medium ${statusColors[sync.status]}`}>Sync: {sync.status}</span>
            {sync.last && <span className="ml-2 text-xs text-gray-500">Last: {new Date(sync.last).toLocaleString()}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, link, children, iconColor }) {
  if (link) {
    return (
      <Link legacyBehavior href={link}>
        <a className={`bg-white dark:bg-gray-dark rounded-2xl shadow-card p-3 flex flex-col items-center justify-center hover:shadow-lg transition min-h-[80px] border border-gray-light dark:border-neutral-700`}>
          <span className={`text-neutral-700 dark:text-gray-light text-sm mb-1 font-semibold`}>{title}</span>
          {value !== undefined ? (
            <span className="text-3xl font-bold text-primary dark:text-accent">{value === null ? <span className="animate-pulse">...</span> : value}</span>
          ) : null}
          {children}
        </a>
      </Link>
    );
  }
  return (
    <div className={`bg-white dark:bg-gray-dark rounded-2xl shadow-card p-3 flex flex-col min-h-[80px] border border-gray-light dark:border-neutral-700`}>
      <span className={`text-neutral-700 dark:text-gray-light text-sm mb-1 font-semibold`}>{title}</span>
      {value !== undefined ? (
        <span className="text-3xl font-bold text-primary dark:text-accent">{value === null ? <span className="animate-pulse">...</span> : value}</span>
      ) : null}
      {children}
    </div>
  );
}

function QuickLink({ href, label }) {
  return (
    <Link legacyBehavior href={href}>
      <a className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-light dark:bg-neutral-700 dark:hover:bg-primary transition font-medium shadow-card">{label}</a>
    </Link>
  );
}