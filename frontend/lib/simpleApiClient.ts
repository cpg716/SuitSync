import axios from 'axios';

// Simple API client without authentication
const simpleApi = axios.create({
  baseURL: 'http://localhost:3000',
  withCredentials: false, // No credentials needed
});

// Simple fetcher for SWR
export const simpleFetcher = async <T = any>(url: string): Promise<T> => {
  const response = await simpleApi.get(url);
  return response.data as T;
};

export default simpleApi; 