'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/common/Navbar';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  FileText,
  Loader2,
  Phone,
  UserRound,
} from 'lucide-react';

export default function PatientHistoryRecords() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token, loading, API_BASE_URL } = useAuth();
  const [patient, setPatient] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!token || !id) return;

    const fetchPatient = async () => {
      setFetching(true);
      setError('');

      try {
        const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Unable to load patient history.');
        }

        setPatient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setFetching(false);
      }
    };

    fetchPatient();
  }, [API_BASE_URL, id, token]);

  const stats = useMemo(() => {
    const appointments = patient?.appointments || [];
    return {
      total: appointments.length,
      pending: appointments.filter((appointment) => appointment.status === 'PENDING').length,
      completed: appointments.filter((appointment) => appointment.status === 'COMPLETED').length,
    };
  }, [patient]);

  if (loading || !user) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="app-shell px-6 py-8 sm:px-8">
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-black text-slate-600 shadow-sm transition-colors hover:border-cyan-200 hover:text-cyan-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {fetching ? (
          <div className="surface-card flex min-h-[420px] flex-col items-center justify-center p-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-700" />
            <p className="mt-4 text-sm font-bold text-slate-500">Loading patient clinical record...</p>
          </div>
        ) : error ? (
          <div className="surface-card p-8">
            <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h1 className="font-black">Could not load record</h1>
                <p className="mt-1 text-sm font-semibold">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <section className="hero-shell rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-black uppercase text-cyan-800">
                    <FileText className="h-3.5 w-3.5" />
                    Legacy Clinical Record
                  </span>
                  <h1 className="mt-5 text-3xl font-black text-slate-950 sm:text-4xl">{patient.name}</h1>
                  <div className="mt-3 flex flex-wrap gap-3 text-sm font-bold text-slate-600">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1">
                      <UserRound className="h-4 w-4 text-cyan-700" />
                      {patient.age} yrs / {patient.gender}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1">
                      <Phone className="h-4 w-4 text-rose-700" />
                      {patient.phoneNumber}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3">
                    <span className="block text-2xl font-black text-cyan-800">{stats.total}</span>
                    <span className="text-xs font-bold text-slate-500">Visits</span>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3">
                    <span className="block text-2xl font-black text-rose-700">{stats.pending}</span>
                    <span className="text-xs font-bold text-slate-500">Pending</span>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3">
                    <span className="block text-2xl font-black text-violet-700">{stats.completed}</span>
                    <span className="text-xs font-bold text-slate-500">Done</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="surface-card p-6">
                <div className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-cyan-700" />
                  <h2 className="text-lg font-black text-slate-900">Clinical Background</h2>
                </div>
                <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm font-semibold leading-7 text-slate-700">
                  {patient.medicalHistory || 'No clinical background has been recorded for this patient yet.'}
                </p>

                <div className="mt-6 border-t border-slate-200 pt-5 text-sm">
                  <div className="flex justify-between gap-4 py-2">
                    <span className="font-bold text-slate-500">Email</span>
                    <span className="text-right font-semibold text-slate-800">{patient.email || 'Not provided'}</span>
                  </div>
                  <div className="flex justify-between gap-4 py-2">
                    <span className="font-bold text-slate-500">Created</span>
                    <span className="text-right font-semibold text-slate-800">
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="surface-card p-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-rose-700" />
                  <h2 className="text-lg font-black text-slate-900">Appointment Timeline</h2>
                </div>

                {patient.appointments?.length ? (
                  <div className="mt-5 space-y-3">
                    {patient.appointments.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-black text-slate-900">
                              {appointment.reason || 'General consultation'}
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                              {new Date(appointment.appointmentDate).toLocaleString()}
                            </p>
                          </div>
                          <span className="w-fit rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-black uppercase text-cyan-800">
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
                    No appointments found for this patient.
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
