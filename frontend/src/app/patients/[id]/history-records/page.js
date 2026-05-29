'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import { useAuth } from '@/context/AuthContext';

export default function HistoryRecordsPage() {
  const { token, API_BASE_URL, user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const patientId = params?.id;

  const [patientRecords, setPatientRecords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (!patientId || !token) return;

    const fetchPatientsRecord = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch(`${API_BASE_URL}/patients/${patientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load patient records.');
        }

        setPatientRecords(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch patient history.');
      } finally {
        setLoading(false);
      }
    };

    fetchPatientsRecord();
  }, [patientId, token, user, API_BASE_URL, router]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-5xl p-6 sm:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Patient Clinical History
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Review patient details, medical history, and appointment records.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-teal-600 hover:text-teal-500 font-semibold text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm text-slate-500">Loading clinical records...</p>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-300 bg-rose-50 p-6">
              <div className="flex items-center gap-3 text-rose-700">
                <ShieldAlert className="h-5 w-5" />
                <span className="font-semibold">Unable to load records</span>
              </div>
              <p className="mt-3 text-sm text-rose-700">{error}</p>
            </div>
          ) : !patientRecords ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <p className="text-sm text-slate-500">No patient data available.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{patientRecords.name}</h2>
                    <p className="text-sm text-slate-500 mt-1">{patientRecords.gender} · Age {patientRecords.age}</p>
                    <p className="text-sm text-slate-500 mt-1">{patientRecords.phoneNumber}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">Patient ID: {patientRecords.id}</div>
                </div>

                <div className="mt-6 space-y-3">
                  <h3 className="text-sm uppercase tracking-widest text-slate-400 font-bold">
                    Medical History
                  </h3>
                  <p className="text-sm leading-6 text-slate-700">
                    {patientRecords.medicalHistory?.trim()
                      ? patientRecords.medicalHistory
                      : 'No medical history available.'}
                  </p>
                </div>
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Appointment History</h2>
                    <p className="text-sm text-slate-500 mt-1">All appointments linked to this patient.</p>
                  </div>
                  <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{patientRecords.appointments?.length || 0} records</span>
                </div>

                {patientRecords.appointments?.length ? (
                  <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-slate-700">
                      <thead className="border-b border-slate-200 text-slate-400 uppercase tracking-widest text-xxs font-bold">
                        <tr>
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Status</th>
                          <th className="pb-3 pr-4">Reason</th>
                          <th className="pb-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {patientRecords.appointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-slate-50">
                            <td className="py-4 pr-4 font-medium text-slate-800">
                              {new Date(appointment.appointmentDate).toLocaleString([], {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="py-4 pr-4 uppercase text-xxs font-semibold tracking-wide text-slate-500">{appointment.status || 'UNKNOWN'}</td>
                            <td className="py-4 pr-4 text-slate-700">{appointment.reason || 'No reason provided'}</td>
                            <td className="py-4 text-slate-500">{appointment.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No appointments found for this patient.</div>
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
