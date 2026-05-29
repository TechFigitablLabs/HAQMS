'use client';

import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

// FIX: Use NEXT_PUBLIC_ prefix so Next.js exposes this to the browser bundle.
// Plain API_BASE_URL is server-side only and resolves to undefined in client components.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!API_BASE_URL) {
  console.error('[AuthContext] NEXT_PUBLIC_API_BASE_URL is not set. All API calls will fail.');
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  // FIX: Wrapped in useCallback so it's stable for useEffect dependency arrays.
  const logout = useCallback(() => {
    // FIX: localStorage is acceptable for non-sensitive session state (token is not a
    // password). The real risk was storing it alongside cleartext credentials — which
    // we removed on the backend. httpOnly cookies are the gold standard for tokens, but
    // that requires a Next.js API route proxy; localStorage is a pragmatic middle ground
    // for this app. Documented here so the trade-off is explicit.
    localStorage.removeItem('haqms_token');
    localStorage.removeItem('haqms_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const storedToken = localStorage.getItem('haqms_token');
    const storedUser = localStorage.getItem('haqms_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
      } catch (e) {
        // FIX: Corrupted storage — clear it and force re-login.
        console.error('[AuthContext] Failed to parse stored user, clearing session.', e);
        logout();
      }
    }
    setLoading(false);
  }, [logout]);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      const receivedToken = data.data.token;
      const receivedUser = data.data.user;

      localStorage.setItem('haqms_token', receivedToken);
      localStorage.setItem('haqms_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);

      router.push('/dashboard');
      return { success: true };
    } catch (err) {
      console.error('[AuthContext] Login failed:', err.message);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // FIX: Role is no longer sent from the client — the backend always assigns RECEPTIONIST
        // on self-registration. Only an ADMIN can elevate roles server-side.
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      // Auto-login after successful registration.
      return login(email, password);
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        logout,
        // FIX: Expose API_BASE_URL from the single module-level constant, not from state.
        // Components that need it import this from context; no duplication needed.
        API_BASE_URL,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};