'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, Eye, EyeOff, ArrowRight, Mail, Lock, User } from 'lucide-react';

export default function Signup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  const roleOptions = [
    { value: 'RECEPTIONIST', label: 'Receptionist' },
    { value: 'DOCTOR', label: 'Doctor' },
    { value: 'ADMIN', label: 'Administrator' },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Full name is required');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email address is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setFormData({ name: '', email: '', password: '', role: 'RECEPTIONIST' });
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError('Failed to connect to server. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-8 lg:px-8">
      <div className="app-shell grid min-h-[calc(100vh-4rem)] items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left Section */}
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex items-center gap-3 text-cyan-800">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-700 text-white shadow-lg shadow-cyan-700/20">
              <Activity className="h-6 w-6" />
            </span>
            <span className="text-3xl font-black">HAQMS</span>
          </Link>

          <h1 className="font-display mt-12 max-w-2xl text-5xl font-black leading-tight text-slate-950">
            Join the hospital operations revolution.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
            Create your staff account to access the dashboard for patient management, appointment booking, and queue operations.
          </p>

          <div className="mt-10">
            <h3 className="text-sm font-black uppercase text-slate-500">Supported Roles</h3>
            <ul className="mt-4 space-y-3 text-sm font-semibold text-slate-600">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-600" />
                Receptionist - Patient intake and queue management
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-violet-600" />
                Doctor - Appointments and patient consultations
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-600" />
                Administrator - System audits and physician registry
              </li>
            </ul>
          </div>
        </section>

        {/* Right Section - Form */}
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
                New Staff Account
              </span>
              <h2 className="mt-5 text-3xl font-black text-slate-900">Create Account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Register as a new staff member to access HAQMS.
              </p>
            </div>

            {success ? (
              <div className="mt-8 rounded-xl border border-teal-500/20 bg-teal-500/10 p-4 text-center">
                <div className="mb-3 text-4xl">✓</div>
                <p className="font-bold text-teal-700">Account created successfully!</p>
                <p className="mt-2 text-sm text-teal-600">Redirecting to login...</p>
              </div>
            ) : (
              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-600">
                    {error}
                  </div>
                )}

                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-bold text-slate-700">
                    Full Name
                  </label>
                  <div className="relative mt-2">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={loading}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-10 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10 disabled:opacity-50"
                      placeholder="Sarah Connor"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-bold text-slate-700">
                    Email Address
                  </label>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={loading}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-10 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10 disabled:opacity-50"
                      placeholder="sarah@hospital.com"
                    />
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-bold text-slate-700">
                    Staff Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    disabled={loading}
                    className="mt-2 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10 disabled:opacity-50"
                  >
                    {roleOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Password */}
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
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      className="block w-full rounded-xl border border-slate-200 bg-white px-10 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/10 disabled:opacity-50"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    At least 6 characters recommended
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="glow-btn mt-6 w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-700 px-6 py-3.5 font-black text-white shadow-lg shadow-cyan-700/20 transition-all hover:bg-cyan-800 disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                  {!loading && <ArrowRight className="h-5 w-5" />}
                </button>

                {/* Login Link */}
                <div className="text-center">
                  <p className="text-sm text-slate-600">
                    Already have an account?{' '}
                    <Link href="/login" className="font-bold text-cyan-700 hover:text-cyan-800 transition-colors">
                      Sign In
                    </Link>
                  </p>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
