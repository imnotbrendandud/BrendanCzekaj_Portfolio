'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isTheme,
  nextTheme,
  resolveTimeZone,
  themeForDate,
  type Theme,
} from '@/lib/theme';

/** How often to re-check the wall clock so a tab left open changes with the day. */
const RECHECK_MS = 2 * 60 * 1000;

interface ThemeContextValue {
  /** The theme currently applied to <html>. */
  theme: Theme;
  /** A manual override, or null when following the clock. */
  override: Theme | null;
  /** The visitor's IANA timezone, for display. */
  timeZone: string;
  /** Advance the manual override to the next theme. */
  cycle: () => void;
  /** Drop the override and go back to following the clock. */
  clearOverride: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Start from the server-rendered default. The pre-paint script has already
  // corrected the DOM by now; this state catches up on mount without causing a
  // hydration mismatch, because the first render matches the server exactly.
  const [clockTheme, setClockTheme] = useState<Theme>(DEFAULT_THEME);
  const [override, setOverride] = useState<Theme | null>(null);
  const [timeZone, setTimeZone] = useState('');
  const [mounted, setMounted] = useState(false);

  // Read the real state after mount.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      // Private mode or blocked storage: just follow the clock.
    }
    if (isTheme(stored)) setOverride(stored);
    setClockTheme(themeForDate());
    setTimeZone(resolveTimeZone());
    setMounted(true);
  }, []);

  // Enable cross-fades one frame after the first commit. Before this point the
  // pre-paint theme swap must land instantly — a transition here would *be* the
  // flash we went to the trouble of avoiding.
  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => {
      document.documentElement.setAttribute('data-theme-transitions', 'on');
    });
    return () => cancelAnimationFrame(id);
  }, [mounted]);

  // Re-check the clock periodically so an open tab transitions naturally at
  // dusk. Skipped while the tab is hidden; re-checked immediately on return, so
  // a tab left open overnight is correct the moment it's looked at again.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible') setClockTheme(themeForDate());
    };
    const interval = setInterval(tick, RECHECK_MS);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);

  // Pause every CSS animation while the tab is in the background.
  useEffect(() => {
    const sync = () => {
      document.documentElement.setAttribute(
        'data-paused',
        document.visibilityState === 'visible' ? 'false' : 'true',
      );
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const theme = override ?? clockTheme;

  // Apply to <html>, which is where every token set lives.
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, mounted]);

  const cycle = useCallback(() => {
    setOverride((current) => {
      const next = nextTheme(current ?? themeForDate());
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Not persisting is survivable; the override still applies this session.
      }
      return next;
    });
  }, []);

  const clearOverride = useCallback(() => {
    try {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } catch {
      // Nothing to clean up.
    }
    setClockTheme(themeForDate());
    setOverride(null);
  }, []);

  const value = useMemo(
    () => ({ theme, override, timeZone, cycle, clearOverride }),
    [theme, override, timeZone, cycle, clearOverride],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
