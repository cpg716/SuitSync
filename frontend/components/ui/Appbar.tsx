import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, UserCircle, RefreshCw, Home, Percent, Settings, User, LogOut, Download, Users, Briefcase, Scissors, Calendar, UserCheck, Clock, X } from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/AuthContext';
import { usePWAInstall } from 'react-use-pwa-install';
import { LightspeedStatus } from '../LightspeedStatus';
import { Button } from './Button';
import { ResourceSyncStatus } from '../ResourceSyncStatus';
import { UserAvatar } from './UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import ThemeToggle from '../ThemeToggle';
import { SwitchUserModal } from './SwitchUserModal';
import { api } from '../../lib/apiClient';
import { useToast } from '../ToastContext';

const routeTitles = {
  '/': 'Dashboard',
  '/customers': 'Customers',
  '/parties': 'Parties',
  '/appointments': 'Appointments',
  '/alterations': 'Alterations',
  '/sales': 'Sales',
  '/commission': 'Commissions',
  '/admin': 'Settings',
};

export const Appbar: React.FC = () => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [currentTitle, setCurrentTitle] = useState('');
  const install = usePWAInstall();
  const [showSwitchUser, setShowSwitchUser] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<any>(null);
  const [cachedUsersCount, setCachedUsersCount] = useState(0);
  const toast = useToast();

  useEffect(() => {
    setCurrentTitle(routeTitles[router.pathname] || '');
  }, [router.pathname]);

  // Fetch all users for the modal
  useEffect(() => {
    if (showSwitchUser && allUsers.length === 0) {
      setLoadingUsers(true);
      api.get('/api/users')
        .then(res => {
          if (Array.isArray(res.data)) {
            setAllUsers(res.data);
          } else if (res.data && typeof res.data === 'object') {
            // Use the combined users array that includes both local and Lightspeed-only users
            const allUsers = (res.data as any).users || [...((res.data as any).localUsers || []), ...((res.data as any).lightspeedUsers || [])];
            setAllUsers(allUsers);
          } else {
            setAllUsers([]);
          }
        })
        .catch(err => {
          if (err.response && err.response.status === 401) {
            toast.error('You must be logged in to view users.');
            window.location.href = '/login';
          } else if (err.response && err.response.status === 404) {
            toast.error('User list is unavailable.');
          } else {
            toast.error('Failed to fetch users.');
          }
          setAllUsers([]);
        })
        .then(() => setLoadingUsers(false));
    }
  }, [showSwitchUser, allUsers.length]);

  // Load session status
  useEffect(() => {
    const loadSessionStatus = async () => {
      try {
        const response = await api.get('/api/user-switch/session-status');
        if (response.data && (response.data as any).success) {
          setSessionStatus(response.data);
          setCachedUsersCount((response.data as any).totalCached || 0);
        }
      } catch (error) {
        // Only log non-401 errors (401 is expected when not authenticated)
        if (error.response?.status !== 401) {
          console.error('Error loading session status:', error);
        }
      }
    };

    // Only load session status if user is authenticated
    if (user) {
      loadSessionStatus();
      // Refresh session status every 30 seconds
      const interval = setInterval(loadSessionStatus, 30000);
      return () => clearInterval(interval);
    } else {
      // Clear session status when not authenticated
      setSessionStatus(null);
      setCachedUsersCount(0);
    }
  }, [user]);

  const handleUserSelect = (user) => {
    // Handle user selection - reload session status
    setTimeout(() => {
      window.location.reload();
    }, 100);
  };

  const handleClearAllSessions = async () => {
    if (confirm('Are you sure you want to clear all cached user sessions? This will log out all users.')) {
      try {
        await api.delete('/api/user-switch/cached-users');
        toast.success('All user sessions cleared');
        setSessionStatus(null);
        setCachedUsersCount(0);
        // Redirect to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      } catch (error) {
        console.error('Error clearing sessions:', error);
        toast.error('Failed to clear sessions');
      }
    }
  };

  return (
    <header className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 h-12 px-3 sm:px-4 flex items-center fixed top-0 left-0 w-full z-50 shadow-sm dark:shadow-lg relative">
      {/* Left: Hamburger/Menu (empty placeholder for alignment) */}
      <div className="flex-1 flex items-center min-w-0"></div>
      {/* Center: Logo + Title, always centered */}
      <div className="absolute left-1/2 top-0 h-full flex items-center justify-center -translate-x-1/2">
        <div className="flex flex-row items-center gap-1 sm:gap-2 md:gap-3 min-h-[2.5rem]">
          <Link href="/" className="flex items-center flex-shrink-0 min-w-[1.5rem]">
            <Image
              src="/suitsync-logoh.png"
              alt="SuitSync Logo"
              width={120}
              height={28}
              style={{ width: 'auto', height: 'auto' }}
              className="h-5 sm:h-6 md:h-7 w-auto max-w-[80px] sm:max-w-[100px] md:max-w-[120px] drop-shadow dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.7)]"
              priority
            />
          </Link>
          <span className="text-gray-400 dark:text-gray-600 text-sm sm:text-base md:text-lg mx-0.5 sm:mx-1 md:mx-2 select-none">|</span>
          <h1 className="text-xs sm:text-sm md:text-base font-semibold truncate min-w-[2rem] flex-shrink max-w-[6rem] sm:max-w-[8rem] md:max-w-xs text-center">{currentTitle}</h1>
        </div>
      </div>
      {/* Right: User/Menu Controls */}
      <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 flex-shrink-0 z-20 ml-auto">
        {install && (
          <Button variant="ghost" size="sm" onClick={install} className="hidden md:flex text-xs sm:text-sm">
            <Download size={16} className="mr-1 sm:mr-2" />
            <span className="hidden lg:inline">Install App</span>
            <span className="lg:hidden">Install</span>
          </Button>
        )}
        <LightspeedStatus />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 relative group min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] md:min-h-[40px] md:min-w-[40px] touch-manipulation">
              {user?.photoUrl ? (
                <div className="relative">
                  <img
                    src={user.photoUrl}
                    alt={user.name}
                    className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 rounded-full object-cover transition-opacity group-hover:opacity-80"
                    onError={(e) => {
                      console.error('Failed to load user photo:', user.photoUrl);
                      // Fallback to user icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement;
                      if (sibling) sibling.style.display = 'block';
                    }}
                    onLoad={() => {
                      console.log('Successfully loaded user photo:', user.photoUrl);
                    }}
                    crossOrigin="anonymous"
                  />
                  <User
                    size={16}
                    className="sm:size-5 md:size-6 absolute inset-0 hidden"
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <User size={16} className="sm:size-5 md:size-6" />
              )}
              {/* Session status indicator */}
              <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 border border-white dark:border-gray-900 rounded-full ${
                cachedUsersCount > 1
                  ? 'bg-blue-400' // Multiple users cached
                  : 'bg-green-400' // Single user
              }`}></div>
              {cachedUsersCount > 1 && (
                <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {cachedUsersCount}
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200 dark:border-gray-700">
            <DropdownMenuLabel>
              <UserAvatar
                user={{
                  id: user?.id || '',
                  name: user?.name || 'User',
                  email: user?.email || '',
                  photoUrl: user?.photoUrl
                }}
                size="sm"
                showName={true}
                showEmail={true}
                className="mb-1"
              />
              {cachedUsersCount > 1 && (
                <div className="flex items-center gap-1 mt-2">
                  <Clock size={10} className="text-green-600" />
                  <span className="text-xs text-green-600 font-medium">
                    {cachedUsersCount} users cached
                  </span>
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>My Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/admin')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Admin Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowSwitchUser(true)}>
              <Users className="mr-2 h-4 w-4" />
              <span>Switch User</span>
              {cachedUsersCount > 1 && (
                <span className="ml-auto text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                  {cachedUsersCount}
                </span>
              )}
            </DropdownMenuItem>
            {cachedUsersCount > 1 && (
              <DropdownMenuItem onClick={handleClearAllSessions} className="text-red-600 hover:text-red-700">
                <X className="mr-2 h-4 w-4" />
                <span>Clear All Sessions</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/logout')}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SwitchUserModal open={showSwitchUser} onClose={() => setShowSwitchUser(false)} allUsers={allUsers} onUserSelect={handleUserSelect} />
    </header>
  );
};