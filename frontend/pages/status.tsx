import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { CheckCircle, XCircle, Clock, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import { useToast } from '../components/ToastContext';
import { api, clearSession } from '../lib/apiClient';

interface HealthStatus {
  status: string;
  timestamp: string;
  db?: any;
  session?: any;
}

export default function StatusPage() {
  const router = useRouter();
  const { user, loading, connectLightspeed, isLightspeedConnected } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const reason = urlParams.get('reason');

    if (reason === 'session_cleared') {
      setStatusMessage('Session was automatically cleared due to size limits.');
      toastSuccess('Session cleared successfully.');
    } else if (reason === 'header_size_error') {
      setStatusMessage('Request headers were too large. Please clear your session manually.');
      toastError('Header size error detected.');
    }

    const checkHealth = async () => {
      try {
        const response = await api.get('/api/health');
        setHealthStatus(response.data);
      } catch (error) {
        console.error('Health check failed:', error);
        setHealthStatus({ status: 'error', timestamp: new Date().toISOString() });
      } finally {
        setHealthLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, [toastSuccess, toastError]);

  const handleLightspeedLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    window.location.href = `${backendUrl}/auth/start-lightspeed`;
  };

  const handleClearSession = async () => {
    try {
      await clearSession();
      toastSuccess('Session cleared successfully. Please refresh the page.');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toastError('Failed to clear session. Please try refreshing the page manually.');
    }
  };

  const StatusIndicator = ({ status, label }: { status: 'ok' | 'error' | 'loading'; label: string }) => {
    const getIcon = () => {
      switch (status) {
        case 'ok':
          return <CheckCircle className="w-5 h-5 text-green-500" />;
        case 'error':
          return <XCircle className="w-5 h-5 text-red-500" />;
        case 'loading':
          return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      }
    };

    const getColor = () => {
      switch (status) {
        case 'ok':
          return 'text-green-700 bg-green-50 border-green-200';
        case 'error':
          return 'text-red-700 bg-red-50 border-red-200';
        case 'loading':
          return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      }
    };

    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg border ${getColor()}`}>
        {getIcon()}
        <span className="font-medium">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SuitSync Status</h1>
          <p className="text-gray-600">
            Current system status and authentication information
          </p>
          {statusMessage && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
              {statusMessage}
            </div>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* System Health */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <WifiHigh className="w-5 h-5" />
                System Health
              </h2>
              <div className="space-y-3">
                <StatusIndicator
                  status={healthLoading ? 'loading' : healthStatus?.status === 'ok' ? 'ok' : 'error'}
                  label={`Backend API: ${healthStatus?.status || 'Checking...'}`}
                />
                <StatusIndicator
                  status={healthStatus?.db ? 'ok' : 'error'}
                  label="Database Connection"
                />
                <StatusIndicator
                  status={healthStatus?.session !== undefined ? 'ok' : 'error'}
                  label="Session Management"
                />
              </div>
              {healthStatus?.timestamp && (
                <p className="text-sm text-gray-500 mt-4">
                  Last checked: {new Date(healthStatus.timestamp).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Authentication Status */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                {user ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                Authentication
              </h2>
              <div className="space-y-3">
                {loading ? (
                  <StatusIndicator status="loading" label="Checking authentication..." />
                ) : user ? (
                  <>
                    <StatusIndicator status="ok" label={`Signed in as: ${user.name}`} />
                    <StatusIndicator status="ok" label={`Role: ${user.role}`} />
                    <StatusIndicator
                      status={isLightspeedConnected ? 'ok' : 'error'}
                      label={`Lightspeed: ${isLightspeedConnected ? 'Connected' : 'Not Connected'}`}
                    />
                    {user.lightspeed?.domain && (
                      <p className="text-sm text-gray-600">
                        Domain: {user.lightspeed.domain}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <StatusIndicator status="error" label="Not authenticated" />
                    <div className="mt-4">
                      <Button
                        onClick={handleLightspeedLogin}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Sign in with Lightspeed
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {!user ? (
                  <Button
                    onClick={handleLightspeedLogin}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Sign in with Lightspeed
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={() => router.push('/')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Go to Dashboard
                    </Button>
                    {!isLightspeedConnected && (
                      <Button
                        onClick={connectLightspeed}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Connect Lightspeed
                      </Button>
                    )}
                    <Button
                      onClick={() => window.location.reload()}
                      variant="outline"
                    >
                      Refresh Status
                    </Button>
                    <Button
                      onClick={handleClearSession}
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      Clear Session
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
              <div className="space-y-3 text-sm text-gray-600">
                <div>
                  <strong>401 Unauthorized errors:</strong> These are normal when not signed in. 
                  Click "Sign in with Lightspeed" above to authenticate.
                </div>
                <div>
                  <strong>431 Request Header Fields Too Large:</strong> This can happen with large session data. 
                  Try refreshing the page or clearing your browser cache.
                </div>
                <div>
                  <strong>Backend unavailable:</strong> Check that the Docker containers are running. 
                  Run <code className="bg-gray-100 px-1 rounded">docker-compose ps</code> to verify.
                </div>
                <div>
                  <strong>Lightspeed connection issues:</strong> Ensure your Lightspeed credentials are configured 
                  and your account has the necessary API permissions.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Don't use the default layout for this page
(StatusPage as any).getLayout = (page: React.ReactNode) => page;
