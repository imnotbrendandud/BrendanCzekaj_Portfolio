'use client';

import { useEffect, useRef, useState } from 'react';
import type { Link } from '@/content/site';

interface SiteNavProps {
  /** Sections on the page, by element id. */
  sections: readonly { id: string; label: string }[];
  /** One more link after the sections, e.g. the game dev page. */
  extra: Link;
}

/**
 * Quick navigation, pinned to the top right. Highlights whichever section
 * you're reading. On a phone it folds into a Menu button.
 */
export function SiteNav({ sections, extra }: SiteNavProps) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // The current section is the one crossing a band just above the middle of
  // the screen, which is where the eye is when reading.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-30% 0px -60% 0px' },
    );
    for (const { id } of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  // Close the phone menu on Escape or a click anywhere else.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [open]);

  return (
    <nav ref={navRef} className="site-nav" aria-label="Sections">
      <button
        type="button"
        className="site-nav-toggle"
        aria-expanded={open}
        aria-controls="site-nav-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="site-nav-bars" aria-hidden="true" />
        Menu
      </button>
      <ul id="site-nav-menu" className="site-nav-menu" data-open={open}>
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? 'location' : undefined}
              onClick={() => setOpen(false)}
            >
              {section.label}
            </a>
          </li>
        ))}
        <li>
          <a className="site-nav-extra" href={extra.href}>
            {extra.label}
          </a>
        </li>
      </ul>
    </nav>
  );
}
