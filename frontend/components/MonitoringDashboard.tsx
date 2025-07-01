import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { RefreshCw, Download, Trash2, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import useSWR from 'swr';
import { useToast } from './ToastContext';
import { apiFetch } from '../lib/apiClient';

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

interface AlertRule {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  lastTriggered?: string;
}

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  requestId?: string;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => res.json());

export default function MonitoringDashboard() {
  const [selectedTimeRange, setSelectedTimeRange] = useState('1');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const { success: toastSuccess, error: toastError } = useToast();

  // Fetch system metrics
  const { data: metricsData, error: metricsError, mutate: refreshMetrics } = useSWR(
    `/api/monitoring/metrics?hours=${selectedTimeRange}`,
    fetcher,
    { refreshInterval }
  );

  // Fetch alerts
  const { data: alertsData, error: alertsError } = useSWR(
    '/api/monitoring/alerts',
    fetcher,
    { refreshInterval: 60000 } // 1 minute
  );

  // Fetch logs
  const { data: logsData, error: logsError, mutate: refreshLogs } = useSWR(
    '/api/monitoring/logs?hours=1&limit=50',
    fetcher,
    { refreshInterval: 30000 }
  );

  // Fetch health status
  const { data: healthData, error: healthError } = useSWR(
    '/api/monitoring/health',
    fetcher,
    { refreshInterval: 10000 } // 10 seconds
  );

  const handleClearCache = async () => {
    try {
      const response = await apiFetch('/api/performance/cache/clear', {
        method: 'POST',
      });

      if (response.ok) {
        toastSuccess('Cache cleared successfully');
        refreshMetrics();
      } else {
        throw new Error('Failed to clear cache');
      }
    } catch (error) {
      toastError('Failed to clear cache');
    }
  };

  const handleClearLogs = async () => {
    try {
      const response = await fetch('/api/monitoring/logs/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThan: 7 }),
        credentials: 'include',
      });
      
      if (response.ok) {
        toastSuccess('Old logs cleared successfully');
        refreshLogs();
      } else {
        throw new Error('Failed to clear logs');
      }
    } catch (error) {
      toastError('Failed to clear logs');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'unhealthy': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'unhealthy': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <XCircle className="h-5 w-5 text-gray-600" />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-gray-600">Real-time system health and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refreshMetrics();
              refreshLogs();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(healthData.status)}
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-semibold capitalize ${getStatusColor(healthData.status)}`}>
                  {healthData.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Uptime</p>
                <p className="font-semibold">
                  {Math.floor(healthData.uptime / 3600)}h {Math.floor((healthData.uptime % 3600) / 60)}m
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Memory Usage</p>
                <p className="font-semibold">
                  {healthData.metrics?.memory.usage || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Error Rate</p>
                <p className="font-semibold">
                  {healthData.metrics?.api.errorRate || 'N/A'}
                </p>
              </div>
            </div>
            {healthData.issues && healthData.issues.length > 0 && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Issues detected: {healthData.issues.join(', ')}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="actions">Actions</TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="1">Last Hour</option>
              <option value="6">Last 6 Hours</option>
              <option value="24">Last 24 Hours</option>
            </select>
          </div>

          {metricsData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Memory Usage Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Memory Usage</CardTitle>
                  <CardDescription>
                    Current: {metricsData.current?.memory.usagePercentage.toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metricsData.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis domain={[0, 100]} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [`${value.toFixed(1)}%`, 'Memory Usage']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="memory.usagePercentage" 
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
                    Current: {metricsData.current?.api.averageResponseTime.toFixed(0)}ms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={metricsData.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="api.averageResponseTime" 
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
                    Current: {(metricsData.current?.api.errorRate * 100).toFixed(2)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={metricsData.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'Error Rate']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="api.errorRate" 
                        stroke="#ff7300" 
                        fill="#ff7300" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cache Hit Rate */}
              <Card>
                <CardHeader>
                  <CardTitle>Cache Performance</CardTitle>
                  <CardDescription>
                    Hit Rate: {(metricsData.current?.cache.hitRate * 100).toFixed(1)}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={metricsData.history}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                      <Tooltip 
                        labelFormatter={(value) => new Date(value).toLocaleString()}
                        formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Hit Rate']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="cache.hitRate" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Alert Rules</CardTitle>
              <CardDescription>System alert rules and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {alertsData?.alerts && (
                <div className="space-y-3">
                  {alertsData.alerts.map((alert: AlertRule) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{alert.name}</h4>
                        <p className="text-sm text-gray-600">ID: {alert.id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        {alert.lastTriggered && (
                          <span className="text-sm text-gray-500">
                            Last: {new Date(alert.lastTriggered).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Recent Logs</CardTitle>
              <CardDescription>System logs from the last hour</CardDescription>
            </CardHeader>
            <CardContent>
              {logsData?.logs && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {logsData.logs.map((log: LogEntry, index: number) => (
                    <div key={index} className="p-2 border-l-4 border-gray-200 bg-gray-50 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={log.level === 'ERROR' ? 'destructive' : 'secondary'}>
                          {log.level}
                        </Badge>
                        <span className="text-gray-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                        {log.requestId && (
                          <span className="text-xs text-gray-400">
                            {log.requestId.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <p className="font-mono">{log.message}</p>
                      {log.meta && (
                        <pre className="text-xs text-gray-600 mt-1 overflow-x-auto">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Management</CardTitle>
                <CardDescription>Clear application cache</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleClearCache} variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Log Management</CardTitle>
                <CardDescription>Clear old log files</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleClearLogs} variant="outline">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Old Logs
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
