import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Bell, UserCircle, RefreshCw, Home, Percent, Settings, User, LogOut, Download, Users, Briefcase, Scissors, Calendar, UserCheck } from 'lucide-react';
import { useRouter } from 'next/router';
import { useAuth } from '../../src/AuthContext';
import { usePWAInstall } from 'react-use-pwa-install';
import { SyncStatus } from './SyncStatus';
import { Button } from './Button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

const routeTitles = {
  '/': 'Dashboard',
  '/parties': 'Parties',
  '/appointments': 'Appointments',
  '/alterations': 'Alterations',
  '/commission': 'Commissions',
  '/admin': 'Settings',
};

const Appbar: React.FC = () => {
  const router = useRouter();
  const title = routeTitles[router.pathname] || '';
  const { user, loading, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const install = usePWAInstall();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  if (loading) return (
    <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex justify-between items-center">
      <h1 className="text-xl font-semibold">Loading...</h1>
    </div>
  );

  const currentItem = Object.keys(routeTitles).find(path => router.pathname === path || (path !== '/' && router.pathname.startsWith(path)));
  const currentTitle = currentItem ? routeTitles[currentItem] : 'Dashboard';

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center space-x-4">
        <Link href="/" className="flex items-center space-x-2">
          <img src="/suitsync-logov.png" alt="SuitSync Logo" className="h-8 w-8" />
          <span className="font-semibold text-lg">SuitSync</span>
        </Link>
        <span className="text-gray-400 dark:text-gray-600">|</span>
        <h1 className="text-xl font-semibold">{currentTitle}</h1>
      </div>

      <div className="flex items-center space-x-4">
        {install && <Button variant="ghost" size="sm" onClick={install}><Download size={18} className="mr-2" /> Install App</Button>}
        <SyncStatus />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              {user?.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="h-8 w-8 rounded-full" />
              ) : (
                <User size={20} />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-semibold">{user?.name}</p>
              <p className="text-xs text-gray-500 font-normal">{user?.email}</p>
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
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Appbar;