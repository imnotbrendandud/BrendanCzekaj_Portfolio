'use client';

import { useEffect, useRef, type ReactNode } from 'react';

interface PanelProps {
  /** Rendered in the pixel font as the section heading. */
  heading: string;
  /** Ties the section to its heading for assistive tech. */
  id: string;
  children: ReactNode;
}

/**
 * A floating pixel dialog box.
 *
 * Focus behaviour is CSS-only on pointer devices (see globals.css). On touch,
 * where there is no hover, an IntersectionObserver marks whichever panel is
 * crossing the middle of the viewport and that one gets the focus treatment.
 */
export function Panel({ heading, id, children }: PanelProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Only needed where hover doesn't exist.
    if (window.matchMedia('(hover: hover)').matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          el.dataset.centered = String(entry.isIntersecting);
        }
      },
      // Collapses the root to a thin band across the middle of the viewport, so
      // only the panel actually centred counts as intersecting.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="panel" ref={ref} aria-labelledby={`${id}-heading`}>
      <h2 className="panel-heading" id={`${id}-heading`}>
        {heading}
      </h2>
      {children}
    </section>
  );
}
