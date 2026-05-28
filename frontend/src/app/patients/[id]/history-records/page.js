'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import Link from 'next/link';
import {
  ArrowLeft, User, Phone, Calendar, ClipboardList,
  FileText, CheckCircle, XCircle, Clock, Activity, AlertCircle
} from 'lucide-react';

// Status badge colour mapping
const STATUS_STYLES = {
  COMPLETED:  'bg-teal-500/10 text-teal-600 dark:text-teal-400',
  PENDING:    'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  CONFIRMED:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  CANCELLED:  'bg-rose-500/10 text-rose-500',
};

const STATUS_ICONS = {
  COMPLETED:  <CheckCircle className="h-3.5 w-3.5" />,
  PENDING:    <Clock className="h-3.5 w-3.5" />,
  CONFIRMED:  <Activity className="h-3.5 w-3.5" />,
  CANCELLED:  <XCircle className="h-3.5 w-3.5" />,
};

export default function PatientHistoryPage() {
  const { id }                      = useParams();
  const router                      = useRouter();
  const { token, API_BASE_URL, user } = useAuth();

  const [patient, setPatient]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  // Guard: only authenticated users
  useEffect(() => {
    if (!user) router.push('/login');
  }, [user]);

  useEffect(() => {
    if (!id || !token) return;

    const fetchPatient = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to load patient record.');
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
  }, [id, token, API_BASE_URL]);

  // ── LOADING ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="pulse-loader"><div /><div /></div>
            <p className="text-sm text-slate-400 font-semibold">Loading patient records...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────
  if (error || !patient) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="glass p-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-center max-w-md">
            <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
            <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-2">Patient Not Found</h2>
            <p className="text-sm text-slate-500 mb-6">{error || 'The requested patient record could not be loaded.'}</p>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-bold text-sm rounded-lg hover:bg-teal-700 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const appointments = patient.appointments || [];
  const completedCount = appointments.filter(a => a.status === 'COMPLETED').length;
  const cancelledCount = appointments.filter(a => a.status === 'CANCELLED').length;
  const pendingCount   = appointments.filter(a => a.status === 'PENDING').length;

  // ── MAIN VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-8">

        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Patient Profile Card */}
        <div className="glass p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center">
                <User className="h-7 w-7 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{patient.name}</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 mt-1">
                  Patient Record
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-slate-400 font-medium">
              <span>ID: </span>
              <span className="font-mono text-slate-500">{patient.id}</span>
            </div>
          </div>

          {/* Demographics */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { icon: <User className="h-4 w-4" />,     label: 'Age',       value: `${patient.age} years` },
              { icon: <User className="h-4 w-4" />,     label: 'Gender',    value: patient.gender },
              { icon: <Phone className="h-4 w-4" />,    label: 'Contact',   value: patient.phoneNumber },
              { icon: <Calendar className="h-4 w-4" />, label: 'Registered', value: new Date(patient.createdAt).toLocaleDateString() },
            ].map(({ icon, label, value }) => (
              <div key={label} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-slate-400 text-xxs uppercase tracking-widest font-bold mb-1">
                  {icon} {label}
                </div>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{value}</p>
              </div>
            ))}
          </div>

          {/* Medical History */}
          <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
            <h3 className="flex items-center gap-2 text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3">
              <ClipboardList className="h-4 w-4" /> Clinical Background / Medical History
            </h3>
            {patient.medicalHistory ? (
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{patient.medicalHistory}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">No medical history recorded for this patient.</p>
            )}
          </div>
        </div>

        {/* Appointment Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Visits',   value: appointments.length, color: 'text-slate-800 dark:text-slate-100' },
            { label: 'Completed',      value: completedCount,       color: 'text-teal-600 dark:text-teal-400' },
            { label: 'Pending',        value: pendingCount,         color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Cancelled',      value: cancelledCount,       color: 'text-rose-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <p className="text-xxs font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
              <p className={`text-3xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Appointment History */}
        <div className="glass p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-slate-800 dark:text-slate-100 mb-6">
            <FileText className="h-5 w-5 text-teal-600" /> Appointment & Diagnostic History
          </h2>

          {appointments.length === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <ClipboardList className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-400">No appointment history recorded for this patient.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((app) => (
                <div
                  key={app.id}
                  className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 hover:border-teal-500/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 p-2 bg-teal-500/10 rounded-lg text-teal-600 dark:text-teal-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                          {new Date(app.appointmentDate).toLocaleDateString('en-US', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">
                          {new Date(app.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xxs font-extrabold uppercase tracking-wide ${STATUS_STYLES[app.status] || STATUS_STYLES.PENDING}`}>
                      {STATUS_ICONS[app.status]}
                      {app.status}
                    </span>
                  </div>

                  {app.reason && (
                    <div className="mt-3 pl-11">
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                        <span className="text-slate-400 uppercase tracking-wider text-xxs">Reason: </span>
                        {app.reason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
