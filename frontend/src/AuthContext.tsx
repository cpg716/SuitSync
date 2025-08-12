import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import useSWR from 'swr';
import { useToast } from '../components/ToastContext';
import { api, fetcher } from '../lib/apiClient';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  photoUrl?: string;
  lightspeed?: {
    connected: boolean;
    domain: string | null;
    lastSync: string | null;
  };
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  authError: string | null;
  refreshUser: () => Promise<void>;
  checkAuth: () => Promise<void>;
  isLightspeedConnected: boolean;
  connectLightspeed: () => Promise<void>;
  lastSync: Date | null;
  syncCustomers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  logout: async () => {},
  authError: null,
  refreshUser: async () => {},
  checkAuth: async () => {},
  isLightspeedConnected: false,
  connectLightspeed: async () => {},
  lastSync: null,
  syncCustomers: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLightspeedConnected, setIsLightspeedConnected] = useState(false);
  const { success: toastSuccess, error: toastError } = useToast();

  const fetcher = async (url: string): Promise<User | null> => {
    try {
      const res = await api.get(url);
      return res.data as User | null;
    } catch (err: any) {
      // 401 is expected when not authenticated, return null instead of throwing
      if (err?.response?.status === 401) {
        return null;
      }
      // Re-throw other errors
      throw err;
    }
  };

  // Check for URL parameters that might indicate user authentication
  const getUrlUserInfo = () => {
    if (typeof window === 'undefined') return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const userName = urlParams.get('user');
    
    if (authStatus === 'success' && userName) {
      // Try to find user by name in the users list
      return { name: decodeURIComponent(userName) };
    }
    
    return null;
  };

  const { data: user, mutate, isLoading } = useSWR<User | null>('/api/auth/session', fetcher, {
    shouldRetryOnError: false,
    refreshInterval: 0, // Don't auto-refresh session endpoint
    revalidateOnFocus: false,
    onError: async (err) => {
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'status' in err.response) {
        if (err.response.status === 401) {
          // 401 is expected when not authenticated, but let's try to get user data from URL params
          const urlUserInfo = getUrlUserInfo();
          if (urlUserInfo) {
            try {
              // Try to find user by name in the users list
              const usersResponse = await api.get('/api/users');
              const responseData = usersResponse.data as any;
              const allUsers = responseData?.users || responseData?.localUsers || [];
              const matchingUser = allUsers.find((u: any) => u.name === urlUserInfo.name);
              
              if (matchingUser) {
                // Update the user data with the found user
                await mutate(matchingUser, false);
                setAuthError(null);
                return;
              }
            } catch (userErr) {
              console.log('Could not fetch user data from URL params:', userErr);
            }
          }
          setAuthError(null);
        } else if (err.response.status >= 500) {
          setAuthError('Backend unavailable');
        } else {
          setAuthError(null);
        }
      } else {
        // Network error or other issue
        setAuthError('Backend unavailable');
      }
    },
    onSuccess: (data) => {
      // User data loaded successfully, clear any auth errors
      setAuthError(null);
    }
  });

  // If the session is missing a photoUrl but we have an email, try to enrich it
  useEffect(() => {
    const enrichPhoto = async () => {
      if (!user || (user as any).photoUrl || !user.email) return;
      try {
        const res = await api.get('/api/auth/user-photo', { params: { email: user.email } });
        const data = res.data as any;
        if (data && data.photoUrl) {
          await mutate({ ...(user as any), photoUrl: data.photoUrl } as any, false);
        }
      } catch {
        // ignore
      }
    };
    enrichPhoto();
  }, [user?.email, (user as any)?.photoUrl]);

  const { data: syncStatus, mutate: mutateSyncStatus } = useSWR(
    user ? '/api/sync/status' : null, // Only fetch sync status if user is authenticated
    fetcher,
    {
      refreshInterval: user ? 5000 : 0, // Only refresh if authenticated
      shouldRetryOnError: false,
      onError: (err) => {
        // Only log sync status errors if they're not 401 (authentication required)
        if (err?.response?.status !== 401) {
          console.error("SWR sync status error:", err);
        }
      }
    }
  );

  const lastSync = syncStatus && typeof syncStatus === 'object' && 'lastSync' in syncStatus ? new Date(syncStatus.lastSync as string) : null;

  useEffect(() => {
    if (user?.lightspeed) {
      setIsLightspeedConnected(user.lightspeed.connected);
    } else {
      setIsLightspeedConnected(false);
    }
  }, [user]);

  async function logout() {
    try {
      // Call backend logout endpoint
      await api.post('/api/auth/logout');

      // Clear local state
      setIsLightspeedConnected(false);

      // Clear SWR cache and set user to null
      await mutate(null, false);

      // Clear any local storage tokens (if any)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      toastSuccess("Logged out successfully");
    } catch (err) {
      toastError("Logout failed. Please try again.");
      console.error(err);

      // Even if logout fails, clear local state and redirect
      setIsLightspeedConnected(false);
      await mutate(null, false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }

  async function refreshUser() {
    await mutate();
  }

  async function checkAuth() {
    await mutate();
  }

  function capitalizeWords(str: string) {
    return str.replace(/\b\w/g, c => c.toUpperCase());
  }

  const syncCustomers = useCallback(async () => {
    toastSuccess(capitalizeWords('Starting manual sync...'));
    try {
      await api.post('/api/sync/customers');
      toastSuccess(capitalizeWords('Sync in progress. Data will update shortly.'));
      mutateSyncStatus();
    } catch (err) {
      let message = 'Sync failed';
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'data' in err.response && err.response.data && typeof err.response.data === 'object' && 'error' in err.response.data) {
        message = err.response.data.error || message;
      }
      toastError(capitalizeWords(message));
    }
  }, [toastSuccess, toastError, mutateSyncStatus]);

  async function connectLightspeed() {
    try {
      const res = await api.get('/api/auth/start-lightspeed');
      if (res.data && typeof res.data === 'object' && 'url' in res.data && res.data.url) {
        window.location.href = res.data.url as string;
      }
    } catch (err) {
      toastError('Failed to start Lightspeed connection');
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading: isLoading, 
      logout, 
      authError, 
      refreshUser,
      checkAuth,
      isLightspeedConnected,
      connectLightspeed,
      lastSync,
      syncCustomers,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 