import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Bell, UserCircle, RefreshCw, Home, Percent, Settings, User, LogOut, Download, Users, Briefcase, Scissors, Calendar, UserCheck } from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/AuthContext';
import { usePWAInstall } from 'react-use-pwa-install';
import { LightspeedStatus } from '../LightspeedStatus';
import { Button } from './Button';
import { ResourceSyncStatus } from '../ResourceSyncStatus';
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
import axios from 'axios';
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
  const toast = useToast();

  useEffect(() => {
    setCurrentTitle(routeTitles[router.pathname] || '');
  }, [router.pathname]);

  // Fetch all users for the modal
  useEffect(() => {
    if (showSwitchUser && allUsers.length === 0) {
      setLoadingUsers(true);
      axios.get('/api/users')
        .then(res => {
          if (Array.isArray(res.data)) {
            setAllUsers(res.data);
          } else if (res.data && typeof res.data === 'object' && Array.isArray((res.data as any).lightspeedUsers)) {
            setAllUsers((res.data as any).lightspeedUsers);
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

  const handleUserSelect = (user) => {
    // Handle user selection
  };

  return (
    <header className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 h-12 px-4 flex items-center fixed top-0 left-0 w-full z-50 shadow-sm dark:shadow-lg relative">
      {/* Left: Hamburger/Menu (empty placeholder for alignment) */}
      <div className="flex-1 flex items-center min-w-0"></div>
      {/* Center: Logo + Title, always centered */}
      <div className="absolute left-1/2 top-0 h-full flex items-center justify-center -translate-x-1/2">
        <div className="flex flex-row items-center gap-2 sm:gap-3 min-h-[2.5rem]">
          <Link href="/" className="flex items-center flex-shrink-0 min-w-[1.5rem]">
            <img src="/suitsync-logoh.png" alt="SuitSync Logo" className="h-6 sm:h-7 w-auto drop-shadow dark:drop-shadow-[0_2px_8px_rgba(255,255,255,0.7)]" />
          </Link>
          <span className="text-gray-400 dark:text-gray-600 text-base sm:text-lg mx-1 sm:mx-2 select-none">|</span>
          <h1 className="text-sm sm:text-base font-semibold truncate min-w-[2rem] flex-shrink max-w-[10rem] sm:max-w-xs text-center">{currentTitle}</h1>
        </div>
      </div>
      {/* Right: User/Menu Controls */}
      <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0 z-20 ml-auto">
        {install && (
          <Button variant="ghost" size="sm" onClick={install} className="hidden sm:flex">
            <Download size={18} className="mr-2" /> 
            Install App
          </Button>
        )}
        <LightspeedStatus />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 relative group">
              {user?.photoUrl ? (
                <div className="relative">
                  <img 
                    src={user.photoUrl} 
                    alt={user.name} 
                    className="h-6 w-6 sm:h-8 sm:w-8 rounded-full object-cover transition-opacity group-hover:opacity-80" 
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
                    className="sm:size-6 absolute inset-0 hidden" 
                    style={{ display: 'none' }}
                  />
                </div>
              ) : (
                <User size={16} className="sm:size-6" />
              )}
              {/* Online indicator - could be used for sync status */}
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-400 border border-white dark:border-gray-900 rounded-full"></div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200 dark:border-gray-700">
            <DropdownMenuLabel>
              <div className="flex items-center space-x-2">
                {user?.photoUrl ? (
                  <img 
                    src={user.photoUrl} 
                    alt={user.name} 
                    className="h-8 w-8 rounded-full object-cover" 
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                ) : (
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <User size={16} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{user?.name}</p>
                  <p className="text-xs text-gray-500 font-normal truncate">{user?.email}</p>
                </div>
              </div>
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
              <LogOut className="mr-2 h-4 w-4" />
              <span>Switch User</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <SwitchUserModal open={showSwitchUser} onClose={() => setShowSwitchUser(false)} allUsers={allUsers} onUserSelect={handleUserSelect} />
    </header>
  );
};