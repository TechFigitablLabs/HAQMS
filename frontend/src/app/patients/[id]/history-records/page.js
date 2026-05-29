'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, ClipboardList, FileText, Phone, UserRound } from 'lucide-react';
import Navbar from '@/components/common/Navbar';
import { useAuth } from '@/context/AuthContext';

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
    }
  }, [router, user]);

  useEffect(() => {
    if (!id || !token) return;

    const fetchPatientHistory = async () => {
      setLoading(true);
      setError('');

      try {
        const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load patient history.');
        }

        setPatient(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatientHistory();
  }, [API_BASE_URL, id, token]);

  const appointments = patient?.appointments || [];
  const medicalHistory = patient?.medicalHistory || 'No medical history recorded.';

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
            >
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
            <h1 className="mt-3 text-2xl font-extrabold text-slate-800 dark:text-slate-100">
              Patient History Records
            </h1>
          </div>
        </div>

        {loading && (
          <div className="glass p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-500">
            Loading patient history...
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm font-semibold">
            {error}
          </div>
        )}

        {!loading && !error && patient && (
          <>
            <section className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                        {patient.name}
                      </h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {patient.gender} | Age {patient.age}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <Phone className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                  {patient.phoneNumber}
                </div>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
              <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md h-fit">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    Clinical Background
                  </h3>
                </div>
                <p className="text-sm leading-6 font-semibold text-slate-700 dark:text-slate-300">
                  {medicalHistory}
                </p>
              </div>

              <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                      Appointment History
                    </h3>
                  </div>
                  <span className="text-xs font-extrabold text-slate-400">
                    {appointments.length} records
                  </span>
                </div>

                {appointments.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-sm font-semibold text-slate-500">
                    No appointment records found for this patient.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                          <th className="py-3 pr-4 font-extrabold">Date</th>
                          <th className="py-3 pr-4 font-extrabold">Reason</th>
                          <th className="py-3 pr-4 font-extrabold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {appointments.map((appointment) => (
                          <tr key={appointment.id}>
                            <td className="py-3 pr-4 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              <span className="inline-flex items-center gap-2">
                                <CalendarDays className="h-4 w-4 text-slate-400" />
                                {new Date(appointment.appointmentDate).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 pr-4 font-semibold text-slate-600 dark:text-slate-300">
                              {appointment.reason || 'No reason recorded'}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="inline-flex px-2 py-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-extrabold uppercase tracking-wide">
                                {appointment.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
