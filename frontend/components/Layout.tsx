// frontend/components/Layout.tsx
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Home, Users, Calendar, Scissors, Printer, BarChart, Settings, Sun, Moon, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

const nav = [
  { href: '/', label: 'Dashboard', icon: <Home size={20} /> },
  { href: '/parties', label: 'Parties', icon: <Users size={20} /> },
  { href: '/calendar', label: 'Appointments', icon: <Calendar size={20} /> },
  { href: '/alterations', label: 'Alterations', icon: <Scissors size={20} /> },
  { href: '/tag', label: 'Tag Printing', icon: <Printer size={20} /> },
  { href: '/commission', label: 'Commissions', icon: <BarChart size={20} /> },
  { href: '/admin', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') setDark(true);
  }, []);
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);
  return (
    <div className="flex min-h-screen h-full w-full bg-background-light dark:bg-background-dark">
      {/* Mobile Hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded bg-primary text-white focus:outline-none"
        onClick={() => setSidebarOpen(o => !o)}
        aria-label="Open sidebar"
      >
        <Menu size={24} />
      </button>
      {/* Sidebar */}
      <aside
        className={`z-40 top-0 left-0 h-full bg-primary text-white dark:bg-neutral-900 flex flex-col transition-transform duration-200 fixed md:static md:w-64 w-64 flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : 'md:translate-x-0 -translate-x-full'}`}
        style={{ touchAction: 'manipulation' }}
      >
        <div className="h-16 flex items-center justify-center font-bold text-xl tracking-wide border-b border-primary-light dark:border-neutral-700 select-none">SuitSync</div>
        <nav className="flex-1 py-4 space-y-1">
          {nav.map(item => (
            <Link key={item.href} href={item.href} passHref legacyBehavior>
              <a
                className={`flex items-center gap-3 px-6 py-3 rounded-l-2xl transition-colors font-medium text-base hover:bg-primary-light dark:hover:bg-neutral-700 ${router.pathname === item.href ? 'bg-primary-light dark:bg-neutral-700' : ''}`}
                style={{ minHeight: 48, touchAction: 'manipulation' }}
                onClick={() => setSidebarOpen(false)}
              >
                {item.icon}{item.label}
              </a>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-primary-light dark:border-neutral-700 flex items-center justify-between">
          <span className="text-sm">Theme</span>
          <button className="ml-2 p-2 rounded bg-white/10 hover:bg-white/20" onClick={() => setDark(d => !d)}>
            {dark ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </aside>
      {/* Overlay for mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Main content */}
      <main className="flex-1 w-full h-full bg-background-light dark:bg-background-dark overflow-y-auto overflow-x-auto px-6 py-6 md:ml-0 ml-0" style={{ minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
