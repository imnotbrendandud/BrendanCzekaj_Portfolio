'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import type { Theme } from '@/lib/theme';

/**
 * Spawn rate per theme, in seconds [min, max]. Night gets the most; morning and
 * evening an occasional one; daylight none.
 */
const RATE: Record<Theme, readonly [number, number] | null> = {
  night: [8, 20],
  evening: [22, 45],
  morning: [25, 50],
  day: null,
};

interface Shot {
  id: number;
  top: number;
  left: number;
  angle: number;
  distance: number;
  length: number;
  duration: number;
  colorIndex: number;
}

let nextId = 0;

export function ShootingStars({ theme }: { theme: Theme }) {
  const [shots, setShots] = useState<Shot[]>([]);

  useEffect(() => {
    const rate = RATE[theme];
    if (!rate) {
      setShots([]);
      return;
    }

    // A static scene under reduced motion: no shooting stars at all.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShots([]);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const schedule = () => {
      const [min, max] = rate;
      const wait = (min + Math.random() * (max - min)) * 1000;
      timer = setTimeout(() => {
        if (cancelled) return;
        // Don't queue work for a tab nobody is looking at.
        if (document.visibilityState !== 'visible') {
          schedule();
          return;
        }
        const duration = 0.9 + Math.random() * 0.8;
        const shot: Shot = {
          id: nextId++,
          // Upper sky only — a meteor grazing the treeline looks wrong.
          top: 4 + Math.random() * 55,
          left: 8 + Math.random() * 62,
          angle: 16 + Math.random() * 22,
          distance: 220 + Math.random() * 300,
          length: 90 + Math.random() * 70,
          duration,
          colorIndex: 1 + Math.floor(Math.random() * 3),
        };
        setShots((prev) => [...prev, shot]);
        // Despawn once the animation has finished.
        setTimeout(
          () => {
            if (!cancelled) setShots((prev) => prev.filter((s) => s.id !== shot.id));
          },
          duration * 1000 + 100,
        );
        schedule();
      }, wait);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [theme]);

  return (
    <div className="sky-layer" aria-hidden="true">
      {shots.map((shot) => (
        <span
          key={shot.id}
          className="shooting-star"
          style={
            {
              top: `${shot.top}%`,
              left: `${shot.left}%`,
              width: `${shot.length}px`,
              '--angle': `${shot.angle}deg`,
              '--distance': `${shot.distance}px`,
              '--dur': `${shot.duration}s`,
              '--star-color': `var(--shoot-${shot.colorIndex})`,
            } as CSSProperties
          }
        >
          <span className="trail" />
          <span className="head" />
        </span>
      ))}
    </div>
  );
}
