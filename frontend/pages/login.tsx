import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/AuthContext';
import { Button } from '@/components/ui/Button';
import { useToast } from '../components/ToastContext';
import { Card } from '@/components/ui/Card';
import { SwitchUserModal } from '@/components/ui/SwitchUserModal';
import axios from 'axios';

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { error: toastError, success } = useToast();
  const [showSwitchUser, setShowSwitchUser] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    // If user is already logged in, redirect to the dashboard.
    if (!authLoading && user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Show modal only if ?switch=1 is present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('switch') === '1') {
      setShowSwitchUser(true);
      setLoadingUsers(true);
      axios.get('/api/users')
        .then(res => {
          if (Array.isArray(res.data)) {
            setAllUsers(res.data);
          } else if (res.data && typeof res.data === 'object' && Array.isArray((res.data as any).lightspeedUsers)) {
            setAllUsers((res.data as any).lightspeedUsers);
          } else {
            setAllUsers([]);
          }
        })
        .catch(err => {
          if (err.response && err.response.status === 401) {
            toastError('You must be logged in to view users.');
            window.location.href = '/login';
          } else if (err.response && err.response.status === 404) {
            toastError('User list is unavailable.');
          } else {
            toastError('Failed to fetch users.');
          }
          setAllUsers([]);
        })
        .then(() => setLoadingUsers(false));
    }
  }, [authLoading, user]);

  useEffect(() => {
    // Check for error parameters from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    const detailsParam = urlParams.get('details');
    
    if (errorParam) {
      let errorMessage = 'Authentication failed';
      if (errorParam === 'auth_failed') {
        errorMessage = 'Lightspeed authentication failed';
      } else if (errorParam === 'oauth_error') {
        errorMessage = 'OAuth authorization error';
      } else if (errorParam === 'employee_fetch_failed') {
        errorMessage = 'Failed to fetch employee data from Lightspeed';
      } else if (errorParam === 'employee_sync_failed') {
        errorMessage = 'Failed to sync employee data';
      } else if (errorParam === 'callback_failed') {
        errorMessage = 'Authentication callback failed';
      } else if (errorParam === 'user_creation_failed') {
        errorMessage = 'Failed to create user account';
      }
      
      if (detailsParam) {
        const decodedDetails = decodeURIComponent(detailsParam);
        if (decodedDetails.includes('invalid_scope')) {
          errorMessage = 'This application does not have the required permissions. Please contact your Lightspeed administrator.';
        } else if (decodedDetails.includes('invalid_grant')) {
          errorMessage = 'Authorization expired or invalid. Please try again.';
        } else if (decodedDetails.includes('Payment Required')) {
          errorMessage = 'Your Lightspeed account requires payment to access the API. Please contact Lightspeed support.';
        } else {
          errorMessage += `: ${decodedDetails}`;
        }
      }
      
      setError(errorMessage);
      toastError(errorMessage);
      
      // Clean up URL without reloading
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toastError]);

  const handleLightspeedLogin = () => {
    // Simply redirect to the backend endpoint that starts the OAuth flow.
    // The backend will handle the redirect to Lightspeed's authorization page.
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
    window.location.href = `${backendUrl}/auth/start-lightspeed`;
  };

  const handleUserSelect = (selectedUser) => {
    // Implement Lightspeed OAuth for the selected user
    console.log('Selected user:', selectedUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(to_bottom_right,_#dbeafe_0%,_#fff_50%,_#bfdbfe_100%)] dark:bg-[var(--bg-dark)] transition-colors">
      <Card className="w-full max-w-md p-8 bg-white shadow-2xl border border-accent">
        <div className="flex flex-col items-center mb-6">
          <img src="/suitsync-logoh.png" alt="SuitSync Logo" className="h-20 w-auto mb-2 drop-shadow-lg" />
          <img src="/riverside-logo-full.jpg" alt="Riverside Logo" className="h-10 w-auto mb-2" />
          <h1 className="text-2xl font-bold mb-2 text-primary">Sign in to SuitSync</h1>
          <p className="text-sm text-gray-600 text-center">
            Sign in with your Lightspeed X-Series account to access SuitSync
          </p>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
        
        <Button
          onClick={handleLightspeedLogin}
          disabled={loading}
          className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 px-4 rounded-lg shadow-lg transition flex items-center justify-center gap-3"
          aria-label="Sign in with Lightspeed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Connecting to Lightspeed...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
              </svg>
              Sign in with Lightspeed
            </>
          )}
        </Button>
        
        <div className="mt-6 text-xs text-gray-500 text-center space-y-2">
          <p>
            Your Lightspeed X-Series account credentials will be used to access SuitSync.
          </p>
          <p>
            Permissions and roles are automatically synced from your Lightspeed account.
          </p>
        </div>
      </Card>
      <SwitchUserModal open={showSwitchUser} onClose={() => setShowSwitchUser(false)} allUsers={allUsers} onUserSelect={handleUserSelect} />
    </div>
  );
}

(LoginPage as any).getLayout = (page: React.ReactNode) => page; 