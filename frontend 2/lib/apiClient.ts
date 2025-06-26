import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
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
    // We will let the useAuth hook and individual components handle errors.
    // The global interceptor was causing redirect loops.
    return Promise.reject(error);
  }
);

export const fetcher = (url: string) => api.get(url).then(res => res.data);

export const swrConfig = {
  // Global SWR configuration
  refreshInterval: 30_000, // Refresh every 30 seconds
  revalidateOnFocus: false, // Don't revalidate on window focus
  dedupingInterval: 5_000, // Dedupe requests within 5 seconds
  shouldRetryOnError: false, // Don't retry on error
  errorRetryCount: 2, // Only retry twice
};

export { api }; 