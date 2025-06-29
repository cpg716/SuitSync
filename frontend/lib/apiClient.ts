import axios from 'axios';
import type { LightspeedHealth } from '../components/LightspeedStatus';

const api = axios.create({
  baseURL: '/api',
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
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired, redirect to login (no console log)
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        window.location.href = '/login?sessionExpired=true';
      }
      // Suppress AxiosError logging for 401
      return Promise.reject(error);
    }
    // For other errors, you may still want to log or handle as needed
    // Optionally, add custom logging here for non-401 errors
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
  shouldRetryOnError: false, // Don't retry on error
  errorRetryCount: 2, // Only retry twice
};

export const getSyncStatus = async () => {
  const { data } = await api.get('/sync/status');
  return data;
};

export const triggerSync = async (resource: string) => {
  const { data } = await api.post(`/sync/trigger/${resource}`);
  return data;
};

export const resetSyncStatus = () => {
  return api.post('/sync/reset-status');
};

export const getLightspeedHealth = async (): Promise<LightspeedHealth> => {
  const { data } = await api.get('/lightspeed/health');
  return data as LightspeedHealth;
};

export { api };