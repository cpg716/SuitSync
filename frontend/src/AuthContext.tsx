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

  const fetcher = (url: string): Promise<User | null> => Promise.resolve(api.get(url)).then(res => res.data as User | null);

  const { data: user, mutate, isLoading } = useSWR<User | null>('/auth/session', fetcher, {
    shouldRetryOnError: false,
    onError: (err) => {
      if (err && typeof err === 'object' && 'response' in err && err.response && typeof err.response === 'object' && 'status' in err.response) {
        if (err.response.status !== 401) {
          setAuthError('Backend unavailable');
        } else {
          setAuthError(null);
        }
      }
    },
    onSuccess: (data) => {
      if (data && typeof data === 'object' && 'photoUrl' in data) {
        console.log('Auth Context - User photo URL:', data.photoUrl);
      }
    }
  });

  const { data: syncStatus, mutate: mutateSyncStatus } = useSWR('/sync/status', fetcher, {
    refreshInterval: 5000,
    onError: (err) => {
      console.error("SWR sync status error:", err);
    }
  });

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
      await api.post('/auth/logout');
      setIsLightspeedConnected(false);
      await mutate(null, false);
    } catch (err) {
      toastError("Logout failed. Please try again.");
      console.error(err);
    }
  }

  async function refreshUser() {
    await mutate();
  }

  async function checkAuth() {
    await mutate();
  }

  const syncCustomers = useCallback(async () => {
    toastSuccess('Starting manual sync...');
    try {
      await api.post('/sync/customers');
      toastSuccess('Sync in progress. Data will update shortly.');
      mutateSyncStatus();
    } catch (err) {
      toastError(err.response?.data?.error || 'Sync failed');
    }
  }, [toastSuccess, toastError, mutateSyncStatus]);

  async function connectLightspeed() {
    try {
      const res = await api.get('/auth/start-lightspeed');
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