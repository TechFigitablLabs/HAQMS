'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  User,
  AlertCircle,
} from 'lucide-react';

export default function HistoryRecordsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token, API_BASE_URL, loading: authLoading } = useAuth();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !token || !id) return;

    const fetchPatient = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Patient not found.');
          }
          throw new Error('Failed to load clinical records.');
        }
        const data = await res.json();
        setPatient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatient();
  }, [user, token, id, API_BASE_URL]);

  if (authLoading || (!user && !authLoading)) {
    return null;
  }

  const appointments = patient?.appointments ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 hover:underline mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="glass p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 mb-8">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-teal-600" />
            Diagnostic Reports &amp; Clinical History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Legacy patient record view — visit and appointment history
          </p>
        </div>

        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-center py-12 text-slate-400 animate-pulse text-sm">
            Loading clinical records...
          </p>
        ) : patient ? (
          <div className="space-y-8">
            <section className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-teal-600" />
                Patient Demographics
              </h2>
              <dl className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-400 font-bold uppercase text-xs tracking-wider">Name</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-100 mt-1">{patient.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-bold uppercase text-xs tracking-wider">Age / Gender</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-100 mt-1">
                    {patient.age} · {patient.gender}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-bold uppercase text-xs tracking-wider">Phone</dt>
                  <dd className="font-semibold text-slate-800 dark:text-slate-100 mt-1">{patient.phoneNumber}</dd>
                </div>
                {patient.email && (
                  <div>
                    <dt className="text-slate-400 font-bold uppercase text-xs tracking-wider">Email</dt>
                    <dd className="font-semibold text-slate-800 dark:text-slate-100 mt-1">{patient.email}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-3">
                Clinical Background
              </h2>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {patient.medicalHistory ?? 'No clinical background on file.'}
              </p>
            </section>

            <section className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-teal-600" />
                Visit &amp; Appointment History
              </h2>

              {appointments.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No appointments on record.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-xs uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-3 pr-4 font-bold">Date</th>
                        <th className="py-3 pr-4 font-bold">Status</th>
                        <th className="py-3 font-bold">Reason / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointments.map((appt) => (
                        <tr
                          key={appt.id}
                          className="border-b border-slate-100 dark:border-slate-800 last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium text-slate-700 dark:text-slate-300">
                            {new Date(appt.appointmentDate).toLocaleString()}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                appt.status === 'COMPLETED'
                                  ? 'bg-emerald-500/15 text-emerald-600'
                                  : appt.status === 'CANCELLED'
                                    ? 'bg-rose-500/15 text-rose-600'
                                    : 'bg-amber-500/15 text-amber-600'
                              }`}
                            >
                              {appt.status}
                            </span>
                          </td>
                          <td className="py-3 text-slate-600 dark:text-slate-400">
                            {appt.reason || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        ) : null}
      </main>
    </div>
  );
}
