import type { CSSProperties } from 'react';
import { createRng } from '@/lib/prng';
import { CLOUDS, mapWidth } from '@/lib/pixel';
import { PixelSprite } from './PixelSprite';

/**
 * Four bands of drifting cloud. Higher, smaller clouds move slower, which gives
 * the sky depth.
 *
 * Each band holds a track twice the width of the page containing the same run
 * of clouds twice over. Translating the track by exactly -50% lands the second
 * copy where the first began, so the loop is seamless — nothing pops.
 */
const BANDS = [
  // top: vertical position as a % of the scene. scale: pixel size. dur: seconds
  // for one full wrap — slower for the higher, smaller, more distant bands.
  { top: 10, scale: 5, dur: 240, count: 3 },
  { top: 26, scale: 7, dur: 190, count: 3 },
  { top: 46, scale: 9, dur: 150, count: 4 },
  { top: 66, scale: 11, dur: 115, count: 4 },
] as const;

interface CloudInstance {
  /** Offset within one copy of the track, as a % of page width. */
  offset: number;
  mapIndex: number;
  scale: number;
  opacity: number;
  /** Vertical jitter within the band, in px. */
  dy: number;
}

const bands = (() => {
  const rng = createRng(0xc10d5);
  return BANDS.map((band) => {
    const clouds: CloudInstance[] = [];
    for (let i = 0; i < band.count; i += 1) {
      clouds.push({
        // Spread evenly across the band, then jitter, so the wrap doesn't read
        // as a regular procession.
        offset: (i / band.count) * 100 + rng.range(-8, 8),
        mapIndex: rng.int(0, CLOUDS.length - 1),
        scale: band.scale * rng.range(0.85, 1.2),
        opacity: rng.range(0.8, 1),
        dy: rng.range(-30, 30),
      });
    }
    return { ...band, clouds };
  });
})();

export function Clouds() {
  return (
    <div className="sky-layer" aria-hidden="true">
      {bands.map((band, bi) => (
        <div className="cloud-band" key={bi} style={{ top: `${band.top}%` }}>
          <div className="cloud-track" style={{ '--dur': `${band.dur}s` } as CSSProperties}>
            {/* Two copies: the wrap point is the seam between them. */}
            {[0, 1].map((copy) =>
              band.clouds.map((cloud, ci) => {
                const map = CLOUDS[cloud.mapIndex]!;
                const unit = `calc(${cloud.scale.toFixed(2)}px * var(--px-scale))`;
                return (
                  <div
                    key={`${copy}-${ci}`}
                    className="cloud"
                    style={
                      {
                        // Offsets are halved because the track is 200% wide.
                        left: `${(cloud.offset + copy * 100) / 2}%`,
                        top: `${cloud.dy}px`,
                        width: `calc(${mapWidth(map)} * ${unit})`,
                        '--own-opacity': cloud.opacity,
                        // 0 = high in the sky, 1 = near the horizon.
                        '--depth': (band.top / 100).toFixed(2),
                      } as CSSProperties
                    }
                  >
                    <PixelSprite
                      map={map}
                      unit={unit}
                      palette={{ l: 'var(--cloud-lit)', s: 'var(--cloud-shade)' }}
                      style={{ position: 'relative' }}
                    />
                  </div>
                );
              }),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
