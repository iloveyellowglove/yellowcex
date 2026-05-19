'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiPost, apiGet } from './api';
import type { User } from '@/types/shared';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  googleLogin: (googleId: string, email: string, name?: string, avatarUrl?: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('yellowcex_token');
    if (token) {
      apiGet<{ user: User }>('/api/auth/me')
        .then((res) => {
          if (res.success && res.data) setUser(res.data.user);
        })
        .catch(() => localStorage.removeItem('yellowcex_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiPost<{ user: User; token: string }>('/api/auth/login', { email, password });
    if (!res.success || !res.data) throw new Error(res.error || 'Login failed');
    localStorage.setItem('yellowcex_token', res.data.token);
    setUser(res.data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await apiPost<{ user: User; token: string }>('/api/auth/register', { email, password, name });
    if (!res.success || !res.data) throw new Error(res.error || 'Registration failed');
    localStorage.setItem('yellowcex_token', res.data.token);
    setUser(res.data.user);
  }, []);

  const googleLogin = useCallback(async (googleId: string, email: string, name?: string, avatarUrl?: string) => {
    const res = await apiPost<{ user: User; token: string }>('/api/auth/google', {
      googleId, email, name, avatar_url: avatarUrl,
    });
    if (!res.success || !res.data) throw new Error(res.error || 'Google login failed');
    localStorage.setItem('yellowcex_token', res.data.token);
    setUser(res.data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('yellowcex_token');
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, googleLogin, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
