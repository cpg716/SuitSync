import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/AuthContext';
import { Skeleton } from '../components/ui/Skeleton';

export default function SettingsRedirect() {
  const isClient = typeof window !== 'undefined';
  const router = isClient ? useRouter() : null;
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin') {
      router.replace('/admin');
    } else {
      router.replace('/UserSettings');
    }
  }, [router, user, loading]);

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Redirecting to settings...</p>
        </div>
      </div>
    </div>
  );
}
