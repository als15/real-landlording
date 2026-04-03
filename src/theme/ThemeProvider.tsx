'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { lightTheme, darkTheme } from './config';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  resolved: 'light',
  setMode: () => {},
  toggle: () => {},
});

export function useThemeMode() {
  return useContext(ThemeContext);
}

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return getSystemPreference();
  return mode;
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  // Initialize from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('theme-mode') as ThemeMode | null;
    const initial = stored || 'light';
    setModeState(initial);
    setResolved(resolveTheme(initial));
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (mode === 'system') {
        setResolved(getSystemPreference());
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  // Apply data-theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);
  }, [resolved]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    setResolved(resolveTheme(newMode));
    localStorage.setItem('theme-mode', newMode);
  }, []);

  const toggle = useCallback(() => {
    const next = resolved === 'light' ? 'dark' : 'light';
    setMode(next);
  }, [resolved, setMode]);

  const antdThemeConfig = resolved === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ mode, resolved, setMode, toggle }}>
      <ConfigProvider theme={{
        ...antdThemeConfig,
        algorithm: resolved === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}>
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
