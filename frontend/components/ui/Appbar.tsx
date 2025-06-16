import React from 'react';
import Link from 'next/link';
import { Bell, UserCircle } from 'lucide-react';
import PushSubscribeButton from './PushSubscribeButton';

interface AppbarProps {
  title?: string;
}

const Appbar: React.FC<AppbarProps> = ({ title }) => {
  return (
    <header className="w-full h-16 flex items-center justify-between px-4 md:px-8 bg-white/80 dark:bg-gray-900/80 shadow-sm border-b border-gray-200 dark:border-gray-800 backdrop-blur z-30">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2">
          <img src="/suitsync-logoh.png" alt="SuitSync Logo" className="h-10 w-auto" />
        </Link>
        {title && <span className="ml-4 text-lg font-semibold text-gray-700 dark:text-gray-200 hidden sm:inline">{title}</span>}
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition">
          <Bell size={20} />
          {/* Notification badge example */}
          {/* <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" /> */}
        </button>
        <PushSubscribeButton />
        <button className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition">
          <UserCircle size={22} />
          <span className="hidden md:inline text-sm font-medium">Account</span>
        </button>
      </div>
    </header>
  );
};

export default Appbar; 