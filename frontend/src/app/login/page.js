'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  User,
  Lock,
  Activity,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  ClipboardCheck,
} from 'lucide-react';

export default function Login() {
  const { login, error: authError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  const demoAccounts = [
    {
      label: 'Admin',
      email: 'admin@haqms.com',
      icon: ShieldCheck,
      tone: 'text-rose-700 bg-rose-50 border-rose-100',
    },
    {
      label: 'Receptionist',
      email: 'reception1@haqms.com',
      icon: ClipboardCheck,
      tone: 'text-cyan-700 bg-cyan-50 border-cyan-100',
    },
    {
      label: 'Doctor',
      email: 'doctor1@haqms.com',
      icon: Stethoscope,
      tone: 'text-violet-700 bg-violet-50 border-violet-100',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    const emailRegex = /^[^\s@]+@[^\s@]+$/;
    if (!email) {
      setValidationError('Please enter your email address.');
      return;
    }

    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email format.');
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setValidationError(result.error || 'Invalid credentials');
    }
  };

  const fillDemo = (accountEmail) => {
    setEmail(accountEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen px-6 py-8 lg:px-8">
      <div className="app-shell grid min-h-[calc(100vh-4rem)] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3 text-cyan-800">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-700 text-white shadow-lg shadow-cyan-700/20">
              <Activity className="h-6 w-6" />
            </span>
            <span className="text-3xl font-black">HAQMS</span>
          </Link>

          <h1 className="font-display mt-12 max-w-2xl text-5xl font-black leading-tight text-slate-950">
            One sign-in for every hospital operations workflow.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Move from reception check-ins to doctor queues and admin reviews with a clear role-based console.
          </p>

          <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
            {demoAccounts.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => fillDemo(account.email)}
                  className="role-cta p-4 text-left"
                >
                  <div className={`w-fit rounded-lg border p-2 ${account.tone}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="mt-4 block text-sm font-black text-slate-900">{account.label}</span>
                  <span className="mt-1 block break-all text-xs font-semibold text-slate-500">{account.email}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-3xl font-black text-cyan-800">
              <Activity className="h-8 w-8" />
              HAQMS
            </Link>
          </div>

          <div className="surface-card p-6 sm:p-8">
            <div>
              <span className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-black uppercase text-cyan-800">
                Staff access
              </span>
              <h2 className="mt-5 text-3xl font-black text-slate-900">Welcome back</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sign in with your seeded account or select a role from the quick access panel.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {(validationError || authError) && (
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">
                  {validationError || authError}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                  Email Address
                </label>
                <div className="relative mt-2">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email"
                    name="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-10 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10"
                    placeholder="admin@haqms.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                  Password
                </label>
                <div className="relative mt-2">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-xl border border-slate-200 bg-white px-10 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10"
                    placeholder="password123"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="cta-primary w-full justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-8 border-t border-slate-200 pt-6 lg:hidden">
              <h4 className="mb-3 text-xs font-black uppercase text-slate-400">Quick demo login</h4>
              <div className="grid gap-2 text-xs">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => fillDemo(account.email)}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-left font-semibold text-slate-600 transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-800"
                  >
                    <strong>{account.label}:</strong> {account.email}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
