// frontend/components/Layout.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Users, Calendar, Scissors, Printer, BarChart, Settings, Sun, Moon, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import Appbar from './ui/Appbar';
import ThemeToggle from './ThemeToggle';

const nav = [
  { href: '/', label: 'Dashboard', icon: <Home size={20} /> },
  { href: '/parties', label: 'Parties', icon: <Users size={20} /> },
  { href: '/appointments', label: 'Appointments', icon: <Calendar size={20} /> },
  { href: '/alterations', label: 'Alterations', icon: <Scissors size={20} /> },
  { href: '/sales', label: 'Sales', icon: <BarChart size={20} /> },
  { href: '/admin', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Layout({ children, title }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="fixed top-0 left-0 w-full z-50">
        <Appbar />
      </div>
      <div className="flex flex-1 flex-row pt-16 md:pt-16">
        {/* Mobile toggle */}
        <button
          className="md:hidden fixed top-4 left-4 z-50 p-2 rounded bg-blue-600 text-white"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Open sidebar"
        >
          <Menu size={24} />
        </button>
        {/* Sidebar */}
        <aside
          className={`
            z-40 fixed top-16 left-0 h-[calc(100vh-4rem)]
            bg-gray-100 dark:bg-gray-800 text-neutral-900 dark:text-neutral-100 shadow-sm
            transition-all duration-200
            flex flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
            ${collapsed ? 'w-16' : 'w-48'}
          `}
          style={{ minWidth: collapsed ? '4rem' : '12rem' }}
        >
          {/* Collapse/Expand button (desktop only) */}
          <button
            className="hidden md:flex items-center justify-center w-8 h-8 absolute top-4 right-[-16px] bg-accent text-white border-2 border-accent rounded-full shadow transition-transform hover:scale-110"
            style={{ zIndex: 60 }}
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className={`transform transition-transform ${collapsed ? 'rotate-180' : ''} text-white`}>{'<'}</span>
          </button>
          <nav className="space-y-1 flex-1">
            {nav.map(item => (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-l-2xl font-medium text-base text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900 transition${router.pathname === item.href ? ' bg-blue-100 dark:bg-blue-900 font-bold' : ''}`}>
                {item.icon}
                {!collapsed && <span className="ml-2">{item.label}</span>}
              </Link>
            ))}
          </nav>
          <div className={`mt-auto p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
            {!collapsed && <img src="/riverside-logo-icon.jpg" alt="Riverside Icon" className="h-8 w-auto mb-2" />}
            <div className="flex items-center w-full justify-between">
              {!collapsed && <span className="text-sm">Theme</span>}
              <ThemeToggle />
            </div>
          </div>
        </aside>
        {/* Mobile overlay */}
        {sidebarOpen && <div className="fixed inset-0 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />}
        {/* Main content */}
        <main
          className={`flex-1 p-6 overflow-auto transition-all duration-200
            md:ml-0
            ${sidebarOpen ? 'blur-sm pointer-events-none select-none' : ''}
            ${collapsed ? 'md:ml-16' : 'md:ml-48'}
          `}
        >
          <div className="mt-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
