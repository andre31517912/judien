import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../lib/api';
import type { User } from '@judien/shared';

interface AuthContextValue {
  user: Omit<User, 'passwordHash'> | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  signup: (data: { email: string; password: string; phone: string; displayName?: string; preferredLanguage: 'en' | 'zh'; inviteToken: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  const init = useCallback(async () => {
    const token = await SecureStore.getItemAsync('access_token');
    if (!token) { setLoading(false); return; }
    try {
      const me = await apiFetch<AuthContextValue['user']>('/auth/me');
      setUser(me);
    } catch {
      await SecureStore.deleteItemAsync('access_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { init(); }, [init]);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ user: AuthContextValue['user']; accessToken: string; refreshToken?: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ identifier: email, password }) },
    );
    if (data.accessToken) await SecureStore.setItemAsync('access_token', data.accessToken);
    if (data.refreshToken) await SecureStore.setItemAsync('refresh_token', data.refreshToken);
    setUser(data.user);
  };

  const signup = async (body: { email: string; password: string; phone: string; displayName?: string; preferredLanguage: 'en' | 'zh'; inviteToken: string }) => {
    const data = await apiFetch<{ user: AuthContextValue['user']; accessToken: string; refreshToken?: string }>(
      '/auth/signup',
      { method: 'POST', body: JSON.stringify(body) },
    );
    if (data.accessToken) await SecureStore.setItemAsync('access_token', data.accessToken);
    if (data.refreshToken) await SecureStore.setItemAsync('refresh_token', data.refreshToken);
    setUser(data.user);
  };

  const loginWithTokens = async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync('access_token', accessToken);
    await SecureStore.setItemAsync('refresh_token', refreshToken);
    const me = await apiFetch<AuthContextValue['user']>('/auth/me');
    setUser(me);
  };

  const logout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    setUser(null);
  };

  const refresh = async () => {
    try {
      const me = await apiFetch<AuthContextValue['user']>('/auth/me');
      setUser(me);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, loginWithTokens, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
