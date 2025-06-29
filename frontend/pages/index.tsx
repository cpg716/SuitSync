import { useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';

import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import useSWR from 'swr';
import { api, fetcher } from '@/lib/apiClient';

const statusColors = {
  success: 'text-green-600',
  error: 'text-red-600',
  syncing: 'text-yellow-500',
};

// A simple card component, might need to be moved to its own file if it grows
const StatCard = ({ title, value, link, icon: Icon }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {value === null || value === undefined ? <Skeleton className="h-8 w-1/2" /> : value}
      </div>
      {link && <Link href={link} className="text-xs text-muted-foreground hover:text-primary">View all</Link>}
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [sync, setSync] = useState({ status: 'syncing', last: null });
  const [apiError, setApiError] = useState<string | null>(null);
  const { data: dashboardStats } = useSWR('/stats/dashboard', fetcher);
  const { data: syncStatus, mutate: mutateSync } = useSWR('/sync/status', fetcher, { refreshInterval: 5000 });
  const { data: recentSales } = useSWR('/sales/recent', fetcher);

  useEffect(() => {
    const fetchAllMetrics = async () => {
      try {
        const [partiesRes, apptsRes, alterationsRes, commissionsRes] = await Promise.all([
          api.get('/parties'),
          api.get('/appointments'),
          api.get('/alterations'),
          api.get('/commissions/leaderboard'),
        ]);
        setMetrics({
          parties: partiesRes.data,
          appts: apptsRes.data,
          alterations: alterationsRes.data,
          commissions: commissionsRes.data,
        });
      } catch (error) {
        console.error("Failed to load dashboard metrics", error);
        setApiError('Failed to load dashboard metrics. Please try again later.');
      }
    };

    fetchAllMetrics();
  }, []);

  // Defensive: always check for arrays
  const alterationsArr = Array.isArray(metrics?.alterations) ? metrics.alterations : [];
  const partiesArr = Array.isArray(metrics?.parties) ? metrics.parties : [];
  const apptsArr = Array.isArray(metrics?.appts) ? metrics.appts : [];
  const commissionsArr = Array.isArray(metrics?.commissions) ? metrics.commissions : [];

  const alterationStatus = alterationsArr.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});
  const alterationPie = Object.entries(alterationStatus).map(([k, v]) => ({ name: k, value: v }));
  const partyTimeline = partiesArr.map(p => ({ date: p.eventDate.slice(0, 10), count: 1 }));
  const salesBar = commissionsArr
    .filter(c => c.associate?.role === 'associate' || c.associate?.role === 'sales' || !c.associate?.role)
    .map(c => ({ name: c.associate?.name, sales: c.totalSales }));

  // Today's Appointments and Alterations
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todaysAppts = apptsArr.filter(a => a.dateTime && a.dateTime.slice(0, 10) === todayStr);
  const todaysAlts = alterationsArr.filter(a => a.scheduledDateTime && a.scheduledDateTime.slice(0, 10) === todayStr);

  // Tailor time tracking for today
  const tailorTimeToday = {};
  alterationsArr.forEach(a => {
    if (a.scheduledDateTime && a.scheduledDateTime.slice(0, 10) === todayStr && a.tailor?.name) {
      if (!tailorTimeToday[a.tailor.name]) {
        tailorTimeToday[a.tailor.name] = { time: 0, jobs: 0 };
      }
      tailorTimeToday[a.tailor.name].time += a.timeSpent || 0;
      tailorTimeToday[a.tailor.name].jobs += 1;
    }
  });

  if (apiError) {
    return (
        <div className="flex h-full w-full items-center justify-center rounded-lg border border-destructive bg-background p-4">
            <p className="text-destructive">{apiError}</p>
        </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Stats Cards Grid - Responsive */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Parties" value={metrics ? metrics.parties.length : null} link="/parties" icon={<span />} />
          <StatCard title="Upcoming Appointments" value={metrics ? metrics.appts.length : null} link="/appointments" icon={<span />} />
          <StatCard title="Pending Alterations" value={metrics ? alterationsArr.filter(a => a.status === 'pending').length : null} link="/alterations" icon={<span />} />
          <StatCard title="Top Commission" value={metrics ? `$${Math.max(0, ...salesBar.map(c => c.sales || 0)).toFixed(2)}` : null} link="/sales" icon={<span />} />
      </div>
      
      {/* Today's Activities Grid - Responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-7">
           <CardHeader>
            <CardTitle>Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            {metrics === null ? <Skeleton className="h-48 w-full" /> : (
              todaysAppts.length === 0 ? <p className="text-sm text-muted-foreground">No appointments today.</p> :
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {todaysAppts.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                     <div className="flex-1 space-y-1 min-w-0">
                       <p className="text-sm font-medium leading-none truncate">{a.party?.name || '—'}</p>
                       <p className="text-sm text-muted-foreground">{a.dateTime ? new Date(a.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                     </div>
                     <Badge className="flex-shrink-0">{a.type}</Badge>
                  </div>
                ))}
                {todaysAppts.length > 5 && (
                    <div className="mt-2 flex justify-end">
                      <Button asChild variant="link" className="p-0 h-auto">
                        <Link href="/appointments">View All</Link>
                      </Button>
                    </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="xl:col-span-5">
           <CardHeader>
            <CardTitle>Today's Alterations</CardTitle>
          </CardHeader>
          <CardContent>
             {metrics === null ? <Skeleton className="h-48 w-full" /> : (
                todaysAlts.length === 0 ? <p className="text-sm text-muted-foreground">No alterations scheduled today.</p> :
                <div className="space-y-4 max-h-64 overflow-y-auto">
                    {todaysAlts.slice(0, 5).map(a => (
                      <div key={a.id} className="flex items-center space-x-4 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                         <div className="flex-1 space-y-1 min-w-0">
                           <p className="text-sm font-medium leading-none truncate">{a.party?.name || '—'}</p>
                           <p className="text-sm text-muted-foreground truncate">{a.tailor?.name || 'Unassigned'}</p>
                         </div>
                         <Badge className="flex-shrink-0">{a.status}</Badge>
                      </div>
                    ))}
                    {todaysAlts.length > 5 && (
                        <div className="mt-2 flex justify-end">
                          <Button asChild variant="link" className="p-0 h-auto">
                            <Link href="/alterations">View All</Link>
                          </Button>
                        </div>
                    )}
                </div>
             )}
          </CardContent>
        </Card>
      </div>
      
      {/* Charts Grid - Responsive */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <Card className="xl:col-span-7">
           <CardHeader>
            <CardTitle>Sales Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64 sm:h-80 lg:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesBar} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    stroke="#888888" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(value) => `$${value}`} 
                  />
                  <Tooltip formatter={(value) => [`$${value}`, 'Sales']} />
                  <Bar dataKey="sales" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle>Alteration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-64 sm:h-80 lg:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={alterationPie} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {alterationPie.map((entry, i) => (
                      <Cell 
                        key={`cell-${i}`} 
                        fill={["#16a34a", "#f97316", "#6b7280"][i % 3]} 
                        className="stroke-background hover:opacity-80" 
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
       
      {/* Quick Actions - Responsive */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Button asChild className="w-full">
              <Link href="/parties">View Parties</Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/appointments">Appointments</Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/alterations">Alterations</Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/tag">Print Tags</Link>
            </Button>
            <Button asChild className="w-full">
              <Link href="/sales">Commissions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

Dashboard.title = 'Dashboard';