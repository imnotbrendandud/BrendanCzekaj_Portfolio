import type { CSSProperties } from 'react';
import { createRng } from '@/lib/prng';

/** Hard cap on animated sparkles — a fully twinkling sky is noise, and it costs. */
const MAX_TWINKLERS = 40;
const SPARKLE_COUNT = 64;
const DOT_COUNT = 150;

interface Sparkle {
  left: number;
  top: number;
  unit: number;
  colorIndex: number;
  opacity: number;
  twinkles: boolean;
  duration: number;
  delay: number;
}

interface Dot {
  left: number;
  top: number;
  size: number;
  colorIndex: number;
  opacity: number;
  twinkles: boolean;
  duration: number;
  delay: number;
}

/**
 * Generated once at module load from a fixed seed, so the server and the client
 * render byte-identical markup (no hydration mismatch) and the sky looks the
 * same on every visit.
 */
const { sparkles, dots } = (() => {
  const rng = createRng(0x5eed1e);
  const sparkles: Sparkle[] = [];
  const dots: Dot[] = [];

  // Twinklers are assigned to the first N sparkles, then the list is spread
  // over the sky, so the animated ones aren't clustered.
  for (let i = 0; i < SPARKLE_COUNT; i += 1) {
    sparkles.push({
      left: rng.range(1, 99),
      // Stars thin out toward the horizon, where the sky is brightest.
      top: rng.range(0.5, 82),
      unit: rng.pick([3, 4, 4, 5]),
      colorIndex: rng.int(1, 6),
      opacity: rng.range(0.6, 1),
      twinkles: i < MAX_TWINKLERS,
      duration: rng.range(2, 6),
      delay: rng.range(0, 6),
    });
  }

  for (let i = 0; i < DOT_COUNT; i += 1) {
    dots.push({
      left: rng.range(0.5, 99.5),
      top: rng.range(0.5, 84),
      size: rng.pick([1, 2, 2]),
      colorIndex: rng.int(1, 6),
      opacity: rng.range(0.25, 0.8),
      // Dots are cheap, but still only a slice of them move.
      twinkles: rng.chance(0.18),
      duration: rng.range(2.5, 6),
      delay: rng.range(0, 6),
    });
  }

  return { sparkles, dots };
})();

export function StarField() {
  return (
    <div className="sky-layer" aria-hidden="true">
      {dots.map((dot, i) => (
        <span
          key={`d${i}`}
          className={dot.twinkles ? 'dot dot--twinkle' : 'dot'}
          style={
            {
              left: `${dot.left}%`,
              top: `${dot.top}%`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              '--star-color': `var(--star-${dot.colorIndex})`,
              '--own-opacity': dot.opacity,
              '--dur': `${dot.duration}s`,
              '--delay': `${dot.delay}s`,
            } as CSSProperties
          }
        />
      ))}

      {sparkles.map((star, i) => (
        <span
          key={`s${i}`}
          className={star.twinkles ? 'sparkle sparkle--twinkle' : 'sparkle'}
          style={
            {
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: `${star.unit * 7}px`,
              height: `${star.unit * 7}px`,
              '--u': `${star.unit}px`,
              '--star-color': `var(--star-${star.colorIndex})`,
              '--own-opacity': star.opacity,
              '--dur': `${star.duration}s`,
              '--delay': `${star.delay}s`,
            } as CSSProperties
          }
        >
          <i className="bar-v" />
          <i className="bar-h" />
          <i className="core" />
        </span>
      ))}
    </div>
  );
}
