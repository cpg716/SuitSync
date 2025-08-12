import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Legend
} from 'recharts';
import { 
  RefreshCw, Download, Trash2, AlertTriangle, CheckCircle, XCircle, 
  Activity, Database, Globe, Clock, TrendingUp, TrendingDown, 
  Wifi, WifiOff, Server, HardDrive, Cpu, Zap
} from 'lucide-react';
import useSWR from 'swr';
import { useToast } from './ToastContext';
import { apiFetch } from '../lib/apiClient';
import { getLightspeedHealth, triggerSync } from '../lib/apiClient';
import { formatDistanceToNow, format } from 'date-fns';

interface SystemMetrics {
  timestamp: string;
  memory: {
    usagePercentage: number;
    used: number;
    total: number;
  };
  api: {
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
  cache: {
    hitRate: number;
    size: number;
  };
}

interface SyncStatus {
  resource: string;
  status: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'FAILED';
  lastSyncedAt: string | null;
  errorMessage: string | null;
}

interface LightspeedHealth {
  lightspeedConnection: 'OK' | 'ERROR';
  lightspeedApiError: string | null;
  syncStatuses: SyncStatus[];
  databaseError?: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  issues: string[];
  metrics: {
    memory: {
      usage: string;
      used: string;
      total: string;
    };
    api: {
      requestsPerMinute: number;
      averageResponseTime: string;
      errorRate: string;
    };
    cache: {
      hitRate: string;
      size: number;
    };
  } | null;
  version: string;
  environment: string;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function HealthAndSyncDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('24');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [syncingResource, setSyncingResource] = useState<string | null>(null);
  const { success: toastSuccess, error: toastError } = useToast();

  // Fetch system metrics
  const { data: metricsData, error: metricsError, mutate: refreshMetrics } = useSWR(
    `/api/monitoring/metrics?hours=${selectedTimeRange}`,
    fetcher,
    { refreshInterval }
  );

  // Fetch system health
  const { data: healthData, error: healthError, mutate: refreshHealth } = useSWR(
    '/api/monitoring/health',
    fetcher,
    { refreshInterval: 10000 }
  );

  // Fetch Lightspeed health and sync status
  const { data: lightspeedData, error: lightspeedError, mutate: refreshLightspeed } = useSWR<LightspeedHealth>(
    '/api/lightspeed/health',
    getLightspeedHealth,
    { refreshInterval: 15000 }
  );

  // Fetch sync errors
  const { data: syncErrors, error: syncErrorsError } = useSWR(
    '/api/sync/errors',
    fetcher,
    { refreshInterval: 60000 }
  );

  const handleSync = async (resource: string) => {
    setSyncingResource(resource);
    try {
      await triggerSync(resource);
      toastSuccess(`Sync started for ${resource}. Status will update shortly.`);
      refreshLightspeed();
    } catch (err) {
      toastError(`Failed to start sync for ${resource}`);
    } finally {
      setSyncingResource(null);
    }
  };

  const handleClearCache = async () => {
    try {
      const response = await apiFetch('/api/performance/cache/clear', {
        method: 'POST',
      });
      if (response.ok) {
        toastSuccess('Cache cleared successfully');
        refreshMetrics();
        refreshHealth();
      } else {
        throw new Error('Failed to clear cache');
      }
    } catch (error) {
      toastError('Failed to clear cache');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'SYNCED':
      case 'OK':
        return 'text-green-600';
      case 'degraded':
      case 'SYNCING':
        return 'text-yellow-600';
      case 'unhealthy':
      case 'FAILED':
      case 'ERROR':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'SYNCED':
      case 'OK':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded':
      case 'SYNCING':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy':
      case 'FAILED':
      case 'ERROR':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Prepare data for charts
  const syncStatusData = useMemo(() => {
    if (!lightspeedData?.syncStatuses) return [];
    return lightspeedData.syncStatuses.map(status => ({
      name: status.resource,
      status: status.status === 'SUCCESS' ? 100 : status.status === 'SYNCING' ? 50 : 0,
      lastSync: status.lastSyncedAt ? new Date(status.lastSyncedAt).getTime() : 0,
    }));
  }, [lightspeedData]);

  const systemPerformanceData = useMemo(() => {
    if (!metricsData?.history) return [];
    return metricsData.history.slice(-20).map((point: any) => ({
      time: new Date(point.timestamp).toLocaleTimeString(),
      memory: point.memory.usagePercentage,
      responseTime: point.api.averageResponseTime,
      errorRate: point.api.errorRate * 100,
      requests: point.api.requestsPerMinute,
    }));
  }, [metricsData]);

  const overallHealthScore = useMemo(() => {
    if (!healthData || !lightspeedData) return 0;
    
    let score = 0;
    let total = 0;

    // System health (40% weight)
    if (healthData.status === 'healthy') score += 40;
    else if (healthData.status === 'degraded') score += 20;
    total += 40;

    // Lightspeed connection (30% weight)
    if (lightspeedData.lightspeedConnection === 'OK') score += 30;
    total += 30;

    // Sync status (30% weight)
    const syncScore = lightspeedData.syncStatuses.reduce((acc, status) => {
      if (status.status === 'SUCCESS') return acc + 1;
      if (status.status === 'SYNCING') return acc + 0.5;
      return acc;
    }, 0) / lightspeedData.syncStatuses.length * 30;
    score += syncScore;
    total += 30;

    return Math.round((score / total) * 100);
  }, [healthData, lightspeedData]);

  return (
    <div className="w-full space-y-8">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 rounded-xl shadow-lg p-8 flex flex-col md:flex-row items-center gap-6 animate-fade-in">
        <div className="flex-1">
          <h1 className="text-4xl font-extrabold text-white mb-2 drop-shadow-lg">Health & Sync Dashboard</h1>
          <p className="text-lg text-blue-100 mb-4">Comprehensive system health, API status, and sync monitoring</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-white">
              <Activity className="h-5 w-5" />
              <span className="font-medium">System Health Score: {overallHealthScore}%</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
            <Activity className="w-12 h-12 text-white" />
          </div>
          <span className="text-white text-sm font-semibold">
            {lightspeedData?.syncStatuses?.filter(s => s.status === 'SUCCESS').length || 0} / {lightspeedData?.syncStatuses?.length || 0} Resources Synced
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Monitoring</h2>
          <p className="text-gray-600">Real-time system health and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="1">Last Hour</option>
            <option value="6">Last 6 Hours</option>
            <option value="24">Last 24 Hours</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshMetrics();
              refreshHealth();
              refreshLightspeed();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall System Health Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600">{overallHealthScore}%</div>
              <div className="text-sm text-gray-600">Health Score</div>
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div 
                  className={`h-4 rounded-full transition-all duration-500 ${
                    overallHealthScore >= 80 ? 'bg-green-500' : 
                    overallHealthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${overallHealthScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(healthData?.status || 'unknown')}
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className={`font-semibold capitalize ${getStatusColor(healthData.status)}`}>
                          {healthData.status}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Uptime</p>
                        <p className="font-semibold">{formatUptime(healthData.uptime)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Memory Usage</p>
                        <p className="font-semibold">{healthData.metrics?.memory.usage || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Error Rate</p>
                        <p className="font-semibold">{healthData.metrics?.api.errorRate || 'N/A'}</p>
                      </div>
                    </div>
                    {healthData.issues && healthData.issues.length > 0 && (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Issues detected: {healthData.issues.join(', ')}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">Loading system health...</div>
                )}
              </CardContent>
            </Card>

            {/* Lightspeed API Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(lightspeedData?.lightspeedConnection || 'unknown')}
                  Lightspeed API
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lightspeedData ? (
                  <div className="space-y-4">
                                         <div className="grid grid-cols-2 gap-4">
                       <div>
                         <p className="text-sm text-gray-600">Connection</p>
                         <p className={`font-semibold ${getStatusColor(lightspeedData.lightspeedConnection)}`}>
                           {lightspeedData.lightspeedConnection}
                         </p>
                       </div>
                       <div>
                         <p className="text-sm text-gray-600">Sync Status</p>
                         <p className={`font-semibold ${getStatusColor(lightspeedData.syncStatuses.some(s => s.status === 'FAILED') ? 'ERROR' : 'OK')}`}>
                           {lightspeedData.syncStatuses.some(s => s.status === 'FAILED') ? 'ERROR' : 'OK'}
                         </p>
                       </div>
                     </div>
                    {lightspeedData.lightspeedApiError && (
                      <Alert>
                        <XCircle className="h-4 w-4" />
                        <AlertDescription>
                          API Error: {lightspeedData.lightspeedApiError}
                        </AlertDescription>
                      </Alert>
                    )}
                    {lightspeedData.databaseError && (
                      <Alert>
                        <Database className="h-4 w-4" />
                        <AlertDescription>
                          Database Error: {lightspeedData.databaseError}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">Loading API status...</div>
                )}
              </CardContent>
            </Card>

            {/* Sync Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Sync Status Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lightspeedData?.syncStatuses ? (
                  <div className="space-y-3">
                    {lightspeedData.syncStatuses.map((status) => (
                      <div key={status.resource} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-medium">{status.resource}</span>
                          <Badge className={getStatusColor(status.status)}>
                            {status.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          {status.lastSyncedAt ? 
                            formatDistanceToNow(new Date(status.lastSyncedAt), { addSuffix: true }) : 
                            'Never'
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">Loading sync status...</div>
                )}
              </CardContent>
            </Card>

            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricsData?.current ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Response Time</p>
                        <p className="font-semibold">{Math.round(metricsData.current.api.averageResponseTime)}ms</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Requests/min</p>
                        <p className="font-semibold">{Math.round(metricsData.current.api.requestsPerMinute)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Cache Hit Rate</p>
                        <p className="font-semibold">{(metricsData.current.cache.hitRate * 100).toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Memory Usage</p>
                        <p className="font-semibold">{metricsData.current.memory.usagePercentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">Loading performance data...</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Health Tab */}
        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Memory Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
                <CardDescription>
                  Current: {metricsData?.current?.memory.usagePercentage.toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={systemPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, 'Memory Usage']} />
                    <Area 
                      type="monotone" 
                      dataKey="memory" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Response Time Chart */}
            <Card>
              <CardHeader>
                <CardTitle>API Response Time</CardTitle>
                <CardDescription>
                  Current: {metricsData?.current?.api.averageResponseTime.toFixed(0)}ms
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={systemPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']} />
                    <Line 
                      type="monotone" 
                      dataKey="responseTime" 
                      stroke="#82ca9d" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Error Rate Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
                <CardDescription>
                  Current: {(metricsData?.current?.api.errorRate * 100).toFixed(2)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={systemPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 10]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Error Rate']} />
                    <Area 
                      type="monotone" 
                      dataKey="errorRate" 
                      stroke="#ff7300" 
                      fill="#ff7300" 
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Requests Per Minute */}
            <Card>
              <CardHeader>
                <CardTitle>Requests Per Minute</CardTitle>
                <CardDescription>
                  Current: {Math.round(metricsData?.current?.api.requestsPerMinute || 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={systemPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(0)}`, 'Requests/min']} />
                    <Bar dataKey="requests" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Sync Status Tab */}
        <TabsContent value="sync" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sync Status Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sync Status Overview</CardTitle>
                <CardDescription>Current sync status for all resources</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={syncStatusData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar 
                      name="Sync Status" 
                      dataKey="status" 
                      stroke="#8884d8" 
                      fill="#8884d8" 
                      fillOpacity={0.3} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sync Status Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Sync Status</CardTitle>
                <CardDescription>Last sync times and error details</CardDescription>
              </CardHeader>
              <CardContent>
                {lightspeedData?.syncStatuses ? (
                  <div className="space-y-3">
                    {lightspeedData.syncStatuses.map((status) => (
                      <div key={status.resource} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="capitalize font-medium">{status.resource}</span>
                            <Badge className={getStatusColor(status.status)}>
                              {status.status}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSync(status.resource)}
                            disabled={syncingResource === status.resource}
                          >
                            {syncingResource === status.resource ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            Last Sync: {status.lastSyncedAt ? 
                              formatDistanceToNow(new Date(status.lastSyncedAt), { addSuffix: true }) : 
                              'Never'
                            }
                          </div>
                          
                          {status.errorMessage && (
                            <div className="text-red-600">Error: {status.errorMessage}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">Loading sync status...</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sync Errors */}
          {syncErrors && syncErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Recent Sync Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {syncErrors.map((error: any, index: number) => (
                    <div key={index} className="p-3 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10">
                      <div className="text-sm text-red-600">{error.message}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {error.createdAt ? new Date(error.createdAt).toLocaleString() : 'Unknown time'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cache Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>
                  Hit Rate: {(metricsData?.current?.cache.hitRate * 100).toFixed(1)}%
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={systemPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                    <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Hit Rate']} />
                    <Line 
                      type="monotone" 
                      dataKey="cacheHitRate" 
                      stroke="#8884d8" 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* System Resources */}
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>Current resource utilization</CardDescription>
              </CardHeader>
              <CardContent>
                {healthData?.metrics ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Memory Usage</span>
                        <span>{healthData.metrics.memory.usage}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${parseInt(healthData.metrics.memory.usage)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>API Error Rate</span>
                        <span>{healthData.metrics.api.errorRate}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${parseFloat(healthData.metrics.api.errorRate)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Cache Hit Rate</span>
                        <span>{healthData.metrics.cache.hitRate}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${parseFloat(healthData.metrics.cache.hitRate)}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">Loading resource data...</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5" />
                  Cache Management
                </CardTitle>
                <CardDescription>Clear application cache</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleClearCache} variant="outline" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Manual Sync
                </CardTitle>
                <CardDescription>Trigger manual sync for all resources</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lightspeedData?.syncStatuses.map((status) => (
                    <Button
                      key={status.resource}
                      size="sm"
                      variant="outline"
                      onClick={() => handleSync(status.resource)}
                      disabled={syncingResource === status.resource}
                      className="w-full"
                    >
                      {syncingResource === status.resource ? (
                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Sync {status.resource}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Data
                </CardTitle>
                <CardDescription>Export system metrics and logs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Metrics
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export Logs
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 