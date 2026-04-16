'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../context/auth.context';
import { apiFetch } from '../lib/api';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'light', setTheme: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const { user, loading } = useAuth();

  // On mount: apply localStorage preference to keep it in sync before auth loads
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
      document.documentElement.classList.toggle('dark', stored === 'dark');
    }
  }, []);

  // When auth resolves and user has a DB preference, treat it as source of truth
  useEffect(() => {
    if (!loading && user) {
      const dbTheme = (user as any).colorTheme as Theme | undefined;
      if (dbTheme === 'light' || dbTheme === 'dark') {
        setThemeState(dbTheme);
        localStorage.setItem('theme', dbTheme);
        document.documentElement.classList.toggle('dark', dbTheme === 'dark');
      }
    }
  }, [loading, user]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('theme', t);
    document.documentElement.classList.toggle('dark', t === 'dark');
    if (user) {
      apiFetch('/users/me', { method: 'PATCH', body: JSON.stringify({ colorTheme: t }) }).catch(() => {});
    }
  };

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
