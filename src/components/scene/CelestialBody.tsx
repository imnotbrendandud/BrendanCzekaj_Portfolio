'use client';

import { useEffect, useRef } from 'react';
import { PixelSprite } from './PixelSprite';
import { MOON, SUN } from '@/lib/pixel';

/** Fraction of scroll distance the body lags behind by. Lower = more distant. */
const PARALLAX = 0.18;

/**
 * The sun and the moon, stacked in one place. The active theme cross-fades
 * between the two sprites and slides the shared position, so switching from
 * night to morning reads as one body moving rather than two swapping.
 *
 * It drifts vertically with scroll at a fraction of page speed, which is what
 * sells the distance.
 */
export function CelestialBody() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Honour reduced motion: no parallax, just a static position.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    let running = true;
    let maxDrift = Infinity;

    /**
     * The morning and evening themes park the sun just above the horizon. Left
     * unchecked, downward parallax drags it straight into the treeline and the
     * ground paints over it, so cap the drift at the point where the sprite
     * would start sinking into the ground. A little overlap is welcome — a sun
     * clipped by the ridge line reads as rising.
     */
    const measure = () => {
      const ground = el.closest('.scene')?.querySelector<HTMLElement>('.ground');
      if (!ground) {
        maxDrift = Infinity;
        return;
      }
      maxDrift = Math.max(0, ground.offsetTop - el.offsetTop - el.offsetHeight * 0.65);
    };

    const update = () => {
      frame = 0;
      const drift = Math.min(window.scrollY * PARALLAX, maxDrift);
      el.style.setProperty('--parallax', `${drift}px`);
    };

    const onScroll = () => {
      if (frame || !running) return;
      frame = requestAnimationFrame(update);
    };

    const onResize = () => {
      measure();
      onScroll();
    };

    const onVisibility = () => {
      running = document.visibilityState === 'visible';
      if (running) onScroll();
    };

    measure();
    update();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    // The sprite's own size changes when the theme does (--celestial-unit is
    // per-theme), which moves the horizon cap with it.
    const observer = new ResizeObserver(onResize);
    observer.observe(el);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="celestial" ref={ref} aria-hidden="true">
      <div className="celestial-glow" />
      <PixelSprite
        className="celestial-sprite celestial-sprite--sun"
        map={SUN}
        unit="calc(var(--celestial-unit) * var(--px-scale))"
        palette={{ R: 'var(--sun-ring)', C: 'var(--sun-core)' }}
      />
      <PixelSprite
        className="celestial-sprite celestial-sprite--moon"
        map={MOON}
        unit="calc(var(--celestial-unit) * var(--px-scale))"
        palette={{ L: 'var(--moon-light)', D: 'var(--moon-crater)' }}
      />
    </div>
  );
}
