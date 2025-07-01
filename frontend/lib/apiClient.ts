import axios from 'axios';
import type { LightspeedHealth } from '../components/LightspeedStatus';

// Get backend URL from environment or default to localhost
const getBackendUrl = () => {
  if (typeof window !== 'undefined') {
    // Client-side: always use relative URLs to go through Next.js proxy
    return '';
  }
  // Server-side: use environment variable for direct backend access
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
};

const BACKEND_URL = getBackendUrl();

const api = axios.create({
  baseURL: BACKEND_URL,
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
  refreshInterval: 60_000, // Refresh every 60 seconds (reduced frequency for better performance)
  revalidateOnFocus: false, // Don't revalidate on window focus
  revalidateOnReconnect: true, // Revalidate when network reconnects
  dedupingInterval: 10_000, // Dedupe requests within 10 seconds (increased for better caching)
  focusThrottleInterval: 5_000, // Throttle focus revalidation
  errorRetryInterval: 5_000, // Retry failed requests every 5 seconds
  errorRetryCount: 3, // Maximum retry attempts
  keepPreviousData: true, // Keep previous data while fetching new data (smoother UX)
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

// Helper function for fetch calls that need to use the same base URL
export const getApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (typeof window !== 'undefined') {
    // Client-side: use relative URLs to go through Next.js proxy
    return cleanPath;
  }
  // Server-side: use full backend URL
  return `${BACKEND_URL}${cleanPath}`;
};

// Helper function for fetch calls with proper credentials
export const apiFetch = (path: string, options: RequestInit = {}): Promise<Response> => {
  return fetch(getApiUrl(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
};

export { api };