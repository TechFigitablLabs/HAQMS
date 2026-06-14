'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, LogOut, LayoutDashboard, MonitorPlay, Shield } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  if (!user) return null;

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      active: pathname === '/dashboard',
    },
    {
      href: '/queue',
      label: 'Live Queue',
      icon: MonitorPlay,
      active: pathname === '/queue',
    },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/80 sm:px-6">
      <div className="app-shell flex items-center justify-between gap-4">
        {/* Branding */}
        <Link href="/" className="flex items-center gap-2 rounded-full pr-2 text-cyan-800 dark:text-cyan-300">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-700 text-white shadow-lg shadow-cyan-700/20">
            <Activity className="h-5 w-5" />
          </span>
          <span className="hidden text-2xl font-black sm:inline">HAQMS</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/75 p-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-black transition-all duration-200 sm:min-w-[132px] ${
                  item.active
                    ? 'bg-cyan-700 text-white shadow-lg shadow-cyan-700/20'
                    : 'text-slate-600 hover:bg-cyan-50 hover:text-cyan-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-cyan-300'
                }`}
                title={item.label}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{user.name}</span>
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xxs font-extrabold uppercase text-rose-700 dark:text-rose-300">
              <Shield className="h-3 w-3" />
              {user.role}
            </span>
          </div>

          <button
            onClick={logout}
            className="rounded-xl bg-rose-500/10 p-2 text-rose-600 transition-all duration-300 hover:bg-rose-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-300 dark:text-rose-400"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
