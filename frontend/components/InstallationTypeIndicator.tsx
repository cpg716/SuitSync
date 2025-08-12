import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Server, 
  Monitor, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useToast } from './ToastContext';
import { apiFetch } from '../lib/apiClient';

interface InstallationInfo {
  type: 'server' | 'pc' | 'mobile';
  instanceId: string;
  locationName: string;
  serverUrl?: string;
  isServer: boolean;
  isPC: boolean;
  isMobile: boolean;
  isClient: boolean;
  supportsMultiUser: boolean;
  supportsLightspeedSync: boolean;
  requiresServerConnection: boolean;
  isSingleLocation: boolean;
}

interface ServerStatus {
  isServer: boolean;
  isConnected?: boolean;
  clientInfo?: {
    type: string;
    instanceId: string;
    serverUrl?: string;
    isConnected: boolean;
    lastConnectionCheck: number;
  };
  serverStatus?: any;
  message?: string;
}

export default function InstallationTypeIndicator() {
  const [installationInfo, setInstallationInfo] = useState<InstallationInfo | null>(null);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  useEffect(() => {
    fetchInstallationInfo();
    fetchServerStatus();
  }, []);

  const fetchInstallationInfo = async () => {
    try {
      const response = await apiFetch('/api/client/installation-info');
      if (response.ok) {
        const data = await response.json();
        setInstallationInfo(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch installation info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServerStatus = async () => {
    try {
      const response = await apiFetch('/api/client/server-status');
      if (response.ok) {
        const data = await response.json();
        setServerStatus(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch server status:', error);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const response = await apiFetch('/api/client/test-connection', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setServerStatus(data.data);
        toastSuccess(data.data.message || 'Connection test completed');
      } else {
        throw new Error('Connection test failed');
      }
    } catch (error) {
      toastError('Failed to test server connection');
    } finally {
      setTestingConnection(false);
    }
  };

  const getInstallationIcon = (type: string) => {
    switch (type) {
      case 'server':
        return <Server className="h-5 w-5" />;
      case 'pc':
        return <Monitor className="h-5 w-5" />;
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Server className="h-5 w-5" />;
    }
  };

  const getInstallationColor = (type: string) => {
    switch (type) {
      case 'server':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pc':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'mobile':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getConnectionStatus = () => {
    if (!serverStatus) return 'unknown';
    if (serverStatus.isServer) return 'server';
    return serverStatus.isConnected ? 'connected' : 'disconnected';
  };

  const getConnectionIcon = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'server':
        return <Server className="h-4 w-4 text-blue-600" />;
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const getConnectionText = () => {
    const status = getConnectionStatus();
    switch (status) {
      case 'server':
        return 'Server Installation';
      case 'connected':
        return 'Connected to Server';
      case 'disconnected':
        return 'Disconnected from Server';
      default:
        return 'Connection Unknown';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installation Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!installationInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Installation Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load installation information
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Installation Type Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getInstallationIcon(installationInfo.type)}
            {installationInfo.locationName} - Installation Type
          </CardTitle>
          <CardDescription>
            Current SuitSync installation configuration for your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Badge className={`${getInstallationColor(installationInfo.type)}`}>
                  {installationInfo.type.toUpperCase()}
                </Badge>
                <p className="text-sm text-gray-600 mt-1">
                  Instance ID: {installationInfo.instanceId}
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  {getConnectionIcon()}
                  <span className="text-sm font-medium">
                    {getConnectionText()}
                  </span>
                </div>
              </div>
            </div>

            {/* Installation Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                {installationInfo.supportsMultiUser ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span>Multi-User Support</span>
              </div>
              <div className="flex items-center gap-2">
                {installationInfo.supportsLightspeedSync ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span>Lightspeed Sync</span>
              </div>
              <div className="flex items-center gap-2">
                {installationInfo.requiresServerConnection ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <span>Server Connection Required</span>
              </div>
            </div>

            {/* Server URL for client installations */}
            {installationInfo.serverUrl && (
              <div className="text-sm">
                <span className="font-medium">Server URL:</span>
                <span className="text-gray-600 ml-2">{installationInfo.serverUrl}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Connection Status Card (for client installations) */}
      {!installationInfo.isServer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Server Connection
            </CardTitle>
            <CardDescription>
              Connection status to SuitSync server
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getConnectionIcon()}
                  <span className="font-medium">
                    {getConnectionText()}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={testConnection}
                  disabled={testingConnection}
                >
                  {testingConnection ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>

              {serverStatus?.clientInfo && (
                <div className="text-sm space-y-2">
                  <div>
                    <span className="font-medium">Last Connection Check:</span>
                    <span className="text-gray-600 ml-2">
                      {new Date(serverStatus.clientInfo.lastConnectionCheck).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {serverStatus?.serverStatus && (
                <div className="text-sm">
                  <span className="font-medium">Server Status:</span>
                  <span className="text-gray-600 ml-2">
                    {serverStatus.serverStatus.status || 'Unknown'}
                  </span>
                </div>
              )}

              {getConnectionStatus() === 'disconnected' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This client installation is not connected to the SuitSync server. 
                    Some features may be limited or unavailable.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Installation Type Description */}
      <Card>
        <CardHeader>
          <CardTitle>Installation Type Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
                         {installationInfo.type === 'server' && (
               <div>
                 <h4 className="font-medium mb-2">Main Business Server</h4>
                 <ul className="list-disc list-inside space-y-1 text-gray-600">
                   <li>Central system for your business operations</li>
                   <li>Syncs with your Lightspeed store</li>
                   <li>All staff can log in and work simultaneously</li>
                   <li>Stores all customer data, appointments, and alterations</li>
                   <li>Can be accessed by other devices in your business</li>
                 </ul>
               </div>
             )}

             {installationInfo.type === 'pc' && (
               <div>
                 <h4 className="font-medium mb-2">Workstation (Windows 11)</h4>
                 <ul className="list-disc list-inside space-y-1 text-gray-600">
                   <li>For your office computers and workstations</li>
                   <li>Connects to your main business server</li>
                   <li>Staff can switch between different user accounts</li>
                   <li>Full access to all business functions</li>
                   <li>Works offline with local data caching</li>
                 </ul>
               </div>
             )}

             {installationInfo.type === 'mobile' && (
               <div>
                 <h4 className="font-medium mb-2">Mobile Device (iOS/Android)</h4>
                 <ul className="list-disc list-inside space-y-1 text-gray-600">
                   <li>For tablets and mobile devices in your business</li>
                   <li>Connects to your main business server</li>
                   <li>One user per device (good for dedicated staff)</li>
                   <li>Full access to all business functions</li>
                   <li>Perfect for customer interactions and field work</li>
                 </ul>
               </div>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 