'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import Link from 'next/link';                          // FIX: was missing — caused runtime error on Link usage
import { useRouter } from 'next/navigation';
import {
  Users, CalendarDays, Activity, Search, UserPlus,
  Trash2, ClipboardList, TrendingUp, DollarSign, Award, Clock,
  ArrowRight, ShieldAlert, CheckCircle, Volume2, Sparkles
} from 'lucide-react';

export default function Dashboard() {
  const { user, token, API_BASE_URL, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user]);

  if (!user) return null;

  const [activeTab, setActiveTab] = useState(
    user.role === 'ADMIN' ? 'reports' : user.role === 'RECEPTIONIST' ? 'patients' : 'appointments'
  );

  // ── RECEPTIONIST STATE ──────────────────────────────────────────────────────
  const [patients, setPatients]                 = useState([]);
  const [patientsLoading, setPatientsLoading]   = useState(false);
  const [patientSearch, setPatientSearch]       = useState('');
  const [patientGender, setPatientGender]       = useState('All');
  const [patientsPagination, setPatientsPagination] = useState({ page: 1, totalPages: 1 });

  const [regName, setRegName]       = useState('');
  const [regEmail, setRegEmail]     = useState('');
  const [regPhone, setRegPhone]     = useState('');
  const [regAge, setRegAge]         = useState('');
  const [regGender, setRegGender]   = useState('Male');
  const [regHistory, setRegHistory] = useState('');
  const [regMessage, setRegMessage] = useState('');

  const [doctorsList, setDoctorsList]         = useState([]);
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDoctorId, setBookingDoctorId]   = useState('');
  const [bookingDate, setBookingDate]           = useState('');
  const [bookingReason, setBookingReason]       = useState('');
  const [bookingMessage, setBookingMessage]     = useState('');
  const [checkinMessage, setCheckinMessage]     = useState('');

  // ── DOCTOR STATE ────────────────────────────────────────────────────────────
  const [doctorAppointments, setDoctorAppointments]   = useState([]);
  const [doctorQueue, setDoctorQueue]                 = useState([]);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);

  // ── ADMIN STATE ─────────────────────────────────────────────────────────────
  const [adminReportData, setAdminReportData]     = useState(null);
  const [adminReportLoading, setAdminReportLoading] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery]   = useState('');

  // ── FETCH PATIENTS ──────────────────────────────────────────────────────────
  const fetchPatients = useCallback(async (page = 1, search = patientSearch, gender = patientGender) => {
    setPatientsLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 5, search, gender });
      const res = await fetch(`${API_BASE_URL}/patients?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setPatients(data.patients);
        setPatientsPagination({
          page:          data.pagination.page,
          totalPages:    data.pagination.totalPages,
          totalPatients: data.pagination.totalPatients,
        });
      }
    } catch (e) {
      console.error('[PATIENTS] fetch error:', e);
    } finally {
      setPatientsLoading(false);
    }
  }, [API_BASE_URL, token, patientSearch, patientGender]);

  // FIX: Debounce search to avoid firing an API call on every single keystroke.
  // Previously, typing "Smith" triggered 5 full network round-trips; now it
  // waits 350ms after the user stops typing before sending one request.
  const debounceTimer = useRef(null);
  useEffect(() => {
    if (user.role !== 'RECEPTIONIST' && user.role !== 'ADMIN') return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchPatients(1, patientSearch, patientGender);
    }, 350);
    return () => clearTimeout(debounceTimer.current);
  }, [patientSearch, patientGender]);

  // Fetch doctors dropdown
  const fetchDoctorsDropdown = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDoctorsList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[DOCTORS] fetch error:', e);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => { fetchDoctorsDropdown(); }, []);

  // Register patient
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegMessage('');

    // FIX: Basic phone format validation on the client side too
    const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;
    if (!phoneRegex.test(regPhone)) {
      setRegMessage('Error: Please enter a valid phone number.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: regName, email: regEmail, phoneNumber: regPhone, age: regAge, gender: regGender, medicalHistory: regHistory }),
      });
      const data = await res.json();
      if (res.ok) {
        setRegMessage('Success: Patient registered successfully!');
        setRegName(''); setRegEmail(''); setRegPhone(''); setRegAge(''); setRegHistory('');
        fetchPatients(1);
      } else {
        setRegMessage(`Error: ${data.error || 'Failed to register'}`);
      }
    } catch (err) {
      setRegMessage(`Error: ${err.message}`);
    }
  };

  // Book appointment
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId: bookingPatientId, doctorId: bookingDoctorId, appointmentDate: bookingDate, reason: bookingReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setBookingMessage('Success: Appointment booked successfully!');
        setBookingReason('');
        if (user.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setBookingMessage(`Error: ${data.error || 'Failed to book'}`);
      }
    } catch (err) {
      setBookingMessage(`Error: ${err.message}`);
    }
  };

  // Delete patient — FIX: button is hidden for non-ADMIN users in the UI;
  // the API also enforces the restriction server-side.
  const handleDeletePatient = async (id) => {
    if (!confirm('Are you sure you want to permanently delete this patient record? This cannot be undone.')) return;
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
        alert(`Error: ${data.error || 'Failed to delete'}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Queue check-in
  const handleQueueCheckin = async (patientId, doctorId, appointmentId = null) => {
    setCheckinMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/queue/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patientId, doctorId, appointmentId }),
      });
      const data = await res.json();
      if (res.ok) {
        setCheckinMessage(`Checked in! Generated Token #${data.token.tokenNumber}`);
        if (user.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setCheckinMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setCheckinMessage(`Error: ${err.message}`);
    }
  };

  // ── DOCTOR FUNCTIONS ────────────────────────────────────────────────────────
  const fetchDoctorWorklist = useCallback(async () => {
    if (user.role !== 'DOCTOR') return;
    const matchedDoc = doctorsList.find(d => d.userId === user.id);
    if (!matchedDoc) return;
    try {
      const [appRes, queueRes] = await Promise.all([
        fetch(`${API_BASE_URL}/appointments?doctorId=${matchedDoc.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/queue?doctorId=${matchedDoc.id}`,        { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [appData, queueData] = await Promise.all([appRes.json(), queueRes.json()]);
      if (appData.success) setDoctorAppointments(appData.appointments);
      setDoctorQueue(queueData);
    } catch (e) {
      console.error('[DOCTOR] worklist error:', e);
    }
  }, [doctorsList, API_BASE_URL, token, user]);

  useEffect(() => {
    if (user.role === 'DOCTOR' && doctorsList.length > 0) fetchDoctorWorklist();
  }, [doctorsList]);

  const handleUpdateQueueStatus = async (tokenId, newStatus) => {
    try {
      await fetch(`${API_BASE_URL}/queue/${tokenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchDoctorWorklist();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompleteAppointment = async (appId) => {
    try {
      await fetch(`${API_BASE_URL}/appointments/${appId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      fetchDoctorWorklist();
    } catch (e) {
      console.error(e);
    }
  };

  // ── ADMIN FUNCTIONS ─────────────────────────────────────────────────────────
  const generateSystemReport = async () => {
    setAdminReportLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/reports/doctor-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAdminReportData(data);
    } catch (e) {
      console.error(e);
    } finally {
      setAdminReportLoading(false);
    }
  };

  const searchPhysiciansAdmin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors?search=${encodeURIComponent(adminSearchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) setDoctorsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">

        {/* Role tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-4">
          {user.role === 'ADMIN' && (
            <>
              <TabBtn active={activeTab === 'reports'}    onClick={() => setActiveTab('reports')}>System Audit Reports</TabBtn>
              <TabBtn active={activeTab === 'physicians'} onClick={() => setActiveTab('physicians')}>Physician Registry</TabBtn>
            </>
          )}
          {(user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && (
            <>
              <TabBtn active={activeTab === 'patients'} onClick={() => setActiveTab('patients')}>Patient Registry Directory</TabBtn>
              <TabBtn active={activeTab === 'book'}     onClick={() => setActiveTab('book')}>Scheduling / Check-in Portal</TabBtn>
            </>
          )}
          {user.role === 'DOCTOR' && (
            <>
              <TabBtn active={activeTab === 'appointments'} onClick={() => setActiveTab('appointments')}>My Scheduled Bookings</TabBtn>
              <TabBtn active={activeTab === 'queue'}        onClick={() => setActiveTab('queue')}>Active Calling Queue</TabBtn>
            </>
          )}
        </div>

        {/* Global notification */}
        {checkinMessage && (
          <div className="p-4 mb-6 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-between text-sm">
            <span>{checkinMessage}</span>
            <button onClick={() => setCheckinMessage('')} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}

        {/* ── PATIENT REGISTRY ───────────────────────────────────────────────── */}
        {activeTab === 'patients' && (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                    <ClipboardList className="h-5 w-5 text-teal-600" /> Patient Lookup Directory
                  </h3>

                  <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search className="h-4 w-4" />
                      </div>
                      {/* FIX: onChange no longer fires a fetch — debounced useEffect handles it */}
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Search by name, phone or email..."
                        className="block w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                      />
                    </div>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
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
                          <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold">
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
                              <td className="py-3.5 text-slate-500 dark:text-slate-400">{p.phoneNumber}</td>
                              <td className="py-3.5 text-slate-500 dark:text-slate-400">{p.age} yrs / {p.gender}</td>
                              <td className="py-3.5 text-right space-x-2">
                                <button
                                  onClick={() => handleQueueCheckin(p.id, doctorsList[0]?.id)}
                                  className="text-xxs px-2.5 py-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-500 hover:text-white transition-colors"
                                >
                                  Check In
                                </button>
                                {/* FIX: Only ADMIN users see the delete button — receptionist/doctor cannot delete */}
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
                    <span className="text-xs text-slate-400">
                      Page {patientsPagination.page} of {patientsPagination.totalPages}
                    </span>
                    <div className="flex gap-2">
                      <button
                        disabled={patientsPagination.page <= 1}
                        onClick={() => fetchPatients(patientsPagination.page - 1)}
                        className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-teal-500/10 disabled:opacity-50 text-xs font-semibold"
                      >Prev</button>
                      <button
                        disabled={patientsPagination.page >= patientsPagination.totalPages}
                        onClick={() => fetchPatients(patientsPagination.page + 1)}
                        className="px-3 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-teal-500/10 disabled:opacity-50 text-xs font-semibold"
                      >Next</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration form */}
              <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 h-fit">
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                  <UserPlus className="h-5 w-5 text-teal-600" /> New Registration
                </h3>
                {regMessage && (
                  <div className={`p-3 text-sm rounded-lg mb-4 ${regMessage.startsWith('Success') ? 'bg-teal-500/15 text-teal-600 border border-teal-500/20' : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'}`}>
                    {regMessage}
                  </div>
                )}
                <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div>
                    <label className="block mb-1">Patient Full Name*</label>
                    <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} placeholder="Bruce Wayne"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Age*</label>
                      <input type="number" required min="0" max="150" value={regAge} onChange={e => setRegAge(e.target.value)} placeholder="35"
                        className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100" />
                    </div>
                    <div>
                      <label className="block mb-1">Gender*</label>
                      <select value={regGender} onChange={e => setRegGender(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100">
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block mb-1">Contact Phone*</label>
                    <input type="text" required value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="555-0199"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block mb-1">Email Address</label>
                    <input type="email" value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="bruce@wayne.com"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100" />
                  </div>
                  <div>
                    <label className="block mb-1">Medical History</label>
                    <textarea value={regHistory} onChange={e => setRegHistory(e.target.value)} placeholder="E.g. cardiovascular risks..." rows="3"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100" />
                  </div>
                  <button type="submit" className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-lg mt-2">
                    Register Patient Record
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── SCHEDULING / CHECK-IN ──────────────────────────────────────────── */}
        {activeTab === 'book' && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-teal-600" /> Schedule Appointment Slot
              </h3>
              {bookingMessage && (
                <div className={`p-3 text-sm rounded-lg mb-4 ${bookingMessage.startsWith('Success') ? 'bg-teal-500/15 text-teal-600 border border-teal-500/20' : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'}`}>
                  {bookingMessage}
                </div>
              )}
              <form onSubmit={handleBookAppointment} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div>
                  <label className="block mb-1">Select Patient*</label>
                  <select required value={bookingPatientId} onChange={e => setBookingPatientId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100">
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phoneNumber})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Select Physician*</label>
                  <select required value={bookingDoctorId} onChange={e => setBookingDoctorId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100">
                    <option value="">-- Choose Physician --</option>
                    {doctorsList.map(d => <option key={d.id} value={d.id}>{d.name} - {d.specialization} (${d.consultationFee})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Date & Time*</label>
                  <input type="datetime-local" required value={bookingDate} onChange={e => setBookingDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100" />
                </div>
                <div>
                  <label className="block mb-1">Reason</label>
                  <input type="text" value={bookingReason} onChange={e => setBookingReason(e.target.value)} placeholder="Regular diagnostic review..."
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100" />
                </div>
                <button type="submit" className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-lg">Book Appointment Slot</button>
              </form>
            </div>

            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-teal-600" /> Direct Walk-In Check-In
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-semibold">
                Generate an immediate waiting token for a walk-in patient.
              </p>
              <div className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <div>
                  <label className="block mb-1">Walk-in Patient*</label>
                  <select id="walkin-patient" className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100">
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block mb-1">Assign Physician*</label>
                  <select id="walkin-doctor" className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-sm text-slate-900 dark:text-slate-100">
                    <option value="">-- Choose Physician --</option>
                    {doctorsList.map(d => <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>)}
                  </select>
                </div>
                <button
                  onClick={() => {
                    const pId = document.getElementById('walkin-patient').value;
                    const dId = document.getElementById('walkin-doctor').value;
                    if (!pId || !dId) { alert('Select patient and doctor first'); return; }
                    handleQueueCheckin(pId, dId);
                  }}
                  className="glow-btn w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 font-extrabold text-sm rounded-lg"
                >
                  Generate Live Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DOCTOR APPOINTMENTS ────────────────────────────────────────────── */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
                <CalendarDays className="h-5 w-5 text-teal-600" /> Scheduled Daily Bookings
              </h3>
              {doctorAppointments.length === 0 ? (
                <p className="text-center py-6 text-slate-400 text-sm">No appointments scheduled.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold">
                        <th className="pb-3">Time</th><th className="pb-3">Patient</th>
                        <th className="pb-3">Reason</th><th className="pb-3">Status</th>
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
                            <button onClick={() => setSelectedPatientHistory(app.patient)} className="font-bold text-teal-600 hover:underline">
                              {app.patient?.name || 'Unknown'}
                            </button>
                            <span className="block text-xxs text-slate-400 mt-0.5">Age: {app.patient?.age}</span>
                          </td>
                          <td className="py-3.5 text-slate-500 dark:text-slate-400 font-semibold">{app.reason || '—'}</td>
                          <td className="py-3.5">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xxs font-extrabold uppercase ${app.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-600' : app.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right space-x-2">
                            {app.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => { const d = doctorsList.find(d => d.userId === user.id); handleQueueCheckin(app.patientId, d?.id, app.id); }}
                                  className="text-xxs px-2.5 py-1 rounded bg-teal-500/10 text-teal-600 font-extrabold hover:bg-teal-500 hover:text-white transition-colors"
                                >Check In</button>
                                <button
                                  onClick={() => handleCompleteAppointment(app.id)}
                                  className="text-xxs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold hover:bg-teal-500 hover:text-white transition-colors"
                                >Complete</button>
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
                  {/* FIX: Crash fix — medicalHistory can be null for some patients (e.g. Bruce Wayne, Clark Kent).
                      Using optional chaining (?.) prevents "Cannot read properties of null" TypeError.
                      A friendly fallback message is shown when no history is recorded. */}
                  <p className="text-slate-700 dark:text-slate-300 leading-5 text-sm font-semibold">
                    {selectedPatientHistory.medicalHistory?.toUpperCase() ?? 'No medical history on record for this patient.'}
                  </p>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                  <Link
                    href={`/patients/${selectedPatientHistory.id}/history-records`}
                    className="text-teal-600 font-extrabold hover:underline flex items-center gap-1"
                  >
                    View Full Diagnostic History
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DOCTOR QUEUE ───────────────────────────────────────────────────── */}
        {activeTab === 'queue' && (
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-teal-600" /> Active Calling Queue
            </h3>
            {doctorQueue.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-sm">No checked-in patients today.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctorQueue.map((t) => (
                  <div key={t.id} className={`p-5 rounded-2xl border shadow-md flex flex-col justify-between ${t.status === 'CALLING' ? 'border-teal-500 bg-teal-500/10' : 'border-slate-200 dark:border-slate-800 bg-slate-500/5'}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100">Token #{t.tokenNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-xxs font-extrabold uppercase ${t.status === 'CALLING' ? 'bg-teal-500 text-white' : t.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-600' : 'bg-amber-500/10 text-amber-500'}`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{t.patient?.name}</h4>
                      <p className="text-xxs text-slate-400 mt-0.5">{t.patient?.phoneNumber}</p>
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
                            Skip
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

        {/* ── ADMIN REPORTS ──────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-teal-600" /> Doctor Revenue & Operations Report
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">
                    System-wide practitioner performance — optimized with parallel aggregation.
                  </p>
                </div>
                <button onClick={generateSystemReport} disabled={adminReportLoading}
                  className="glow-btn px-4 py-2 bg-teal-600 text-white font-extrabold text-xs rounded-lg shadow hover:bg-teal-700 disabled:opacity-50">
                  {adminReportLoading ? 'Aggregating...' : 'Load System Report'}
                </button>
              </div>

              {adminReportLoading ? (
                <div className="flex flex-col items-center py-12">
                  <div className="pulse-loader"><div></div><div></div></div>
                  <p className="mt-4 text-xs text-slate-400 animate-pulse">Running parallel aggregation queries...</p>
                </div>
              ) : !adminReportData ? (
                <div className="p-8 text-center bg-slate-100 dark:bg-slate-800/40 rounded-xl text-slate-400 text-xs font-semibold border border-dashed border-slate-200 dark:border-slate-700">
                  Click above to load reports.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 p-3 bg-teal-500/10 text-slate-700 dark:text-slate-300 text-xs rounded-lg border border-teal-500/20">
                    <Clock className="h-5 w-5 text-teal-500 shrink-0" />
                    <div>
                      <strong>Performance:</strong> Resolved in <span className="font-bold text-teal-500">{adminReportData.timeTakenMs} ms</span> using parallel Promise.all aggregation.
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-4 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Physicians</span>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{adminReportData.data.length}</h4>
                    </div>
                    <div className="p-4 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Appointments</span>
                      <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
                        {adminReportData.data.reduce((s, i) => s + i.totalAppointments, 0)}
                      </h4>
                    </div>
                    <div className="p-4 bg-slate-500/5 border border-slate-200 dark:border-slate-800 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider text-slate-400 font-bold">Total Revenue</span>
                      <h4 className="text-2xl font-black text-teal-600 dark:text-teal-400 mt-1">
                        ${adminReportData.data.reduce((s, i) => s + i.revenue, 0).toLocaleString()}
                      </h4>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                      <thead>
                        <tr className="text-slate-400 uppercase tracking-widest text-xxs font-bold">
                          <th className="pb-3">Doctor</th><th className="pb-3">Dept</th>
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
                              <span className="block text-xxs text-teal-600 font-semibold uppercase mt-0.5">{item.specialization}</span>
                            </td>
                            <td className="py-3.5 text-slate-500">{item.department}</td>
                            <td className="py-3.5 text-center text-slate-500">{item.completedAppointments} / {item.totalAppointments}</td>
                            <td className="py-3.5 text-center font-bold text-slate-800 dark:text-slate-200">{item.todayQueueSize}</td>
                            <td className="py-3.5 text-right font-bold text-teal-600 dark:text-teal-400">${item.revenue.toLocaleString()}</td>
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

        {/* ── PHYSICIAN REGISTRY (ADMIN) ─────────────────────────────────────── */}
        {activeTab === 'physicians' && (
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
            <div>
              <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Award className="h-5 w-5 text-teal-600" /> Staff Physicians Registry
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-semibold">Search now uses parameterized queries — safe against SQL injection.</p>
            </div>
            <div className="flex gap-4">
              <div className="relative flex-1 rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchPhysiciansAdmin()}
                  placeholder="Search physician name..."
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm"
                />
              </div>
              <button onClick={searchPhysiciansAdmin} className="glow-btn px-5 py-2 bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950 font-bold text-xs rounded-lg hover:bg-slate-800">
                Search
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctorsList.map((doc) => (
                <div key={doc.id} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-500/5 flex flex-col justify-between">
                  <div>
                    <span className="inline-flex px-2 py-0.5 rounded text-xxs font-extrabold uppercase bg-teal-500/10 text-teal-600 mb-2">{doc.department}</span>
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

// Helper: tab button
function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${active ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-400'}`}
    >
      {children}
    </button>
  );
}
