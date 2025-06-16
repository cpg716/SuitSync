// frontend/pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../src/AuthContext';
import { ToastProvider } from '../components/ToastContext';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }: AppProps) {
  // Support per-page layout: if a page exports getLayout, use it; otherwise, wrap in Layout
  const getLayout = (Component as any).getLayout || ((page: React.ReactNode) => <Layout>{page}</Layout>);
  return (
    <AuthProvider>
      <ToastProvider>
        {getLayout(<Component {...pageProps} />)}
      </ToastProvider>
    </AuthProvider>
  );
}