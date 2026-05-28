'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/common/Navbar';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, FileText } from 'lucide-react';

export default function PatientHistoryRecordsPage() {
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

    const fetchPatient = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to load patient history records');
        }
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-teal-600" />
            Diagnostic History Records
          </h1>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="glass p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-500">
            Loading patient history...
          </div>
        ) : error ? (
          <div className="glass p-8 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-sm text-rose-500">
            {error}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{patient.name}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {patient.gender} | Age {patient.age} | Contact {patient.phoneNumber}
              </p>
              <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-bold">Medical History:</span>{' '}
                {patient.medicalHistory || 'No medical history recorded.'}
              </p>
            </div>

            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-500 mb-4">
                Appointment Records
              </h3>
              {patient.appointments?.length ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left divide-y divide-slate-200 dark:divide-slate-800">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {patient.appointments.map((app) => (
                        <tr key={app.id}>
                          <td className="py-3">{new Date(app.appointmentDate).toLocaleString()}</td>
                          <td className="py-3">{app.reason || 'N/A'}</td>
                          <td className="py-3 font-semibold">{app.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-slate-500">No appointment records available.</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
