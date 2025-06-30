import axios from 'axios';
import type { LightspeedHealth } from '../components/LightspeedStatus';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired, redirect to login (no console log)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.href = '/login?sessionExpired=true';
      }
      // Suppress AxiosError logging for 401
      return Promise.reject(error);
    }

    if (error.response && error.response.status === 431) {
      // Request header fields too large - try to clear session
      console.warn('Request headers too large, attempting to clear session...');
      try {
        // Call clearSession function directly to avoid circular dependency
        await api.post('/auth/clear-session');
        if (typeof window !== 'undefined') {
          window.location.href = '/status?reason=session_cleared';
        }
      } catch (clearError) {
        console.error('Failed to clear session:', clearError);
        if (typeof window !== 'undefined') {
          window.location.href = '/status?reason=header_size_error';
        }
      }
      return Promise.reject(new Error('Session data too large. Session has been cleared.'));
    }

    // Handle network errors gracefully
    if (!error.response) {
      console.warn('Network error or server unavailable:', error.message);
      return Promise.reject(new Error('Network error - please check your connection'));
    }

    // For other errors, log minimal info for debugging
    if (process.env.NODE_ENV === 'development') {
      console.warn('API Error:', error.response?.status, error.response?.data?.error || error.message);
    }

    return Promise.reject(error);
  }
);

export const fetcher = (url: string) => api.get(url).then(res => res.data);

export const swrConfig = {
  // Global SWR configuration
  fetcher,
  refreshInterval: 30_000, // Refresh every 30 seconds
  revalidateOnFocus: false, // Don't revalidate on window focus
  dedupingInterval: 5_000, // Dedupe requests within 5 seconds
  shouldRetryOnError: (error: any) => {
    // Don't retry on authentication errors (401) or client errors (4xx)
    if (error?.response?.status >= 400 && error?.response?.status < 500) {
      return false;
    }
    return true;
  },
  errorRetryCount: 2, // Only retry twice for server errors
  onError: (error: any) => {
    // Global error handler for SWR - suppress 401 errors as they're expected when not authenticated
    if (error?.response?.status === 401) {
      // 401 errors are expected when not authenticated, don't log them
      return;
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn('SWR Error:', error?.message || error);
    }
  },
};

export const getSyncStatus = async () => {
  const { data } = await api.get('/api/sync/status');
  return data;
};

export const clearSession = async () => {
  const { data } = await api.post('/api/auth/clear-session');
  return data;
};

export const triggerSync = async (resource: string) => {
  const { data } = await api.post(`/api/sync/trigger/${resource}`);
  return data;
};

export const resetSyncStatus = () => {
  return api.post('/api/sync/reset-status');
};

export const getLightspeedHealth = async (): Promise<LightspeedHealth> => {
  const { data } = await api.get('/api/lightspeed/health');
  return data as LightspeedHealth;
};

export { api };