// frontend/pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider, useAuth } from '../src/AuthContext';
import { ToastProvider } from '../components/ToastContext';
import Layout from '../components/Layout';
import PWAInstallPrompt from '../components/ui/PWAInstallPrompt';
import { useEffect, useState } from 'react';
import { SplashScreen } from '../components/ui/SplashScreen';
import { useRouter } from 'next/router';
import { SWRConfig } from 'swr';
import { swrConfig } from '../lib/apiClient';
import { AdminSettingsProvider } from '../src/AdminSettingsContext';
import ErrorBoundary from '../components/ErrorBoundary';

function InnerApp({ Component, pageProps }: AppProps) {
  // Support per-page layout: if a page exports getLayout, use it; otherwise, wrap in Layout
  const router = useRouter();
  let getLayout;
  if (router.pathname === '/login') {
    // Force minimal layout for login page
    getLayout = (page: React.ReactNode) => page;
  } else {
    getLayout = (Component as any).getLayout || ((page: React.ReactNode, props: any) => <Layout title={props.title || (Component as any).title}>{page}</Layout>);
  }

  const [showSplash, setShowSplash] = useState(true);
  const { authError, user, loading } = useAuth();
  const [health, setHealth] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('Service worker registered:', reg))
          .catch(err => console.warn('Service worker registration failed:', err));
      });
    }
  }, []);

  useEffect(() => {
    fetch('/api/health').then(res => res.json()).then(setHealth).catch(() => setHealth({ status: 'error' }));
  }, []);

  useEffect(() => {
    // If not loading, not on /login or /status, and not authenticated, redirect to /login
    if (!loading && !user && !['/login', '/status'].includes(router.pathname)) {
      // Use a timeout to prevent race conditions with route changes
      const timeoutId = setTimeout(() => {
        router.replace('/login?reason=auth_required');
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [user, loading, router]);

  // Show splash or loading spinner while checking auth
  if ((showSplash || (loading && !user && router.pathname !== '/login'))) {
    return (
      <ToastProvider>
        <PWAInstallPrompt />
        <SplashScreen />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <PWAInstallPrompt />
      {health && health.status !== 'ok' && (
        <div className="bg-yellow-500 text-black text-center py-2 z-50 fixed top-0 left-0 w-full">
          Backend health: {health.status} | DB: {typeof health?.db === 'object' ? JSON.stringify(health.db) : health?.db} | Session: {typeof health?.session === 'object' ? JSON.stringify(health.session) : health?.session}
        </div>
      )}
      {authError && (
        <div className="bg-red-600 text-white text-center py-2 z-50 fixed top-0 left-0 w-full">
          {authError}
        </div>
      )}
      <div className={showSplash ? 'pointer-events-none blur-sm select-none' : authError || (health && health.status !== 'ok') ? 'pt-10' : ''}>
        {getLayout(<Component {...pageProps} />, pageProps)}
      </div>
    </ToastProvider>
  );
}

export default function App(props: AppProps) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AdminSettingsProvider>
            <SWRConfig value={swrConfig}>
              <InnerApp {...props} />
            </SWRConfig>
          </AdminSettingsProvider>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}