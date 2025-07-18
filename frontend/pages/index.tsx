import { useEffect, useState, memo, useMemo, useCallback } from 'react';
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
import { RefreshCw, Users, Calendar, Scissors, DollarSign } from 'lucide-react';

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

interface StatCardProps {
  title: string;
  value: any;
  link?: string;
  icon?: React.ComponentType<any>;
}

// Memoized StatCard component to prevent unnecessary re-renders
const StatCard = memo(({ title, value, link, icon: Icon }: StatCardProps) => {
  const cardContent = useMemo(() => (
    <Card className={link ? "cursor-pointer hover:shadow-md transition-all duration-200 active:scale-95 touch-manipulation" : ""}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3">
        <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-xl sm:text-2xl font-bold">
          {value === null || value === undefined ? <Skeleton className="h-6 sm:h-8 w-1/2" /> : value}
        </div>
        {link && <span className="text-xs text-muted-foreground hover:text-primary transition-colors">View all</span>}
      </CardContent>
    </Card>
  ), [title, value, link, Icon]);

  if (link) {
    return <Link href={link} className="block">{cardContent}</Link>;
  }

  return cardContent;
});

StatCard.displayName = 'StatCard';

function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [sync, setSync] = useState({ status: 'syncing', last: null });
  const [apiError, setApiError] = useState<string | null>(null);

  // Optimize SWR calls with better caching
  const { data: dashboardStats } = useSWR('/api/stats/dashboard', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000, // 30 seconds
  });
  const { data: syncStatus, mutate: mutateSync } = useSWR('/api/sync/status', fetcher, {
    refreshInterval: 10000, // Reduced from 5s to 10s for better performance
    revalidateOnFocus: false,
  });
  const { data: recentSales } = useSWR('/api/sales/recent', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // 1 minute
  });

  // Memoize the fetch function to prevent recreation on every render
  const fetchAllMetrics = useCallback(async () => {
    try {
      const [partiesRes, apptsRes, alterationsRes, commissionsRes] = await Promise.all([
        api.get('/api/parties'),
        api.get('/api/appointments'),
        api.get('/api/alterations'),
        api.get('/api/commissions/leaderboard'),
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
  }, []);

  useEffect(() => {
    fetchAllMetrics();
  }, [fetchAllMetrics]);

  // Memoize expensive calculations to prevent recalculation on every render
  const { alterationsArr, partiesArr, apptsArr, commissionsArr } = useMemo(() => ({
    alterationsArr: Array.isArray(metrics?.alterations) ? metrics.alterations : [],
    partiesArr: Array.isArray(metrics?.parties) ? metrics.parties : [],
    apptsArr: Array.isArray(metrics?.appts) ? metrics.appts : [],
    commissionsArr: Array.isArray(metrics?.commissions) ? metrics.commissions : [],
  }), [metrics]);

  const { alterationPie, partyTimeline, salesBar } = useMemo(() => {
    const alterationStatus = alterationsArr.reduce((acc, a) => {
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    }, {});

    return {
      alterationPie: Object.entries(alterationStatus).map(([k, v]) => ({ name: k, value: v })),
      partyTimeline: partiesArr.map(p => ({ date: p.eventDate.slice(0, 10), count: 1 })),
      salesBar: commissionsArr
        .filter(c => c.associate?.role === 'associate' || c.associate?.role === 'sales' || !c.associate?.role)
        .map(c => ({ name: c.associate?.name, sales: c.totalSales }))
    };
  }, [alterationsArr, partiesArr, commissionsArr]);

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
    <div className="w-full space-y-4 sm:space-y-6">
      {/* Stats Cards Grid - Responsive */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="Total Parties" value={metrics ? metrics.parties.length : null} link="/parties" icon={Users} />
          <StatCard title="Upcoming Appointments" value={metrics ? metrics.appts.length : null} link="/appointments" icon={Calendar} />
          <StatCard title="Pending Alterations" value={metrics ? alterationsArr.filter(a => a.status === 'pending').length : null} link="/alterations" icon={Scissors} />
          <StatCard title="Top Commission" value={metrics ? `$${Math.max(0, ...salesBar.map(c => c.sales || 0)).toFixed(2)}` : null} link="/sales" icon={DollarSign} />
      </div>

      {/* Today's Activities Grid - Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-6">
        <Card className="lg:col-span-1 xl:col-span-7">
           <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-base sm:text-lg">Today's Appointments</CardTitle>
          </CardHeader>
          <CardContent className="pl-2 sm:pl-6">
            {metrics === null ? <Skeleton className="h-48 w-full" /> : (
              todaysAppts.length === 0 ? <p className="text-sm text-muted-foreground">No appointments today.</p> :
              <div className="space-y-3 sm:space-y-4 max-h-64 overflow-y-auto">
                {todaysAppts.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center space-x-3 sm:space-x-4 p-2 sm:p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors active:bg-gray-100 dark:active:bg-gray-800">
                     <div className="flex-1 space-y-1 min-w-0">
                       <p className="text-sm font-medium leading-none truncate">{a.party?.name || '—'}</p>
                       <p className="text-xs sm:text-sm text-muted-foreground">{a.dateTime ? new Date(a.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                     </div>
                     <Badge className="flex-shrink-0 text-xs">{a.type}</Badge>
                  </div>
                ))}
                {todaysAppts.length > 5 && (
                    <div className="mt-3 flex justify-end">
                      <Button asChild variant="link" className="p-0 h-auto text-sm touch-manipulation">
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
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <Button asChild className="w-full min-h-[44px] sm:min-h-[40px] text-sm sm:text-base touch-manipulation">
              <Link href="/parties">
                <span className="hidden sm:inline">View Parties</span>
                <span className="sm:hidden">Parties</span>
              </Link>
            </Button>
            <Button asChild className="w-full min-h-[44px] sm:min-h-[40px] text-sm sm:text-base touch-manipulation">
              <Link href="/appointments">
                <span className="hidden sm:inline">Appointments</span>
                <span className="sm:hidden">Appts</span>
              </Link>
            </Button>
            <Button asChild className="w-full min-h-[44px] sm:min-h-[40px] text-sm sm:text-base touch-manipulation">
              <Link href="/alterations">Alterations</Link>
            </Button>
            <Button asChild className="w-full min-h-[44px] sm:min-h-[40px] text-sm sm:text-base touch-manipulation">
              <Link href="/tag">
                <span className="hidden sm:inline">Print Tags</span>
                <span className="sm:hidden">Tags</span>
              </Link>
            </Button>
            <Button asChild className="w-full min-h-[44px] sm:min-h-[40px] text-sm sm:text-base touch-manipulation">
              <Link href="/sales">
                <span className="hidden sm:inline">Commissions</span>
                <span className="sm:hidden">Sales</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Memoize the entire Dashboard component to prevent unnecessary re-renders
const MemoizedDashboard = memo(Dashboard);
// MemoizedDashboard.title = 'Dashboard';

export default MemoizedDashboard;