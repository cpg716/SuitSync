import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../src/AuthContext';

export default function Logout() {
  const { logout } = useAuth();
  const isClient = typeof window !== 'undefined';
  const router = isClient ? useRouter() : null;

  useEffect(() => {
    const performLogout = async () => {
      try {
        await logout();
        // Small delay to ensure logout is processed
        setTimeout(() => {
          router.replace('/login?reason=logged_out');
        }, 100);
      } catch (error) {
        console.error('Logout error:', error);
        // Still redirect to login even if logout fails
        setTimeout(() => {
          router.replace('/login?reason=logout_error');
        }, 100);
      }
    };

    performLogout();
  }, [logout, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Logging out...</p>
      </div>
    </div>
  );
}

// Use minimal layout for logout page
Logout.getLayout = (page: React.ReactNode) => page;
