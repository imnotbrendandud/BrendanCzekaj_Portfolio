/**
 * Theme selection. Four themes, chosen from the visitor's local wall-clock hour.
 *
 * To tune the time ranges, edit THEME_SCHEDULE below — it is the single source
 * of truth, shared by the React runtime and the inline pre-paint script.
 */

export const THEMES = ['morning', 'day', 'evening', 'night'] as const;
export type Theme = (typeof THEMES)[number];

/** Rendered by the server before the visitor's clock is known. */
export const DEFAULT_THEME: Theme = 'night';

export const THEME_STORAGE_KEY = 'portfolio-theme';

/**
 * Inclusive start hour for each theme, in the visitor's local time.
 * Ranges run from each `from` up to the next entry's `from`. The last entry
 * wraps past midnight.
 *
 *   morning  5:00 – 8:59
 *   day      9:00 – 16:59
 *   evening 17:00 – 20:59
 *   night   21:00 – 4:59
 */
export const THEME_SCHEDULE: readonly { readonly from: number; readonly theme: Theme }[] = [
  { from: 5, theme: 'morning' },
  { from: 9, theme: 'day' },
  { from: 17, theme: 'evening' },
  { from: 21, theme: 'night' },
];

export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/**
 * The visitor's IANA timezone, e.g. "America/Detroit". Read from the Intl API,
 * which needs no permission prompt — we never touch the Geolocation API.
 */
export function resolveTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

/**
 * Map an hour (0–23) to a theme. `new Date()` already reports the local hour
 * for the visitor's timezone, so no conversion is needed.
 */
export function themeForHour(hour: number): Theme {
  let current: Theme = 'night'; // covers the pre-5am wrap
  for (const slot of THEME_SCHEDULE) {
    if (hour >= slot.from) current = slot.theme;
  }
  return current;
}

export function themeForDate(date: Date = new Date()): Theme {
  return themeForHour(date.getHours());
}

/** Human-readable label for the toggle's accessible name and tooltip. */
export const THEME_LABELS: Record<Theme, string> = {
  morning: 'Morning',
  day: 'Midday',
  evening: 'Evening',
  night: 'Night',
};

/** The next theme in the manual override cycle. */
export function nextTheme(theme: Theme): Theme {
  const i = THEMES.indexOf(theme);
  return THEMES[(i + 1) % THEMES.length]!;
}
