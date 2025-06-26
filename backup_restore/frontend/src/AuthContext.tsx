import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import useSWR from 'swr';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  login: async () => {},
  logout: async () => {},
  authError: null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authError, setAuthError] = useState<string | null>(null);
  const fetcher = async (url: string) => {
    try {
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) {
        setAuthError('Not authenticated or backend unavailable');
        return null;
      }
      setAuthError(null);
      return await res.json();
    } catch (e) {
      setAuthError('Backend unavailable');
      return null;
    }
  };
  const { data: user, mutate, isLoading } = useSWR<User | null>('/api/auth/session', fetcher);
  async function login(email: string, password: string) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setAuthError('Invalid credentials');
        throw new Error('Invalid credentials');
      }
      setAuthError(null);
      await mutate();
    } catch (e) {
      setAuthError('Backend unavailable');
      throw e;
    }
  }
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    await mutate(null);
  }
  return (
    <AuthContext.Provider value={{ user, loading: isLoading, login, logout, authError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
} 