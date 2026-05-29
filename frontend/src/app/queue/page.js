'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/common/Navbar';
import { Bell, Monitor, RefreshCw, AlertCircle, Users, Clock3 } from 'lucide-react';
import { io } from 'socket.io-client';

export default function QueueMonitor() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  
  const [refreshCount, setRefreshCount] = useState(0);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API_BASE_URL.replace(/\/api\/?$/, '');

  const fetchQueueData = async () => {
    try {
      // Insecure: Fetches queue without checking credentials (it's a public dashboard, which is fine, 
      // but it uses the hardcoded API domain)
      const res = await fetch(`${API_BASE_URL}/queue`);
      if (!res.ok) {
        throw new Error('Failed to retrieve active token queue.');
      }
      const data = await res.json();
      setTokens(data);
      setError('');
    } catch (err) {
      console.error('Queue poll fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueData();

    const socket = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
      setError('');
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    socket.on('connect_error', () => {
      setSocketConnected(false);
      setError('Live socket connection failed. Falling back to periodic refresh.');
    });

    socket.on('queue:created', (newToken) => {
      setTokens((currentTokens) => {
        const exists = currentTokens.some((token) => token.id === newToken.id);
        if (exists) return currentTokens;
        return [...currentTokens, newToken].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
      setLoading(false);
    });

    socket.on('queue:updated', (updatedToken) => {
      setTokens((currentTokens) =>
        currentTokens.map((token) => (token.id === updatedToken.id ? updatedToken : token))
      );
      setLoading(false);
    });

    const intervalId = setInterval(() => {
      fetchQueueData();
      setRefreshCount((prev) => prev + 1);
    }, 15000);

    return () => {
      clearInterval(intervalId);
      socket.disconnect();
    };
  }, []);

  // Group tokens by doctor
  const groupedTokens = tokens.reduce((groups, token) => {
    const docId = token.doctorId;
    if (!groups[docId]) {
      groups[docId] = {
        doctorName: token.doctor.name,
        specialization: token.doctor.specialization,
        calling: null,
        waiting: [],
      };
    }
    
    if (token.status === 'CALLING') {
      groups[docId].calling = token;
    } else if (token.status === 'WAITING') {
      groups[docId].waiting.push(token);
    }
    return groups;
  }, {});

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="app-shell queue-readable flex-1 w-full p-6 sm:p-8">
        {/* Header Dashboard Banner */}
        <div className="hero-shell mb-8 flex flex-col gap-6 rounded-3xl p-6 shadow-lg sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-700 p-3 text-white shadow-lg shadow-cyan-700/20">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black text-slate-950">
                Live Public Monitor Board
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-700">
                Real-time physician calling boards. Auto-syncs every 3 seconds.
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/15 px-3 py-1 text-xs font-black uppercase text-cyan-800 dark:text-cyan-300">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              {socketConnected ? 'Live Socket Connected' : 'Fallback Refresh'}
            </span>
            <div className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-black text-slate-500 dark:bg-slate-800">
              Polls: {refreshCount}
            </div>
            <div className="rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-xs font-black text-rose-700">
              {tokens.length} Tokens
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <strong>Sync Error:</strong> {error} - Please verify that the backend API server is online.
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="pulse-loader">
              <div></div>
              <div></div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-400">Loading active token queues...</p>
          </div>
        ) : Object.keys(groupedTokens).length === 0 ? (
          <div className="surface-card p-12 text-center">
            <Bell className="h-12 w-12 text-slate-400 mx-auto animate-bounce" />
            <h3 className="mt-4 text-lg font-bold text-slate-800 dark:text-slate-100">No Active Tokens</h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
              There are currently no patient check-ins registered for today. Use the receptionist portal in the Staff Dashboard to check-in patients.
            </p>
          </div>
        ) : (
          /* Grid of Doctor Calling Boards */
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Object.entries(groupedTokens).map(([docId, docInfo]) => (
              <div
                key={docId}
                className="surface-card flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30 hover:shadow-cyan-500/10"
              >
                {/* Doctor Title Header */}
                <div className="queue-card-header border-b p-5">
                  <h3 className="font-extrabold text-lg">{docInfo.doctorName}</h3>
                  <p className="mt-0.5 text-xs font-black uppercase">
                    {docInfo.specialization}
                  </p>
                </div>

                {/* Token Display Grid */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  {/* Current Active Token Box */}
                  <div className="mb-6">
                    <h4 className="queue-section-label text-xs font-black uppercase tracking-widest mb-2.5">
                      Now Calling
                    </h4>
                    {docInfo.calling ? (
                      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6 text-center shadow-inner dark:bg-cyan-500/5">
                        <span className="block text-5xl font-black text-cyan-800 dark:text-cyan-300">
                          #{docInfo.calling.tokenNumber}
                        </span>
                        <span className="mt-2 block text-xs font-black uppercase text-slate-700">
                          Patient: {docInfo.calling.patient.name}
                        </span>
                      </div>
                    ) : (
                      <div className="queue-idle-card p-6 rounded-2xl text-center shadow-inner">
                        <Clock3 className="mx-auto mb-2 h-6 w-6" />
                        <span className="block text-2xl font-extrabold">
                          Idle
                        </span>
                        <span className="block text-xs font-bold mt-2">
                          No active patients being called
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upcoming Tokens list */}
                  <div>
                    <h4 className="queue-section-label mb-2 flex items-center gap-1.5 text-xs font-black uppercase">
                      <Users className="h-3.5 w-3.5" />
                      Queue List
                    </h4>
                    {docInfo.waiting.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {docInfo.waiting.map((token) => (
                          <div
                            key={token.id}
                            className="queue-token-pill px-3 py-1.5 rounded-lg text-xs font-black"
                            title={`Patient: ${token.patient.name}`}
                          >
                            #{token.tokenNumber}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600 font-semibold italic block">
                        No upcoming patients in queue
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
