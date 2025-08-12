import axios from 'axios';

// Simple API client for public or app data (always through Next proxy on client)
const getBaseURL = () => (typeof window === 'undefined' ? (process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000') : '');

const simpleApi = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
});

// Simple fetcher for SWR
export const simpleFetcher = async <T = any>(url: string): Promise<T> => {
  const response = await simpleApi.get(url);
  return response.data as T;
};

export default simpleApi; 