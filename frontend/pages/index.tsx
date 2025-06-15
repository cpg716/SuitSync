import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

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
  const commissionBar = metrics?.commissions?.map(c => ({ name: c.associate?.name, commission: c.totalCommission })) || [];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metrics Cards */}
        <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title="Total Parties" value={metrics ? metrics.parties.length : null} link="/parties" />
          <Card title="Upcoming Appointments" value={metrics ? metrics.appts.length : null} link="/calendar" />
          <Card title="Pending Alterations" value={metrics ? metrics.alterations.filter(a => a.status === 'pending').length : null} link="/alterations" />
          <Card title="Top Commission" value={metrics ? `$${Math.max(...commissionBar.map(c => c.commission || 0)).toFixed(2)}` : null} link="/commission" />
        </div>
        {/* Charts */}
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card p-4 flex flex-col">
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
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card p-4 flex flex-col">
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
        <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card p-4 flex flex-col md:col-span-1">
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
        <div className="col-span-1 md:col-span-3 flex flex-col md:flex-row gap-4 items-center mt-4">
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

function Card({ title, value, link }) {
  return (
    <Link href={link} passHref legacyBehavior>
      <a className="bg-white dark:bg-neutral-900 rounded-2xl shadow-card p-6 flex flex-col items-center justify-center hover:shadow-lg transition min-h-[120px]">
        <span className="text-neutral-700 dark:text-neutral-400 text-sm mb-1">{title}</span>
        <span className="text-3xl font-bold text-primary dark:text-accent">{value === null ? <span className="animate-pulse">...</span> : value}</span>
      </a>
    </Link>
  );
}

function QuickLink({ href, label }) {
  return (
    <Link href={href} passHref legacyBehavior>
      <a className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-light dark:bg-neutral-700 dark:hover:bg-primary transition font-medium shadow-card">{label}</a>
    </Link>
  );
}