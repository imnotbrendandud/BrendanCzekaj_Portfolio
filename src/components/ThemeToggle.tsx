'use client';

import { THEME_LABELS, nextTheme } from '@/lib/theme';
import { useTheme } from './ThemeProvider';

/**
 * A small pixel sun/moon that cycles the four themes. The choice persists in
 * localStorage; shift-click (or the reset button) drops it and goes back to
 * following the visitor's real clock.
 */
export function ThemeToggle() {
  const { theme, override, timeZone, cycle, clearOverride } = useTheme();
  const isNight = theme === 'night';
  const label = THEME_LABELS[theme];
  const upcoming = THEME_LABELS[nextTheme(theme)];

  return (
    <div className="theme-toggle-wrap">
      <button
        type="button"
        className="theme-toggle"
        onClick={cycle}
        aria-label={`Scene: ${label}${override ? ' (manual)' : ' (following your local time)'}. Switch to ${upcoming}.`}
        title={
          override
            ? `Manual override: ${label}. Click for ${upcoming}.`
            : `Following your local time${timeZone ? ` (${timeZone})` : ''}: ${label}. Click for ${upcoming}.`
        }
      >
        <span className="theme-toggle-icon" aria-hidden="true">
          {isNight ? <MoonIcon /> : <SunIcon />}
        </span>
        <span className="theme-toggle-label">
          {label.toUpperCase()}
          <br />
          <span className="theme-toggle-mode">{override ? 'MANUAL' : 'AUTO'}</span>
        </span>
      </button>

      {override ? (
        <button type="button" className="theme-reset" onClick={clearOverride}>
          USE MY CLOCK
        </button>
      ) : null}
    </div>
  );
}

/** 8x8 pixel sun: a square core with four spokes. */
function SunIcon() {
  const core = 'var(--accent)';
  return (
    <>
      <i style={{ left: 9, top: 9, width: 6, height: 6, background: core }} />
      <i style={{ left: 6, top: 6, width: 3, height: 3, background: core }} />
      <i style={{ left: 15, top: 6, width: 3, height: 3, background: core }} />
      <i style={{ left: 6, top: 15, width: 3, height: 3, background: core }} />
      <i style={{ left: 15, top: 15, width: 3, height: 3, background: core }} />
      <i style={{ left: 11, top: 0, width: 2, height: 4, background: core }} />
      <i style={{ left: 11, top: 20, width: 2, height: 4, background: core }} />
      <i style={{ left: 0, top: 11, width: 4, height: 2, background: core }} />
      <i style={{ left: 20, top: 11, width: 4, height: 2, background: core }} />
    </>
  );
}

/** Pixel crescent moon. */
function MoonIcon() {
  const c = 'var(--accent)';
  return (
    <>
      <i style={{ left: 9, top: 2, width: 6, height: 2, background: c }} />
      <i style={{ left: 6, top: 4, width: 5, height: 2, background: c }} />
      <i style={{ left: 4, top: 6, width: 4, height: 3, background: c }} />
      <i style={{ left: 3, top: 9, width: 3, height: 6, background: c }} />
      <i style={{ left: 4, top: 15, width: 4, height: 3, background: c }} />
      <i style={{ left: 6, top: 18, width: 5, height: 2, background: c }} />
      <i style={{ left: 9, top: 20, width: 6, height: 2, background: c }} />
      <i style={{ left: 13, top: 18, width: 4, height: 2, background: c }} />
      <i style={{ left: 15, top: 15, width: 3, height: 3, background: c }} />
    </>
  );
}
