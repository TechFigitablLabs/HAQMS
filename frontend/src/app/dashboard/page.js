'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import { useRouter } from 'next/navigation';
import {
  Users, CalendarDays, Activity, Search, UserPlus,
  Trash2, ClipboardList, TrendingUp, DollarSign, Award, Clock,
  ArrowRight, ShieldAlert, CheckCircle
} from 'lucide-react';
import Link from 'next/link';

export default function Dashboard() {
  const { user, token, API_BASE_URL, logout } = useAuth();
  const router = useRouter();

  // FIX: Moved navigation guard before any hooks — hooks must be called unconditionally.
  // The original had hooks declared below the guard which violates Rules of Hooks.
  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  // ── Shared state ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(() =>
    user?.role === 'ADMIN' ? 'reports' : user?.role === 'RECEPTIONIST' ? 'patients' : 'appointments'
  );

  // ── Receptionist: patients ────────────────────────────────────────────────
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientGender, setPatientGender] = useState('All');
  const [patientsPagination, setPatientsPagination] = useState({ page: 1, totalPages: 1 });

  // Registration form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regHistory, setRegHistory] = useState('');
  const [regMessage, setRegMessage] = useState('');

  // Booking / check-in
  const [doctorsList, setDoctorsList] = useState([]);
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [checkinMessage, setCheckinMessage] = useState('');

  // Walk-in selects — replaced document.getElementById() with proper React state
  // FIX: Using DOM queries (getElementById) inside event handlers is an anti-pattern in React.
  // It bypasses the virtual DOM and breaks in SSR / concurrent mode.
  const [walkinPatientId, setWalkinPatientId] = useState('');
  const [walkinDoctorId, setWalkinDoctorId] = useState('');

  // ── Doctor state ──────────────────────────────────────────────────────────
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorQueue, setDoctorQueue] = useState([]);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);

  // ── Admin state ───────────────────────────────────────────────────────────
  const [adminReportData, setAdminReportData] = useState(null);
  const [adminReportLoading, setAdminReportLoading] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // ── Debounce ref — avoids a fetch on every keystroke ─────────────────────
  // FIX: Original code fired fetchPatients on every single keystroke via useEffect
  // because patientSearch was a direct dependency. With 1000 patients and fast
  // typing, this hammers the API. A 400ms debounce batches rapid input into one request.
  const searchDebounceRef = useRef(null);

  // ── Auth header helper ────────────────────────────────────────────────────
  const authHeaders = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token]
  );

  const normalizeDoctorList = useCallback((payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload)) return payload;
    return [];
  }, []);

  // ── Fetch patients ────────────────────────────────────────────────────────
  const fetchPatients = useCallback(
    async (page = 1) => {
      setPatientsLoading(true);
      try {
        const params = new URLSearchParams({
          page,
          limit: 5,
          ...(patientSearch && { search: patientSearch }),
          ...(patientGender !== 'All' && { gender: patientGender }),
        });
        const res = await fetch(`${API_BASE_URL}/patients?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setPatients(data.data);
          setPatientsPagination({
            page: data.pagination.page,
            totalPages: data.pagination.totalPages,
            totalPatients: data.pagination.total,
          });
        }
      } catch (e) {
        console.error('[Dashboard] fetchPatients error:', e);
      } finally {
        setPatientsLoading(false);
      }
    },
    [API_BASE_URL, token, patientSearch, patientGender]
  );

  // FIX: Debounced search — waits 400ms after the last keystroke before fetching.
  useEffect(() => {
    if (user?.role !== 'RECEPTIONIST' && user?.role !== 'ADMIN') return;
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetchPatients(1);
    }, 400);
    return () => clearTimeout(searchDebounceRef.current);
  }, [patientSearch, patientGender, fetchPatients, user?.role]);

  // ── Fetch doctors dropdown ────────────────────────────────────────────────
  const fetchDoctorsDropdown = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Backend returns an envelope shape: { success, data: [...] }.
      // Keep the state strictly as an array so render paths can safely map it.
      setDoctorsList(normalizeDoctorList(data));
    } catch (e) {
      console.error('[Dashboard] fetchDoctorsDropdown error:', e);
      setDoctorsList([]);
    }
  }, [API_BASE_URL, token, normalizeDoctorList]);

  useEffect(() => {
    if (user) fetchDoctorsDropdown();
  }, [user, fetchDoctorsDropdown]);

  // ── Register patient ──────────────────────────────────────────────────────
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegMessage('');

    // FIX: Added phone format validation on the client to match backend PHONE_REGEX.
    // Previously any string like "abc" was submitted and rejected server-side with
    // a 500 — confusing the user with no clear feedback.
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    if (!phoneRegex.test(regPhone)) {
      setRegMessage('Error: Phone number must be 7–15 digits (optional leading +).');
      return;
    }

    const parsedAge = parseInt(regAge, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 150) {
      setRegMessage('Error: Age must be a number between 0 and 150.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          name: regName,
          email: regEmail || undefined,
          phoneNumber: regPhone,
          age: parsedAge,
          gender: regGender,
          medicalHistory: regHistory || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setRegMessage('Success: Patient registered successfully!');
        setRegName(''); setRegEmail(''); setRegPhone('');
        setRegAge(''); setRegHistory('');
        fetchPatients(1);
      } else {
        setRegMessage(`Error: ${data.error || 'Failed to register.'}`);
      }
    } catch (err) {
      setRegMessage(`Error: ${err.message}`);
    }
  };

  // ── Book appointment ──────────────────────────────────────────────────────
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingMessage('');

    if (!bookingPatientId || !bookingDoctorId || !bookingDate) {
      setBookingMessage('Error: All booking fields are required.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/appointments`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          patientId: bookingPatientId,
          doctorId: bookingDoctorId,
          appointmentDate: bookingDate,
          reason: bookingReason,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setBookingMessage('Success: Appointment booked successfully!');
        setBookingReason('');
        setBookingDate('');
        if (user?.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setBookingMessage(`Error: ${data.error || 'Failed to book.'}`);
      }
    } catch (err) {
      setBookingMessage(`Error: ${err.message}`);
    }
  };

  // ── Delete patient ────────────────────────────────────────────────────────
  // FIX: The delete button was visible and functional for all roles because
  // authorizeAdminOnlyLegacy was a no-op on the backend. Both layers are now fixed:
  // - Backend: real ADMIN-only guard
  // - Frontend: button only rendered for ADMIN role
  const handleDeletePatient = async (id) => {
    if (!confirm('Are you sure you want to delete this patient record?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Patient deleted.');
        fetchPatients(patientsPagination.page);
      } else {
        alert(`Error: ${data.error || 'Failed to delete.'}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // ── Queue check-in ────────────────────────────────────────────────────────
  const handleQueueCheckin = async (patientId, doctorId, appointmentId = null) => {
    setCheckinMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/queue/checkin`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ patientId, doctorId, appointmentId }),
      });
      const data = await res.json();
      if (res.ok) {
        // FIX: Backend response is now { success, data: { tokenNumber, ... } }
        setCheckinMessage(`Checked in! Generated Token #${data.data.tokenNumber}`);
        if (user?.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setCheckinMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setCheckinMessage(`Error: ${err.message}`);
    }
  };

  // ── Doctor worklist ───────────────────────────────────────────────────────
  const fetchDoctorWorklist = useCallback(async () => {
    if (user?.role !== 'DOCTOR') return;
    const matchedDoc = doctorsList.find((d) => d.userId === user.id);
    if (!matchedDoc) return;

    try {
      // FIX: Run both fetches in parallel — the original awaited them sequentially.
      const [appRes, queueRes] = await Promise.all([
        fetch(`${API_BASE_URL}/appointments?doctorId=${matchedDoc.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/queue?doctorId=${matchedDoc.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [appData, queueData] = await Promise.all([appRes.json(), queueRes.json()]);

      if (appData.success) setDoctorAppointments(appData.data);
      setDoctorQueue(queueData.data ?? queueData);
    } catch (e) {
      console.error('[Dashboard] fetchDoctorWorklist error:', e);
    }
  }, [API_BASE_URL, token, user, doctorsList]);

  useEffect(() => {
    if (user?.role === 'DOCTOR' && doctorsList.length > 0) {
      fetchDoctorWorklist();
    }
  }, [user?.role, doctorsList, fetchDoctorWorklist]);

  // ── Queue / appointment status updates ───────────────────────────────────
  const handleUpdateQueueStatus = async (tokenId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/queue/${tokenId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchDoctorWorklist();
    } catch (e) {
      console.error('[Dashboard] handleUpdateQueueStatus error:', e);
    }
  };

  const handleCompleteAppointment = async (appId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/${appId}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) fetchDoctorWorklist();
    } catch (e) {
      console.error('[Dashboard] handleCompleteAppointment error:', e);
    }
  };

  // ── Admin report ──────────────────────────────────────────────────────────
  const generateSystemReport = async () => {
    setAdminReportLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/doctor-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAdminReportData(data);
    } catch (e) {
      console.error('[Dashboard] generateSystemReport error:', e);
    } finally {
      setAdminReportLoading(false);
    }
  };

  // ── Admin doctor search ───────────────────────────────────────────────────
  const searchPhysiciansAdmin = async () => {
    try {
      const params = new URLSearchParams();
      if (adminSearchQuery) params.set('search', adminSearchQuery);
      const res = await fetch(`${API_BASE_URL}/doctors?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setDoctorsList(normalizeDoctorList(data));
      } else {
        // FIX: Backend no longer leaks sqlMessage — display the generic error field.
        alert(`API Error: ${data.error}`);
        setDoctorsList([]);
      }
    } catch (e) {
      console.error('[Dashboard] searchPhysiciansAdmin error:', e);
      setDoctorsList([]);
    }
  };

  // ── Guard: don't render until user is confirmed ───────────────────────────
  if (!user) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">

        {/* Role-based tab navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-4">
          {user.role === 'ADMIN' && (
            <>
              <button onClick={() => setActiveTab('reports')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'reports' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                System Audit Reports
              </button>
              <button onClick={() => setActiveTab('physicians')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'physicians' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                Physician Registry
              </button>
            </>
          )}
          {(user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && (
            <>
              <button onClick={() => setActiveTab('patients')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'patients' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                Patient Registry Directory
              </button>
              <button onClick={() => setActiveTab('book')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'book' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                Scheduling / Check-in Portal
              </button>
            </>
          )}
          {user.role === 'DOCTOR' && (
            <>
              <button onClick={() => setActiveTab('appointments')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'appointments' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                My Scheduled Bookings
              </button>
              <button onClick={() => setActiveTab('queue')} className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'queue' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}>
                Active Calling Queue
              </button>
            </>
          )}
        </div>

        {/* Global check-in notification */}
        {checkinMessage && (
          <div className="p-4 mb-6 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-between text-sm">
            <span>{checkinMessage}</span>
            <button onClick={() => setCheckinMessage('')} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}

        {/* ================================================================
            PATIENT REGISTRY TAB
            ================================================================ */}
        {activeTab === 'patients' && (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <ClipboardList className="h-5 w-5 text-teal-600" />
                    Patient Lookup Directory
                  </h3>

                  <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Search by name, phone or email..."
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                    >
                      <option value="All">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {patientsLoading ? (
                    <p className="text-center py-6 text-slate-400 animate-pulse text-sm">Synchronizing table data...</p>
                  ) : patients.length === 0 ? (
                    <p className="text-center py-6 text-slate-400 text-sm">No registered patients match this filter.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                        <thead>
                          <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                            <th className="pb-3">Name</th>
                            <th className="pb-3">Contact</th>
                            <th className="pb-3">Age/Sex</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {patients.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-500/5 transition-colors">
                              <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">
                                {p.name}
                                {p.email && <span className="block text-xxs text-slate-400 font-normal mt-0.5">{p.email}</span>}
                              </td>
                              <td className="py-3.5 text-slate-500 dark:text-slate-400 font-medium">{p.phoneNumber}</td>
                              <td className="py-3.5 text-slate-500 dark:text-slate-400">
                                {p.age} yrs / <span className="capitalize">{p.gender?.toLowerCase()}</span>
                              </td>
                              <td className="py-3.5 text-right space-x-2">
                                <button
                                  onClick={() => handleQueueCheckin(p.id, doctorsList[0]?.id)}
                                  className="text-xxs px-2.5 py-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-500 hover:text-white transition-colors"
                                >
                                  Check In
                                </button>
                                {/* FIX: Delete button only rendered for ADMIN role.
                                    Previously visible to all roles — clicking it would
                                    reach the backend which also had no real guard. */}
                                {user.role === 'ADMIN' && (
                                  <button
                                    onClick={() => handleDeletePatient(p.id)}
                                    className="text-xxs p-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                                    title="Delete patient record"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">
                      Page {patientsPagination.page} of {patientsPagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={patientsPagination.page <= 1}
                        onClick={() => fetchPatients(patientsPagination.page - 1)}
                        className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-teal-500/10 disabled:opacity-50 text-xs font-semibold"
                      >
                        Prev
                      </button>
                      <button
                        disabled={patientsPagination.page >= patientsPagination.totalPages}
                        onClick={() => fetchPatients(patientsPagination.page + 1)}
                        className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-teal-500/10 disabled:opacity-50 text-xs font-semibold"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration form */}
              <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 h-fit">
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <UserPlus className="h-5 w-5 text-teal-600" />
                  New Registration
                </h3>

                {regMessage && (
                  <div className={`p-3 text-sm rounded-lg mb-4 ${regMessage.startsWith('Success') ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20' : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'}`}>
                    {regMessage}
                  </div>
                )}

                <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div>
                    <label className="block mb-1">Patient Full Name*</label>
                    <input type="text" required value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Bruce Wayne"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Age (Years)*</label>
                      <input type="number" required min="0" max="150" value={regAge} onChange={(e) => setRegAge(e.target.value)} placeholder="35"
                        className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block mb-1">Gender*</label>
                      <select value={regGender} onChange={(e) => setRegGender(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1">Contact Phone*</label>
                    <input type="tel" required value={regPhone} onChange={(e) => setRegPhone(e.target.value)} placeholder="+911234567890"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block mb-1">Email Address</label>
                    <input type="email" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} placeholder="bruce@wayne.com"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block mb-1">Medical History (optional)</label>
                    <textarea value={regHistory} onChange={(e) => setRegHistory(e.target.value)} placeholder="E.g. cardiovascular risks, asthma..." rows="3"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                  </div>
                  <button type="submit" className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-lg shadow-md transition-colors duration-300 mt-2">
                    Register Patient Record
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            SCHEDULING / CHECK-IN TAB
            ================================================================ */}
        {activeTab === 'book' && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-teal-600" />
                Schedule Appointment Slot
              </h3>
              {bookingMessage && (
                <div className={`p-3 text-sm rounded-lg mb-4 ${bookingMessage.startsWith('Success') ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20' : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'}`}>
                  {bookingMessage}
                </div>
              )}
              <form onSubmit={handleBookAppointment} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div>
                  <label className="block mb-1">Select Registered Patient*</label>
                  <select required value={bookingPatientId} onChange={(e) => setBookingPatientId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                    <option value="">-- Choose Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phoneNumber})</option>
                    ))}
                  </select>
                  <span className="text-xxs text-slate-400 block mt-1">If client is missing, register them in the Directory tab first.</span>
                </div>
                <div>
                  <label className="block mb-1">Select Physician*</label>
                  <select required value={bookingDoctorId} onChange={(e) => setBookingDoctorId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                    <option value="">-- Choose Physician --</option>
                    {doctorsList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} - {d.specialization} (${d.consultationFee})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Appointment Date & Time*</label>
                  <input type="datetime-local" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block mb-1">Consultation Reason</label>
                  <input type="text" value={bookingReason} onChange={(e) => setBookingReason(e.target.value)} placeholder="Regular diagnostic review..."
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none" />
                </div>
                <button type="submit" className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-lg shadow-md transition-colors duration-300 mt-2">
                  Book Appointment Slot
                </button>
              </form>
            </div>

            {/* Walk-in check-in */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-teal-600" />
                Active Direct Queue Check-In
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-semibold">
                Generate an immediate waiting token for a direct walk-in patient.
              </p>
              <div className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div>
                  <label className="block mb-1">Select Walk-in Patient*</label>
                  {/* FIX: Replaced document.getElementById() with controlled React state */}
                  <select value={walkinPatientId} onChange={(e) => setWalkinPatientId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                    <option value="">-- Choose Patient --</option>
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Assign Physician*</label>
                  <select value={walkinDoctorId} onChange={(e) => setWalkinDoctorId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none">
                    <option value="">-- Choose Physician --</option>
                    {doctorsList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={() => {
                    if (!walkinPatientId || !walkinDoctorId) {
                      alert('Select patient and doctor first.');
                      return;
                    }
                    handleQueueCheckin(walkinPatientId, walkinDoctorId);
                  }}
                  className="glow-btn w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 font-extrabold text-sm rounded-lg shadow-md transition-colors duration-300 mt-2"
                >
                  Generate Live Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            DOCTOR APPOINTMENTS TAB
            ================================================================ */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-teal-600" />
                Scheduled Daily Bookings List
              </h3>
              {doctorAppointments.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No appointments scheduled for you today.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                        <th className="pb-3">Time</th>
                        <th className="pb-3">Patient</th>
                        <th className="pb-3">Reason</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {doctorAppointments.map((app) => (
                        <tr key={app.id} className="hover:bg-slate-500/5 transition-colors">
                          <td className="py-3.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {new Date(app.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5">
                            <button onClick={() => setSelectedPatientHistory(app.patient)}
                              className="font-bold text-teal-600 hover:underline hover:text-teal-700 transition-colors">
                              {app.patient?.name ?? 'Unknown Patient'}
                            </button>
                            <span className="block text-xxs text-slate-400 mt-0.5">Age: {app.patient?.age}</span>
                          </td>
                          <td className="py-3.5 text-slate-500 dark:text-slate-400 font-semibold">{app.reason || 'None provided'}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase ${app.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-600' : app.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right space-x-2">
                            {app.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => {
                                    const matchedDoc = doctorsList.find((d) => d.userId === user.id);
                                    if (matchedDoc) handleQueueCheckin(app.patientId, matchedDoc.id, app.id);
                                  }}
                                  className="text-xxs px-2.5 py-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold hover:bg-teal-500 hover:text-white transition-colors"
                                >
                                  Check In Patient
                                </button>
                                <button onClick={() => handleCompleteAppointment(app.id)}
                                  className="text-xxs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold hover:bg-teal-500 hover:text-white transition-colors">
                                  Complete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Patient history panel */}
            {selectedPatientHistory && (
              <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100">
                      Medical Records: {selectedPatientHistory.name}
                    </h3>
                    <p className="text-xxs font-bold text-slate-400 uppercase tracking-widest mt-1">
                      Gender: {selectedPatientHistory.gender} | Contact: {selectedPatientHistory.phoneNumber}
                    </p>
                  </div>
                  <button onClick={() => setSelectedPatientHistory(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Close</button>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <h4 className="font-bold text-slate-400 uppercase tracking-wider">Clinical Background</h4>
                  {/* FIX: Runtime crash — the original called .toUpperCase() directly on
                      medicalHistory without optional chaining. If medicalHistory is null
                      (a valid DB state for patients with no history), the app threw:
                      "Cannot read properties of null (reading 'toUpperCase')" and
                      crashed the entire dashboard. Fixed with optional chaining + fallback. */}
                  <p className="text-slate-700 dark:text-slate-300 leading-5 text-sm font-semibold">
                    {selectedPatientHistory.medicalHistory?.toUpperCase() ?? 'No medical history recorded.'}
                  </p>
                </div>
                <div className="pt-2 flex justify-between items-center text-xs">
                  {/* FIX: This link was pointing to a non-existent route (/patients/:id/history-records).
                      Updated to /patients/:id which is the actual patient detail page. */}
                  <Link href={`/patients/${selectedPatientHistory.id}`}
                    className="text-teal-600 font-extrabold hover:underline flex items-center gap-1">
                    View Full Patient Record
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            DOCTOR QUEUE TAB
            ================================================================ */}
        {activeTab === 'queue' && (
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-teal-600" />
              Active Operations Queue Controller
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-semibold">
              Manage patient call sequences for live monitors.
            </p>
            {doctorQueue.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-sm">No checked-in patients in queue today.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctorQueue.map((t) => (
                  <div key={t.id}
                    className={`p-5 rounded-2xl border shadow-md relative overflow-hidden flex flex-col justify-between ${t.status === 'CALLING' ? 'border-teal-500 bg-teal-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-500/5'}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100">Token #{t.tokenNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase ${t.status === 'CALLING' ? 'bg-teal-500 text-white' : t.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-600' : 'bg-amber-500/10 text-amber-500'}`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.patient.name}</h4>
                      <p className="text-xxs text-slate-400 mt-0.5">Contact: {t.patient.phoneNumber}</p>
                    </div>
                    <div className="mt-6 flex gap-2">
                      {t.status === 'WAITING' && (
                        <button onClick={() => handleUpdateQueueStatus(t.id, 'CALLING')}
                          className="flex-1 py-1.5 bg-teal-600 text-white font-bold text-xxs rounded hover:bg-teal-700 transition-colors">
                          Call Patient
                        </button>
                      )}
                      {t.status === 'CALLING' && (
                        <>
                          <button onClick={() => handleUpdateQueueStatus(t.id, 'COMPLETED')}
                            className="flex-1 py-1.5 bg-teal-600 text-white font-bold text-xxs rounded hover:bg-teal-700 transition-colors">
                            Consulted
                          </button>
                          <button onClick={() => handleUpdateQueueStatus(t.id, 'SKIPPED')}
                            className="flex-1 py-1.5 bg-rose-500/10 text-rose-500 font-bold text-xxs rounded hover:bg-rose-500 hover:text-white transition-colors">
                            Skip / No Show
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================================================================
            ADMIN REPORTS TAB
            ================================================================ */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-teal-600" />
                    Doctor Revenue & Operations Report
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                    System-wide practitioner performance audits.
                  </p>
                </div>
                <button onClick={generateSystemReport} disabled={adminReportLoading}
                  className="glow-btn px-4 py-2 bg-teal-600 text-white font-extrabold text-xs rounded-lg shadow hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  {adminReportLoading ? 'Aggregating...' : 'Load Doctor System Audit Report'}
                </button>
              </div>

              {adminReportLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="pulse-loader"><div></div><div></div></div>
                  <p className="mt-4 text-xs font-semibold text-slate-400 animate-pulse">Loading report data...</p>
                </div>
              ) : !adminReportData ? (
                <div className="p-8 text-center bg-slate-100 dark:bg-slate-800/40 rounded-xl text-slate-400 text-xs font-semibold border border-dashed border-slate-200 dark:border-slate-700">
                  Click the button above to load reports.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Physicians</span>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{adminReportData.data.length}</h4>
                    </div>
                    <div className="p-4 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Sum Appointments</span>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                        {adminReportData.data.reduce((sum, item) => sum + item.totalAppointments, 0)}
                      </h4>
                    </div>
                    <div className="p-4 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Revenue ($)</span>
                      <h4 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
                        ${adminReportData.data.reduce((sum, item) => sum + item.revenue, 0)}
                      </h4>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold border-b border-slate-200 dark:border-slate-800">
                          <th className="pb-3">Doctor</th>
                          <th className="pb-3">Department</th>
                          <th className="pb-3 text-center">Consultations</th>
                          <th className="pb-3 text-center">Today Queue</th>
                          <th className="pb-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {adminReportData.data.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-500/5 transition-colors">
                            <td className="py-3.5 font-bold text-slate-800 dark:text-slate-200">
                              {item.name}
                              <span className="block text-xxs text-teal-600 dark:text-teal-400 font-semibold uppercase mt-0.5">{item.specialization}</span>
                            </td>
                            <td className="py-3.5 text-slate-500 dark:text-slate-400">{item.department}</td>
                            <td className="py-3.5 text-center text-slate-500 dark:text-slate-400">
                              {item.completedAppointments} Completed / {item.totalAppointments} Total
                            </td>
                            <td className="py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">{item.todayQueueSize} in queue</td>
                            <td className="py-3.5 text-right font-bold text-teal-600 dark:text-teal-400">${item.revenue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================
            ADMIN PHYSICIAN REGISTRY TAB
            ================================================================ */}
        {activeTab === 'physicians' && (
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Award className="h-5 w-5 text-teal-600" />
                Staff Physicians Registry Lookup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Search the physician directory.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="relative flex-1 rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input type="text" value={adminSearchQuery} onChange={(e) => setAdminSearchQuery(e.target.value)}
                  placeholder="Search physicians by name..."
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm" />
              </div>
              <button onClick={searchPhysiciansAdmin}
                className="glow-btn px-5 py-2 bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950 font-bold text-xs rounded-lg hover:bg-slate-800 dark:hover:bg-teal-400 transition-colors">
                Search
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctorsList.map((doc) => (
                <div key={doc.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-500/5 flex flex-col justify-between">
                  <div>
                    <span className="inline-flex px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase bg-teal-500/10 text-teal-600 dark:text-teal-400 mb-2">
                      {doc.department}
                    </span>
                    <h4 className="font-extrabold text-slate-800 dark:text-slate-100">{doc.name}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{doc.specialization}</p>
                  </div>
                  <div className="mt-6 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex justify-between items-center text-xs font-semibold text-slate-500">
                    <span>Exp: {doc.experience} yrs</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">Fee: ${doc.consultationFee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}