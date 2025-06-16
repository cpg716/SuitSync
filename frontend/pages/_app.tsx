// frontend/pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../src/AuthContext';
import { ToastProvider } from '../components/ToastContext';
import Layout from '../components/Layout';
import PWAInstallPrompt from '../components/ui/PWAInstallPrompt';
import { useEffect, useState } from 'react';
import SplashScreen from '../components/ui/SplashScreen';

export default function App({ Component, pageProps }: AppProps) {
  // Support per-page layout: if a page exports getLayout, use it; otherwise, wrap in Layout
  const getLayout = (Component as any).getLayout || ((page: React.ReactNode, props: any) => <Layout title={props.title || (Component as any).title}>{page}</Layout>);

  const [showSplash, setShowSplash] = useState(true);
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

  return (
    <AuthProvider>
      <ToastProvider>
        <PWAInstallPrompt />
        {showSplash && <SplashScreen />}
        <div className={showSplash ? 'pointer-events-none blur-sm select-none' : ''}>
          {getLayout(<Component {...pageProps} />, pageProps)}
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}