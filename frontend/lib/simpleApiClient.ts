import axios from 'axios';

// Simple API client for public or app data (always through Next proxy on client)
const getBaseURL = () => (process.env.NEXT_PUBLIC_BACKEND_URL || '');

const simpleApi = axios.create({
  baseURL: '',
  withCredentials: true,
});

// Simple fetcher for SWR
export const simpleFetcher = async <T = any>(url: string): Promise<T> => {
  const response = await simpleApi.get(url);
  return response.data as T;
};

export default simpleApi; 