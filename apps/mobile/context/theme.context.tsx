import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  subtext: string;
  border: string;
  input: string;
  inputText: string;
  placeholder: string;
  tabBar: string;
  headerBg: string;
}

const LIGHT: ThemeColors = {
  bg: '#F9FAFB',
  card: '#ffffff',
  text: '#111827',
  subtext: '#6B7280',
  border: '#E5E7EB',
  input: '#ffffff',
  inputText: '#111827',
  placeholder: '#9CA3AF',
  tabBar: '#ffffff',
  headerBg: '#ffffff',
};

const DARK: ThemeColors = {
  bg: '#111827',
  card: '#1F2937',
  text: '#F9FAFB',
  subtext: '#9CA3AF',
  border: '#374151',
  input: '#1F2937',
  inputText: '#F9FAFB',
  placeholder: '#6B7280',
  tabBar: '#1F2937',
  headerBg: '#1F2937',
};

interface ThemeContextValue {
  theme: Theme;
  colors: ThemeColors;
  isDark: boolean;
  setTheme: (t: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  colors: LIGHT,
  isDark: false,
  setTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    AsyncStorage.getItem('theme').then((stored) => {
      if (stored === 'dark' || stored === 'light') setThemeState(stored);
    });
  }, []);

  const setTheme = async (t: Theme) => {
    setThemeState(t);
    await AsyncStorage.setItem('theme', t);
  };

  return (
    <ThemeContext.Provider value={{ theme, colors: theme === 'dark' ? DARK : LIGHT, isDark: theme === 'dark', setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
