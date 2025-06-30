import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Skeleton } from '../components/ui/Skeleton';

export default function SettingsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to admin page which contains the settings
    router.replace('/admin');
  }, [router]);

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
