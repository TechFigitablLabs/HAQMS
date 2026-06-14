'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import { useRouter } from 'next/navigation';
import { 
  Users, CalendarDays, Activity, Search, Sparkles, UserPlus, 
  Trash2, ClipboardList, TrendingUp, DollarSign, Award, Clock,
  ArrowRight, ShieldAlert, CheckCircle, Volume2
} from 'lucide-react';

export default function Dashboard() {
  const { user, token, API_BASE_URL, logout } = useAuth();
  const router = useRouter();

  // Navigation Guard
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [router, user]);

  // Global State
  const [activeTab, setActiveTab] = useState(() => {
    if (user?.role === 'ADMIN') return 'reports';
    if (user?.role === 'RECEPTIONIST') return 'patients';
    return 'appointments';
  });

  // ==========================================
  // STATE FOR RECEPTIONIST WORKFLOWS
  // ==========================================
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientGender, setPatientGender] = useState('All');
  const [patientsPagination, setPatientsPagination] = useState({ page: 1, totalPages: 1 });
  
  // Registration Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regHistory, setRegHistory] = useState('');
  const [regMessage, setRegMessage] = useState('');

  // Queue and Appointment Booking
  const [doctorsList, setDoctorsList] = useState([]);
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [checkinMessage, setCheckinMessage] = useState('');

  // ==========================================
  // STATE FOR DOCTOR WORKFLOWS
  // ==========================================
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorQueue, setDoctorQueue] = useState([]);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);

  // ==========================================
  // STATE FOR ADMIN WORKFLOWS
  // ==========================================
  const [adminReportData, setAdminReportData] = useState(null);
  const [adminReportLoading, setAdminReportLoading] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  useEffect(() => {
    if (user?.role === 'ADMIN') setActiveTab('reports');
    if (user?.role === 'RECEPTIONIST') setActiveTab('patients');
    if (user?.role === 'DOCTOR') setActiveTab('appointments');
  }, [user?.role]);

  // ==========================================
  // RECEPTIONIST FUNCTIONS
  // ==========================================
  
  // Fetch Patients List
  const fetchPatients = async (page = 1) => {
    setPatientsLoading(true);
    try {
      // Inefficient memory pagination called from client
      const res = await fetch(`${API_BASE_URL}/patients?page=${page}&limit=5&search=${patientSearch}&gender=${patientGender}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPatients(data.patients);
        setPatientsPagination({
          page: data.pagination.page,
          totalPages: data.pagination.totalPages,
          totalPatients: data.pagination.totalPatients
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPatientsLoading(false);
    }
  };

  // Trigger Patient List Fetch (Every keystroke trigger re-renders parent! - Performance bug)
  useEffect(() => {
    if (user?.role === 'RECEPTIONIST' || user?.role === 'ADMIN') {
      fetchPatients(1);
    }
  }, [patientSearch, patientGender, user?.role]);

  // Fetch Doctors for booking drop-down
  const fetchDoctorsDropdown = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setDoctorsList(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) fetchDoctorsDropdown();
  }, [token]);

  // Handle Patient Registration
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegMessage('');

    // INCONSISTENT VALIDATION: Receptionist form doesn't validate telephone structure on client, 
    // leading to database pollution (e.g. text telephone values)
    if (!regName || !regPhone || !regAge) {
      setRegMessage('Error: Name, Age and Phone number are required.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phoneNumber: regPhone,
          age: regAge,
          gender: regGender,
          medicalHistory: regHistory
        })
      });

      const data = await res.json();
      if (res.ok) {
        setRegMessage('Success: Patient registered successfully!');
        // Clear fields
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegAge('');
        setRegHistory('');
        // Refresh directory
        fetchPatients(1);
      } else {
        setRegMessage(`Error: ${data.error || 'Failed to register'}`);
      }
    } catch (err) {
      setRegMessage(`Error: ${err.message}`);
    }
  };

  // Handle Appointment Booking
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId: bookingPatientId,
          doctorId: bookingDoctorId,
          appointmentDate: bookingDate,
          reason: bookingReason
        })
      });

      const data = await res.json();
      if (res.ok) {
        setBookingMessage('Success: Appointment booked successfully!');
        setBookingReason('');
        if (user?.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setBookingMessage(`Error: ${data.error || 'Failed to book'}`);
      }
    } catch (err) {
      setBookingMessage(`Error: ${err.message}`);
    }
  };

  // Delete Patient (Bypassed authorization admin check!)
  const handleDeletePatient = async (id) => {
    if (!confirm('Are you sure you want to delete this patient record?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'Patient deleted.');
        fetchPatients(patientsPagination.page);
      } else {
        alert(`Error: ${data.error || 'Unauthorized deletion!'}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Queue Token Checkin (Race condition API!)
  const handleQueueCheckin = async (patientId, doctorId, appointmentId = null) => {
    setCheckinMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/queue/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ patientId, doctorId, appointmentId })
      });
      const data = await res.json();
      if (res.ok) {
        setCheckinMessage(`Checked in! Generated Token #${data.token.tokenNumber}`);
        if (user?.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setCheckinMessage(`Error check-in: ${data.error}`);
      }
    } catch (err) {
      setCheckinMessage(`Error: ${err.message}`);
    }
  };

  // ==========================================
  // DOCTOR WORKFLOW FUNCTIONS
  // ==========================================
  const fetchDoctorWorklist = async () => {
    if (user?.role !== 'DOCTOR') return;
    try {
      // Find matching doctor from doctors dropdown using user ID link
      const matchedDoc = doctorsList.find(d => d.userId === user.id);
      if (!matchedDoc) return;

      // 1. Fetch appointments for this doctor (N+1 database queries triggers inside server)
      const appRes = await fetch(`${API_BASE_URL}/appointments?doctorId=${matchedDoc.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const appData = await appRes.json();
      if (appData.success) {
        setDoctorAppointments(appData.appointments);
      }

      // 2. Fetch queue list for this doctor today
      const queueRes = await fetch(`${API_BASE_URL}/queue?doctorId=${matchedDoc.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const queueData = await queueRes.json();
      setDoctorQueue(queueData);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user?.role === 'DOCTOR' && doctorsList.length > 0) {
      fetchDoctorWorklist();
    }
  }, [doctorsList, user?.role]);

  // Update token status (WAITING -> CALLING -> COMPLETED / SKIPPED)
  const handleUpdateQueueStatus = async (tokenId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/queue/${tokenId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchDoctorWorklist();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Complete consultation of an appointment
  const handleCompleteAppointment = async (appId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/appointments/${appId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (res.ok) {
        fetchDoctorWorklist();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // ==========================================
  // ADMIN SYSTEM WORKFLOWS
  // ==========================================
  
  // Slow report generator fetch
  const generateSystemReport = async () => {
    setAdminReportLoading(true);
    try {
      // Calls slow nested aggregation endpoint
      const res = await fetch(`${API_BASE_URL}/reports/doctor-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAdminReportData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdminReportLoading(false);
    }
  };

  const downloadAuditReport = () => {
    if (!adminReportData || !adminReportData.data) return;
    
    // Create CSV header
    const headers = ['Doctor Name', 'Specialization', 'Department', 'Completed Appointments', 'Total Appointments', 'Today Queue Size', 'Revenue ($)'];
    
    // Create CSV rows
    const rows = adminReportData.data.map(item => [
      item.name,
      item.specialization,
      item.department,
      item.completedAppointments,
      item.totalAppointments,
      item.todayQueueSize,
      item.revenue
    ]);
    
    // Add summary rows
    const totalAppointments = adminReportData.data.reduce((sum, item) => sum + item.totalAppointments, 0);
    const totalRevenue = adminReportData.data.reduce((sum, item) => sum + item.revenue, 0);
    rows.push([], ['SUMMARY', '', '', '', totalAppointments, '', totalRevenue]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Search Doctors (SQL Injection vulnerable API!)
  const searchPhysiciansAdmin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/doctors?search=${adminSearchQuery}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setDoctorsList(data);
      } else {
        alert(`API Error: ${data.sqlMessage || data.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="app-shell dashboard-readable flex-1 w-full p-6 sm:p-8">
        
        {/* Navigation Tabs based on Role */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 mb-8 overflow-x-auto gap-4">
          {user.role === 'ADMIN' && (
            <>
              <button
                onClick={() => setActiveTab('reports')}
                className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'reports' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-600 dark:text-slate-400'}`}
              >
                System Audit Reports
              </button>
              <button
                onClick={() => setActiveTab('physicians')}
                className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'physicians' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-600 dark:text-slate-400'}`}
              >
                Physician Registry
              </button>
            </>
          )}

          {(user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && (
            <>
              <button
                onClick={() => setActiveTab('patients')}
                className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'patients' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-600 dark:text-slate-400'}`}
              >
                Patient Registry Directory
              </button>
              <button
                onClick={() => setActiveTab('book')}
                className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'book' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-600 dark:text-slate-400'}`}
              >
                Scheduling / Check-in Portal
              </button>
            </>
          )}

          {user.role === 'DOCTOR' && (
            <>
              <button
                onClick={() => setActiveTab('appointments')}
                className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'appointments' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-600 dark:text-slate-400'}`}
              >
                My Scheduled Bookings
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`py-3.5 px-1 border-b-2 font-bold text-sm transition-all whitespace-nowrap ${activeTab === 'queue' ? 'border-teal-500 text-teal-600 dark:text-teal-400' : 'border-transparent text-slate-600 dark:text-slate-400'}`}
              >
                Active Calling Queue
              </button>
            </>
          )}
        </div>

        {/* Global Notifications Panel */}
        {checkinMessage && (
          <div className="p-4 mb-6 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-between text-sm">
            <span>{checkinMessage}</span>
            <button onClick={() => setCheckinMessage('')} className="font-bold underline text-xs">Dismiss</button>
          </div>
        )}

        {/* ==============================================================
            TAB: PATIENT REGISTRY (RECEPTIONIST & ADMIN)
            ============================================================== */}
        {activeTab === 'patients' && (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Directory Section */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                    <ClipboardList className="h-6 w-6 text-teal-600" />
                    Patient Lookup Directory
                  </h3>
                  <p className="text-sm text-teal-700 dark:text-teal-300 mb-4 font-semibold">Search and manage patient records from the registry</p>

                  {/* Filters (Causes slow re-renders on keystroke) */}
                  <div className="flex gap-4 mb-6">
                    <div className="relative flex-1 rounded-lg shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
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

                  {/* Table listing */}
                  {patientsLoading ? (
                    <p className="text-center py-6 text-teal-700 dark:text-teal-300 animate-pulse text-sm font-semibold">Synchronizing table data...</p>
                  ) : patients.length === 0 ? (
                    <p className="text-center py-6 text-teal-700 dark:text-teal-300 text-sm font-semibold">No registered patients match this filter.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                        <thead>
                          <tr className="bg-teal-700 text-white uppercase tracking-widest text-xxs font-black border-b border-teal-800">
                            <th className="pb-3 px-3">Name</th>
                            <th className="pb-3 px-3">Contact</th>
                            <th className="pb-3 px-3">Age/Sex</th>
                            <th className="pb-3 px-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                          {patients.map((p) => (
                            <tr key={p.id} className="hover:bg-teal-50/50 dark:hover:bg-teal-950/50 transition-colors">
                              <td className="py-3.5 px-3 font-bold text-slate-900 dark:text-slate-50">
                                {p.name}
                                {p.email && <span className="block text-xxs text-teal-700 dark:text-teal-300 font-semibold mt-0.5">{p.email}</span>}
                              </td>
                              <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-semibold">{p.phoneNumber}</td>
                              <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300">
                                {p.age} yrs / <span className="capitalize">{p.gender}</span>
                              </td>
                              <td className="py-3.5 text-right space-x-2">
                                <button
                                  onClick={() => handleQueueCheckin(p.id, doctorsList[0]?.id)}
                                  className="text-xxs px-2.5 py-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-500 hover:text-white transition-colors"
                                >
                                  Check In
                                </button>
                                
                                {/* Security flaw testing: Receptionist or doctor can delete since check is bypassed */}
                                <button
                                  onClick={() => handleDeletePatient(p.id)}
                                  className="text-xxs p-1 rounded bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                                  title="Delete patient record"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination control */}
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-600 font-medium">
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

              {/* Registration Form */}
              <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 h-fit">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                  <UserPlus className="h-6 w-6 text-teal-600" />
                  New Patient Registration
                </h3>
                <p className="text-sm text-teal-700 dark:text-teal-300 mb-4 font-semibold">Register a new patient into the system</p>

                {regMessage && (
                  <div className={`p-3 text-sm rounded-lg mb-4 ${regMessage.startsWith('Success') ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20' : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'}`}>
                    {regMessage}
                  </div>
                )}

                <form onSubmit={handleRegisterPatient} className="space-y-4 text-xs font-semibold text-teal-700 dark:text-teal-300">
                  <div>
                    <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Patient Full Name*</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Bruce Wayne"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-1">Age (Years)*</label>
                      <input
                        type="number"
                        required
                        value={regAge}
                        onChange={(e) => setRegAge(e.target.value)}
                        placeholder="35"
                        className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Gender*</label>
                      <select
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                        className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Contact Phone*</label>
                    <input
                      type="text"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="555-0199 (Unchecked format)"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Email Address</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="bruce@wayne.com"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Medical Anamnesis / History (Can be left blank)</label>
                    <textarea
                      value={regHistory}
                      onChange={(e) => setRegHistory(e.target.value)}
                      placeholder="E.g. cardiovascular risks, asthma..."
                      rows="3"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-lg shadow-md transition-colors duration-300 mt-2"
                  >
                    Register Patient Record
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB: SCHEDULING / BOOKING & CHECKIN (RECEPTIONIST & ADMIN)
            ============================================================== */}
        {activeTab === 'book' && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Book Appointment Card */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <CalendarDays className="h-6 w-6 text-teal-600" />
                Book an Appointment
              </h3>
              <p className="text-sm text-teal-700 dark:text-teal-300 mb-4 font-semibold">Schedule a consultation with an available physician</p>

              {bookingMessage && (
                <div className={`p-3 text-sm rounded-lg mb-4 ${bookingMessage.startsWith('Success') ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/20' : 'bg-rose-500/15 text-rose-500 border border-rose-500/20'}`}>
                  {bookingMessage}
                </div>
              )}

              <form onSubmit={handleBookAppointment} className="space-y-4 text-xs font-semibold text-teal-700 dark:text-teal-300">
                <div>
                  <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Select Registered Patient*</label>
                  <select
                    required
                    value={bookingPatientId}
                    onChange={(e) => setBookingPatientId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phoneNumber})</option>
                    ))}
                  </select>
                  <span className="text-xxs text-teal-600 dark:text-teal-400 block mt-1 font-semibold">If client is missing, register them in the Directory tab first.</span>
                </div>

                <div>
                  <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Select Physician*</label>
                  <select
                    required
                    value={bookingDoctorId}
                    onChange={(e) => setBookingDoctorId(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                  >
                    <option value="">-- Choose Physician --</option>
                    {doctorsList.map(d => (
                      <option key={d.id} value={d.id}>{d.name} - {d.specialization} (${d.consultationFee})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Appointment Date & Time*</label>
                  <input
                    type="datetime-local"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-1">Consultation Objective / Reason</label>
                  <input
                    type="text"
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="Regular diagnostic review, suture removal..."
                    className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="glow-btn w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-lg shadow-md transition-colors duration-300 mt-2"
                >
                  Book Appointment Slot
                </button>
              </form>
            </div>

            {/* Quick Walkin Checkin Token Board */}
            <div className="glass p-6 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <Activity className="h-6 w-6 text-rose-600" />
                Direct Queue Check-In
              </h3>
              <p className="text-sm text-teal-700 dark:text-teal-300 mb-4 font-semibold">Generate queue token for walk-in patients</p>

              <div className="space-y-6">
                <div className="p-4 rounded-xl border border-teal-500/25 bg-teal-500/10 text-slate-700 dark:text-slate-300 text-xs leading-5">
                  <strong>Token Generation Engine Note:</strong> Direct arrivals bypass appointments. The token engine automatically fetches the current days maximum token size and increments. 
                  <span className="block mt-1 font-bold text-rose-500 uppercase tracking-wide">Warning: Vulnerable to check-in race conditions!</span>
                </div>

                <div className="space-y-4 text-xs font-semibold text-teal-700 dark:text-teal-300">
                  <div>
                    <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Select Walk-in Patient*</label>
                    <select
                      id="walkin-patient"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                    >
                      <option value="">-- Choose Patient --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-teal-700 dark:text-teal-300 font-bold">Assign Physician*</label>
                    <select
                      id="walkin-doctor"
                      className="block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                    >
                      <option value="">-- Choose Physician --</option>
                      {doctorsList.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      const pId = document.getElementById('walkin-patient').value;
                      const dId = document.getElementById('walkin-doctor').value;
                      if (!pId || !dId) {
                        alert('Select patient and doctor first');
                        return;
                      }
                      handleQueueCheckin(pId, dId);
                    }}
                    className="glow-btn w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 font-extrabold text-sm rounded-lg shadow-md transition-colors duration-300 mt-2"
                  >
                    Generate Live Token
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB: DOCTOR WORKLIST - APPOINTMENTS (DOCTOR ROLE)
            ============================================================== */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                <CalendarDays className="h-6 w-6 text-teal-600" />
                My Scheduled Appointments
              </h3>
              <p className="text-sm text-teal-700 dark:text-teal-300 mb-4 font-semibold">View your upcoming consultations and bookings</p>

              {doctorAppointments.length === 0 ? (
                <p className="text-center py-6 text-teal-700 dark:text-teal-300 text-sm font-semibold">No appointments scheduled for you today.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm text-left">
                    <thead>
                      <tr className="bg-cyan-700 text-white uppercase tracking-widest text-xxs font-black border-b border-cyan-800">
                        <th className="pb-3 px-3">Time</th>
                        <th className="pb-3 px-3">Patient</th>
                        <th className="pb-3 px-3">Consultation Reason</th>
                        <th className="pb-3 px-3">Status</th>
                        <th className="pb-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                      {doctorAppointments.map((app) => (
                        <tr key={app.id} className="hover:bg-cyan-50/50 dark:hover:bg-cyan-950/50 transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-slate-900 dark:text-slate-50">
                            {new Date(app.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3.5 px-3">
                            <button
                              onClick={() => setSelectedPatientHistory(app.patient)}
                              className="font-bold text-cyan-700 hover:underline hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200 transition-colors"
                            >
                              {app.patient ? app.patient.name : 'Unknown Patient'}
                            </button>
                            <span className="block text-xxs text-cyan-600 dark:text-cyan-400 mt-0.5 font-semibold">Age: {app.patient?.age}</span>
                          </td>
                          <td className="py-3.5 px-3 text-slate-700 dark:text-slate-300 font-semibold">{app.reason || 'None provided'}</td>
                          <td className="py-3.5 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase ${app.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-600' : app.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3.5 text-right space-x-2">
                            {app.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => {
                                    const matchedDoc = doctorsList.find(d => d.userId === user.id);
                                    handleQueueCheckin(app.patientId, matchedDoc.id, app.id);
                                  }}
                                  className="text-xxs px-2.5 py-1 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold hover:bg-teal-500 hover:text-white transition-colors"
                                >
                                  Check In Patient
                                </button>
                                <button
                                  onClick={() => handleCompleteAppointment(app.id)}
                                  className="text-xxs px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-extrabold hover:bg-teal-500 hover:text-white transition-colors"
                                >
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

            {/* Patient Clinical History Modal Display */}
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
                  <button 
                    onClick={() => setSelectedPatientHistory(null)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600"
                  >
                    Close
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                  <h4 className="font-bold text-slate-400 uppercase tracking-wider">Clinical Background Information</h4>
                  
                  <p className="text-slate-700 dark:text-slate-300 leading-5 text-sm font-semibold">
                    {selectedPatientHistory.medicalHistory
                      ? selectedPatientHistory.medicalHistory.toUpperCase()
                      : 'No clinical background has been recorded for this patient yet.'}
                  </p>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                  {/* Incomplete Missing Route trigger -> will route to 404 page! */}
                  <Link 
                    href={`/patients/${selectedPatientHistory.id}/history-records`} 
                    className="text-teal-600 font-extrabold hover:underline flex items-center gap-1"
                  >
                    View Diagnostic Reports Details (Legacy App)
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            TAB: DOCTOR ACTIVE CALLING QUEUE (DOCTOR ROLE)
            ============================================================== */}
        {activeTab === 'queue' && (
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2 mb-2">
              <Award className="h-6 w-6 text-teal-600" />
              Active Queue & Patient Calling
            </h3>
            <p className="text-sm text-teal-700 dark:text-teal-300 mb-4 font-semibold">Manage current patients in queue and call next patient</p>

            {doctorQueue.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-sm">No checked-in patients in queue today.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {doctorQueue.map((t) => (
                  <div
                    key={t.id}
                    className={`p-5 rounded-2xl border shadow-md relative overflow-hidden flex flex-col justify-between ${t.status === 'CALLING' ? 'border-teal-600 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-950 dark:to-teal-900' : 'border-slate-300 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-2xl font-black text-teal-900 dark:text-teal-100">Token #{t.tokenNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-xxs font-extrabold tracking-wide uppercase ${t.status === 'CALLING' ? 'bg-teal-500 text-white' : t.status === 'COMPLETED' ? 'bg-teal-500/10 text-teal-600' : 'bg-amber-500/10 text-amber-500'}`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-teal-900 dark:text-teal-100">{t.patient.name}</h4>
                      <p className="text-xxs text-teal-700 dark:text-teal-300 font-semibold mt-0.5">Contact: {t.patient.phoneNumber}</p>
                    </div>

                    <div className="mt-6 flex gap-2">
                      {t.status === 'WAITING' && (
                        <button
                          onClick={() => handleUpdateQueueStatus(t.id, 'CALLING')}
                          className="flex-1 py-1.5 bg-teal-600 text-white font-bold text-xxs rounded hover:bg-teal-700 transition-colors"
                        >
                          Call Patient
                        </button>
                      )}
                      {t.status === 'CALLING' && (
                        <>
                          <button
                            onClick={() => handleUpdateQueueStatus(t.id, 'COMPLETED')}
                            className="flex-1 py-1.5 bg-teal-600 text-white font-bold text-xxs rounded hover:bg-teal-700 transition-colors"
                          >
                            Consulted
                          </button>
                          <button
                            onClick={() => handleUpdateQueueStatus(t.id, 'SKIPPED')}
                            className="flex-1 py-1.5 bg-rose-500/10 text-rose-500 font-bold text-xxs rounded hover:bg-rose-500 hover:text-white transition-colors"
                          >
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

        {/* ==============================================================
            TAB: SYSTEM REPORTS (ADMIN ROLE)
            ============================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
            <div className="audit-report surface-card bg-white/95 p-6 shadow-xl">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-cyan-700" />
                    System Audit Reports
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mt-1">
                    System-wide practitioner performance audits. Computes completed bookings and potential sales.
                  </p>
                </div>
                <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={generateSystemReport}
                    disabled={adminReportLoading}
                    className="glow-btn rounded-xl bg-cyan-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-700/20 transition-colors hover:bg-cyan-800 disabled:opacity-50"
                  >
                    {adminReportLoading ? 'Aggregating...' : 'Load Doctor System Audit Report'}
                  </button>
                  {adminReportData && (
                    <button
                      onClick={downloadAuditReport}
                      className="glow-btn rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal-600/20 transition-colors hover:bg-teal-700 flex items-center gap-2"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download CSV
                    </button>
                  )}
                </div>
              </div>

              {adminReportLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="pulse-loader">
                    <div></div>
                    <div></div>
                  </div>
                  <p className="mt-4 text-xs font-semibold text-slate-400 animate-pulse">
                    Executing sequential nested loop aggregates. Event loop is locked...
                  </p>
                </div>
              ) : !adminReportData ? (
                <div className="rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/80 p-8 text-center text-sm font-bold leading-6 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                  Click the button above to load reports. Warning: Endpoint is extremely slow on larger doctor count tables!
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Reporting details benchmark */}
                  <div className="flex items-center gap-3 p-3 bg-amber-500/10 text-slate-700 dark:text-slate-300 text-xs rounded-lg border border-amber-500/20 leading-5">
                    <Clock className="h-5 w-5 text-amber-500 shrink-0" />
                    <div>
                      <strong>Performance Diagnostic:</strong> API execution resolved in{' '}
                      <span className="font-bold text-amber-500">{adminReportData.timeTakenMs} ms</span>. 
                      Sequential nested database calls loops reduce throughput. Optimization using Promise.all or single join aggregate is required.
                    </div>
                  </div>

                  {/* Summary widgets */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="audit-kpi audit-kpi-cyan p-5 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider font-black">Total Physicians</span>
                      <h4 className="text-3xl font-black mt-2">{adminReportData.data.length}</h4>
                    </div>
                    <div className="audit-kpi audit-kpi-teal p-5 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider font-black">Sum appointments</span>
                      <h4 className="text-3xl font-black mt-2">
                        {adminReportData.data.reduce((sum, item) => sum + item.totalAppointments, 0)}
                      </h4>
                    </div>
                    <div className="audit-kpi audit-kpi-rose p-5 rounded-xl">
                      <span className="text-xxs uppercase tracking-wider font-black">Total Sales ($)</span>
                      <h4 className="text-3xl font-black mt-2">
                        ${adminReportData.data.reduce((sum, item) => sum + item.revenue, 0)}
                      </h4>
                    </div>
                  </div>

                  {/* Table representation */}
                  <div className="audit-table-wrap overflow-x-auto">
                    <table className="audit-table min-w-full text-sm text-left">
                      <thead>
                        <tr className="uppercase tracking-widest text-xxs font-black">
                          <th className="px-4 py-3">Doctor</th>
                          <th className="px-4 py-3">Department</th>
                          <th className="px-4 py-3 text-center">Consultations</th>
                          <th className="px-4 py-3 text-center">Today Queue</th>
                          <th className="px-4 py-3 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminReportData.data.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-4 font-bold">
                              {item.name}
                              <span className="audit-specialty block text-xxs font-black uppercase mt-0.5">{item.specialization}</span>
                            </td>
                            <td className="px-4 py-4 font-semibold">{item.department}</td>
                            <td className="px-4 py-4 text-center font-semibold">
                              {item.completedAppointments} Completed / {item.totalAppointments} Total
                            </td>
                            <td className="px-4 py-4 text-center font-black">{item.todayQueueSize} in queue</td>
                            <td className="audit-revenue px-4 py-4 text-right font-black">${item.revenue}</td>
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

        {/* ==============================================================
            TAB: PHYSICIAN REGISTRY (ADMIN ROLE - SQL INJECTION VULNERABILITY)
            ============================================================== */}
        {activeTab === 'physicians' && (
          <div className="glass p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md space-y-6">
              <div className="mb-4">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 mb-2">
                  <Award className="h-6 w-6 text-teal-600 flex-shrink-0" />
                  <span>Physician Registry Lookup</span>
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold">
                  Search and manage physician credentials and specializations
                </p>
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
                  placeholder="Enter physician name search criteria (raw syntax supported)..."
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                />
              </div>

              <button
                onClick={searchPhysiciansAdmin}
                className="glow-btn px-5 py-2 bg-slate-900 text-white dark:bg-teal-500 dark:text-slate-950 font-bold text-xs rounded-lg hover:bg-slate-800 dark:hover:bg-teal-400 transition-colors"
              >
                Execute SQL Query
              </button>
            </div>

            <div className="p-3 bg-rose-500/10 text-rose-500 text-xs rounded-lg border border-rose-500/20 font-semibold leading-5 flex gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <strong>SQL Vulnerability alert:</strong> This search executes raw interpolation: 
                <code className="block bg-black/10 dark:bg-black/30 p-1.5 rounded mt-1 font-mono">
                  SELECT * FROM &quot;Doctor&quot; WHERE name ILIKE &apos;%&#123;query&#125;%&apos;
                </code>
                Can be audited by inputting standard SQL injection strings to leak full user login lists.
              </div>
            </div>

            {/* Doctors Result List */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {doctorsList.map((doc, index) => {
                const cardAccents = [
                  'from-teal-600 to-cyan-600 border-teal-200',
                  'from-sky-700 to-teal-600 border-sky-200',
                  'from-slate-700 to-cyan-700 border-slate-200',
                ];
                const accent = cardAccents[index % cardAccents.length];

                return (
                <div
                  key={doc.id}
                  className="physician-card relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${accent}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="physician-card-badge inline-flex rounded-full px-2.5 py-1 text-xxs font-black uppercase tracking-wider">
                          {doc.department}
                        </span>
                        <h4 className="physician-card-name mt-3 text-base font-black">{doc.name}</h4>
                        <p className="physician-card-specialty mt-1 text-xs font-bold">{doc.specialization}</p>
                      </div>
                      <div className="physician-card-icon rounded-xl p-2">
                        <Award className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="physician-card-meta mt-5 grid grid-cols-2 gap-3 border-t pt-4">
                      <div className="physician-card-stat rounded-xl px-3 py-2">
                        <span className="block text-xxs font-black uppercase tracking-wider">
                          Experience
                        </span>
                        <strong className="mt-1 block text-sm font-black">
                          {doc.experience} yrs
                        </strong>
                      </div>
                      <div className="physician-card-stat physician-card-fee rounded-xl px-3 py-2">
                        <span className="block text-xxs font-black uppercase tracking-wider">
                          Fee
                        </span>
                        <strong className="mt-1 block text-sm font-black">
                          ${doc.consultationFee}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
