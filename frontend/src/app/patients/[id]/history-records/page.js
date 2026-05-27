'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import Link from 'next/link';
import {
  ArrowLeft, User, Phone, Calendar, Activity,
  FileText, ClipboardList, AlertCircle, Clock
} from 'lucide-react';

export default function PatientHistoryRecords() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token, API_BASE_URL } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!id) return;

    const fetchPatient = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to load patient records.');
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
  }, [id, user, token, API_BASE_URL, router]);

  if (!user) return null;

  const statusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return 'bg-teal-500/10 text-teal-600 dark:text-teal-400';
      case 'CANCELLED': return 'bg-rose-500/10 text-rose-500';
      default: return 'bg-amber-500/10 text-amber-500';
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 sm:p-8 space-y-6">
        {/* Back navigation */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        {/* Error state */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="pulse-loader">
              <div></div>
              <div></div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-400">Loading patient records...</p>
          </div>
        )}

        {/* Patient data */}
        {!loading && patient && (
          <>
            {/* Header card */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-xl shrink-0">
                  <User className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 truncate">
                    {patient.name}
                  </h1>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {patient.phoneNumber}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {patient.age} yrs — {patient.gender}
                    </span>
                    {patient.email && (
                      <span className="flex items-center gap-1">
                        <Activity className="h-3.5 w-3.5" />
                        {patient.email}
                      </span>
                    )}
                  </div>
                </div>
                <span className="inline-flex px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 shrink-0">
                  Active
                </span>
              </div>
            </div>

            {/* Medical history */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-teal-600" />
                Clinical Background & Medical History
              </h2>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-6">
                {/* FIX: Optional chaining prevents crash on null medicalHistory */}
                {patient.medicalHistory?.trim() || (
                  <span className="italic text-slate-400">
                    No medical history on record for this patient.
                  </span>
                )}
              </div>
            </div>

            {/* Appointment history */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <ClipboardList className="h-5 w-5 text-teal-600" />
                Appointment History
                <span className="ml-auto text-xs font-bold text-slate-400">
                  {patient.appointments?.length ?? 0} records
                </span>
              </h2>

              {!patient.appointments || patient.appointments.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-400 italic border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No appointments found for this patient.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="pb-3 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Date & Time
                        </th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {patient.appointments
                        .slice()
                        .sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate))
                        .map((appt) => (
                          <tr key={appt.id} className="hover:bg-slate-500/5 transition-colors">
                            <td className="py-3.5 font-mono font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {new Date(appt.appointmentDate).toLocaleString([], {
                                year: 'numeric',
                                month: 'short',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-3.5 text-slate-500 dark:text-slate-400 font-medium">
                              {appt.reason || <span className="italic">No reason provided</span>}
                            </td>
                            <td className="py-3.5 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase ${statusColor(appt.status)}`}>
                                {appt.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
