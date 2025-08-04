// frontend/components/Layout.tsx
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { Home, Users, Calendar, Scissors, Printer, BarChart, Settings, Sun, Moon, Menu, ListChecks, ListTodo, BookOpen, Target, Clock } from 'lucide-react';
import { useState, useEffect, ReactNode } from 'react';
import { Appbar } from './ui/Appbar';
import ThemeToggle from './ThemeToggle';

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const nav = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/parties', label: 'Parties', icon: Users },
  { href: '/appointments', label: 'Appointments', icon: Calendar },
  { href: '/alterations', label: 'Alterations', icon: Scissors },
  { href: '/sales', label: 'Sales', icon: BarChart },
  { href: '/checklists', label: 'Checklists', icon: ListChecks },
  { href: '/admin', label: 'Settings', icon: Settings },
];

export default function Layout({ children, title }: LayoutProps) {
  const isClient = typeof window !== 'undefined';
  const router = isClient ? useRouter() : null;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [router?.pathname]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false); // Close mobile sidebar when resizing to desktop
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col min-h-screen-safe bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="fixed top-0 left-0 w-full z-50">
        <Appbar />
      </div>
      <div className="flex flex-1 flex-row pt-12 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
        {/* Mobile toggle - improved positioning and touch-friendly */}
        <button
          className="lg:hidden fixed top-3 left-3 z-50 p-3 rounded-lg bg-blue-600 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-blue-700 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Open sidebar"
        >
          <Menu size={20} />
        </button>
        
        {/* Sidebar - improved responsive behavior */}
        <aside
          className={`
            z-40 fixed top-12 left-0 h-[calc(100vh-3rem)]
            bg-gray-100 dark:bg-gray-800 text-neutral-900 dark:text-neutral-100 shadow-lg
            transition-all duration-300 ease-in-out
            flex flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
            ${collapsed ? 'w-16' : 'w-48'}
            max-w-[80vw] lg:max-w-none
          `}
        >
          {/* Collapse/Expand button (desktop only) */}
          <button
            className="hidden lg:flex items-center justify-center w-8 h-8 absolute top-4 right-[-16px] bg-accent text-white border-2 border-accent rounded-full shadow-md transition-all hover:scale-110 hover:shadow-lg"
            style={{ zIndex: 60 }}
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className={`transform transition-transform duration-200 ${collapsed ? 'rotate-180' : ''} text-white font-bold`}>{'<'}</span>
          </button>
          
          {/* Navigation */}
          <nav className="space-y-1 flex-1 px-2 py-4">
            {nav.map(item => {
              const Icon = item.icon;
              const isActive = router?.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-lg font-medium text-sm
                    text-gray-700 dark:text-gray-300
                    hover:bg-blue-100 dark:hover:bg-blue-900/50
                    transition-all duration-200 active:scale-95
                    min-h-[44px] touch-manipulation
                    ${isActive ? 'bg-blue-100 dark:bg-blue-900/70 font-bold text-blue-600 dark:text-blue-400' : ''}
                    ${collapsed ? 'justify-center' : ''}
                  `}
                >
                  <Icon size={20} className="flex-shrink-0" />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
          
          {/* Footer */}
          <div className={`mt-auto p-4 border-t border-gray-200 dark:border-gray-700 ${collapsed ? 'flex flex-col items-center space-y-2' : 'space-y-3'}`}>
            <div className="flex items-center justify-center">
              <Image
                src="/riverside-logo-icon.jpg"
                alt="Riverside Icon"
                width={64}
                height={64}
                style={{ width: 64, height: 64 }}
              />
            </div>
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} w-full`}>
              {!collapsed && <span className="text-xs text-gray-500 dark:text-gray-400">Theme</span>}
              <ThemeToggle />
            </div>
          </div>
        </aside>
        
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 lg:hidden z-30 transition-opacity duration-300" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}
        
        {/* Main content - improved responsive margins */}
        <main
          className={`
            flex-1 min-w-0 transition-all duration-300 ease-in-out
            bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
            ${collapsed ? 'lg:ml-16' : 'lg:ml-48'}
            ${sidebarOpen ? 'lg:blur-none' : ''}
          `}
        >
          <div className="container mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 max-w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
            <div className="w-full overflow-hidden">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
