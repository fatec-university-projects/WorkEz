import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Appearance, Platform, useColorScheme as useRNColorScheme } from 'react-native';
import { usePathname } from 'expo-router';
import { DarkColors, LightColors, applyWorkEzThemePalette } from '../constants/theme';
import { safeStorage } from '../services/storage';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextData {
  mode: ThemeMode;
  isDark: boolean;
  colors: typeof LightColors;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleTheme: () => Promise<void>;
}

const STORAGE_KEY_THEME = '@workez_theme_mode';

const LIGHT_ONLY_ROUTES = new Set([
  '',
  '/',
  '/index',
  '/onboarding',
  '/profile-choice',
  '/login',
  '/signup',
  '/provider/signup',
  '/provider/documents',
  '/provider/references',
  '/provider/interview',
  '/provider/analysis',
]);

function isLightOnlyPathname(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return LIGHT_ONLY_ROUTES.has(normalized);
}

const ThemeContext = createContext<ThemeContextData>({
  mode: 'light',
  isDark: false,
  colors: LightColors,
  setMode: async () => {},
  toggleTheme: async () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const pathname = usePathname();
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    let mounted = true;
    safeStorage
      .getItem(STORAGE_KEY_THEME)
      .then((saved) => {
        if (mounted && (saved === 'light' || saved === 'dark' || saved === 'system')) {
          setModeState(saved);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const forceLight = isLightOnlyPathname(pathname);

  const isDark = useMemo(() => {
    if (forceLight) {
      return false;
    }
    if (mode === 'system') {
      return systemScheme === 'dark';
    }
    return mode === 'dark';
  }, [forceLight, mode, systemScheme]);

  const colors = useMemo(() => {
    applyWorkEzThemePalette(isDark);
    return isDark ? DarkColors : LightColors;
  }, [isDark]);

  // Sincroniza paleta global, classe HTML (Web/NativeWind) e Appearance nativo
  useEffect(() => {
    applyWorkEzThemePalette(isDark);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (Platform.OS !== 'web' && typeof Appearance?.setColorScheme === 'function') {
      try {
        Appearance.setColorScheme(forceLight ? 'light' : mode === 'system' ? 'unspecified' : mode);
      } catch {
        // Ignora caso o ambiente não permita override manual
      }
    }
  }, [isDark, mode, forceLight]);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    const nextIsDark = !forceLight && (newMode === 'system' ? systemScheme === 'dark' : newMode === 'dark');
    applyWorkEzThemePalette(nextIsDark);
    setModeState(newMode);
    try {
      await safeStorage.setItem(STORAGE_KEY_THEME, newMode);
    } catch {}
  }, [forceLight, systemScheme]);

  const toggleTheme = useCallback(async () => {
    const currentlyDark = mode === 'system' ? systemScheme === 'dark' : mode === 'dark';
    const next: ThemeMode = currentlyDark ? 'light' : 'dark';
    await setMode(next);
  }, [mode, systemScheme, setMode]);

  const value = useMemo(
    () => ({
      mode,
      isDark,
      colors,
      setMode,
      toggleTheme,
    }),
    [mode, isDark, colors, setMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
