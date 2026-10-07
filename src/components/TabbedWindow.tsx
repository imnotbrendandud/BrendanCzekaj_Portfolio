'use client';

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

export interface WindowTab {
  /** Doubles as the URL hash, so `/#projects` opens straight to that tab. */
  id: string;
  /** Rendered in the pixel font on the tab itself. */
  label: string;
  content: ReactNode;
}

interface TabbedWindowProps {
  tabs: readonly WindowTab[];
  /** Accessible name for the tab list. */
  label: string;
  /** Pass both to control the selected tab from outside (the editor does). */
  active?: number;
  onActiveChange?: (index: number) => void;
}

/**
 * One pixel dialog box with a row of tabs, like a game's pause menu. Every
 * section lives in here, so the whole site fits on a single screen.
 *
 * Follows the WAI-ARIA tabs pattern: arrow keys, Home and End move between
 * tabs and select as they go, and only the active tab is in the tab order.
 * Inactive panels stay in the DOM (hidden with CSS `visibility`), so all the
 * copy is still in the static HTML for search engines.
 */
export function TabbedWindow({
  tabs,
  label,
  active: controlled,
  onActiveChange,
}: TabbedWindowProps) {
  const [uncontrolled, setUncontrolled] = useState(0);
  // Clamped, because the editor can delete the tab that's open.
  const active = Math.min(controlled ?? uncontrolled, tabs.length - 1);
  const setActive = onActiveChange ?? setUncontrolled;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Open on whichever tab the URL hash names, and follow real hash navigation
  // (a #link, back/forward). Only then: re-reading it whenever the tabs change
  // would yank the editor back to the hash's tab after every added tab.
  const ids = useRef<string[]>([]);
  ids.current = tabs.map((tab) => tab.id);
  useEffect(() => {
    const fromHash = () => {
      const index = ids.current.findIndex((id) => `#${id}` === window.location.hash);
      if (index !== -1) setActive(index);
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [setActive]);

  // Keep the hash naming the open tab, however it was opened: a click here, or
  // the editor adding, renaming or switching tabs. replaceState rather than
  // setting location.hash, so the tab is shareable but switching neither
  // fills the history nor jumps the page. Skipped on the first render, which
  // must not overwrite the hash before it has been read.
  const activeId = tabs[active]?.id;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (activeId && window.location.hash !== `#${activeId}`) {
      window.history.replaceState(null, '', `#${activeId}`);
    }
  }, [activeId]);

  const select = (index: number, focus = false) => {
    setActive(index);
    bodyRef.current?.scrollTo({ top: 0 });
    if (focus) tabRefs.current[index]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = tabs.length - 1;
    const next = {
      ArrowRight: active === last ? 0 : active + 1,
      ArrowLeft: active === 0 ? last : active - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    select(next, true);
  };

  // One tab is just a window: no tab bar to click, and the content is a plain
  // labelled section rather than a tab panel.
  if (tabs.length === 1) {
    const [tab] = tabs;
    return (
      <div className="panel window">
        <div className="window-body" ref={bodyRef}>
          <section
            className="window-panel"
            id={tab!.id}
            aria-label={tab!.label || label}
            data-active
            tabIndex={0}
          >
            {tab!.content}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="panel window">
      <div
        className="window-tabs"
        role="tablist"
        aria-label={label}
        style={{ '--tab-count': tabs.length } as CSSProperties}
        // On a phone, four or more tabs wrap two to a row (see globals.css).
        data-wrap={tabs.length > 3 || undefined}
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            className="window-tab"
            id={`${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls={tab.id}
            tabIndex={i === active ? 0 : -1}
            onClick={() => select(i)}
            onKeyDown={onKeyDown}
          >
            <span className="window-tab-num" aria-hidden="true">
              {String(i + 1).padStart(2, '0')}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="window-body" ref={bodyRef}>
        {tabs.map((tab, i) => (
          <section
            key={tab.id}
            className="window-panel"
            id={tab.id}
            role="tabpanel"
            aria-labelledby={`${tab.id}-tab`}
            // Not the `hidden` attribute: Tailwind's preflight forces that to
            // display: none, and inactive panels need to keep their height.
            data-active={i === active}
            // A focusable panel lets keyboard users reach and scroll content
            // that has no links of its own (About, most of Experience).
            tabIndex={0}
          >
            {tab.content}
          </section>
        ))}
      </div>
    </div>
  );
}
