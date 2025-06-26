import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import QRScanner from '@/components/ui/QRScanner';
import AlterationJobModal from '@/components/ui/AlterationJobModal';
import { useToast } from '@/components/ToastContext';
import { 
  Users, 
  Calendar, 
  Scissors, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  QrCode,
  Plus,
  User,
  BarChart3,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(r => r.json());

const STATUS_COLORS = {
  NOT_STARTED: '#6B7280',
  IN_PROGRESS: '#3B82F6',
  COMPLETE: '#10B981',
  PICKED_UP: '#8B5CF6',
  ON_HOLD: '#F59E0B',
};

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
  const { success: toastSuccess, error: toastError } = useToast();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  
  // Fetch dashboard data
  const { data: stats, error: statsError } = useSWR('/api/alterations/dashboard/stats', fetcher, { refreshInterval: 30000 });
  const { data: customers = [] } = useSWR('/api/customers', fetcher);
  const { data: parties = [] } = useSWR('/api/parties', fetcher);
  const { data: appointments = [] } = useSWR('/api/appointments', fetcher);
  const { data: recentJobs = [] } = useSWR('/api/alterations/jobs?limit=10', fetcher);

  const handleScanSuccess = (result: any) => {
    toastSuccess(`QR scan successful: ${result.result}`);
  };

  const handleCreateJobSubmit = async (jobData: any) => {
    try {
      const response = await fetch('/api/alterations/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });
      
      if (!response.ok) throw new Error('Failed to create job');
      
      toastSuccess('Alteration job created successfully');
      setCreateJobOpen(false);
      
      // Refresh data
      window.location.reload();
    } catch (error) {
      toastError('Failed to create alteration job');
      throw error;
    }
  };

  // Quick stats cards
  const quickStats = [
    {
      title: 'Total Customers',
      value: customers.length || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Active Parties',
      value: parties.filter(p => new Date(p.eventDate) >= new Date()).length || 0,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Jobs',
      value: stats?.summary?.totalJobs || 0,
      icon: Scissors,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'In Progress',
      value: stats?.summary?.inProgressJobs || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Completed',
      value: stats?.summary?.completedJobs || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Overdue',
      value: stats?.summary?.overdueJobs || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  // Prepare chart data
  const partStatusData = stats?.partsByStatus ? Object.entries(stats.partsByStatus).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
    color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6B7280'
  })) : [];

  const recentActivityData = stats?.recentActivity?.slice(0, 10).map((activity: any) => ({
    id: activity.id,
    action: activity.scanType.replace('_', ' '),
    user: activity.user.name,
    job: activity.part?.job?.jobNumber,
    customer: activity.part?.job?.customer?.name || activity.part?.job?.party?.name,
    timestamp: activity.timestamp,
  })) || [];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Welcome back! Here's what's happening with your alterations.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setScannerOpen(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Scan QR
            </Button>
            <Button
              onClick={() => setCreateJobOpen(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4" />
              New Job
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Parts Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Parts by Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {partStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={partStatusData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {partStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Recent QR Scan Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentActivityData.length > 0 ? (
                    recentActivityData.map((activity: any) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">
                            {activity.action} - Job #{activity.job}
                          </div>
                          <div className="text-sm text-gray-600">
                            {activity.customer} • by {activity.user}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      No recent activity
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Jobs & Quick Actions */}
          <div className="space-y-6">
            {/* Recent Jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="w-5 h-5" />
                  Recent Jobs
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentJobs?.jobs?.slice(0, 5).map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          Job #{job.jobNumber}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {job.customer?.name || job.party?.customer?.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {job.jobParts?.length || 0} parts
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge 
                          className={`${
                            job.status === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                            job.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {job.status.replace('_', ' ')}
                        </Badge>
                        {job.rushOrder && (
                          <Badge className="bg-red-100 text-red-800 text-xs">
                            RUSH
                          </Badge>
                        )}
                      </div>
                    </div>
                  )) || (
                    <div className="text-center text-gray-500 py-8">
                      No recent jobs
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/customers'}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Manage Customers
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/parties'}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  View Parties
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/alterations'}
                >
                  <Scissors className="w-4 h-4 mr-2" />
                  All Alterations
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/appointments'}
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Appointments
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/tag'}
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Print Tags
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Modals */}
        <QRScanner
          isOpen={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanSuccess={handleScanSuccess}
        />
        
        <AlterationJobModal
          isOpen={createJobOpen}
          onClose={() => setCreateJobOpen(false)}
          onSubmit={handleCreateJobSubmit}
          customers={Array.isArray(customers) ? customers : []}
          parties={parties}
        />
      </div>
    </Layout>
  );
} 