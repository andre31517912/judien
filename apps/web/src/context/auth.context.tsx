'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch, setTokens, clearTokens } from '../lib/api';
import type { User } from '@judien/shared';

type AuthUser = Omit<User, 'passwordHash'>;

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  signup: (data: { email?: string; password: string; phone: string; displayName?: string; preferredLanguage: 'en' | 'zh'; inviteToken?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await apiFetch<AuthContextValue['user']>('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = async (identifier: string, password: string): Promise<AuthUser> => {
    const data = await apiFetch<{ user: AuthUser; accessToken: string; refreshToken?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setTokens(data.accessToken, data.refreshToken ?? null);
    setUser(data.user);
    return data.user;
  };

  const signup = async (body: { email?: string; password: string; phone: string; displayName?: string; preferredLanguage: 'en' | 'zh'; inviteToken?: string }) => {
    const data = await apiFetch<{ user: AuthUser; accessToken: string; refreshToken?: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    setTokens(data.accessToken, data.refreshToken ?? null);
    setUser(data.user);
  };

  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    clearTokens();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
