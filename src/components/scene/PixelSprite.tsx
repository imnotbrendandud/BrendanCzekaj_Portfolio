import type { CSSProperties } from 'react';
import { toRuns, mapWidth, type PixelMap } from '@/lib/pixel';

interface PixelSpriteProps {
  map: PixelMap;
  /** Maps a palette character to a CSS colour (usually a var()). */
  palette: Record<string, string>;
  /** Size of one pixel. A CSS length, so it can be a var() and animate. */
  unit: string;
  className?: string;
  style?: CSSProperties;
  /** Extra class per palette key, e.g. for a glow on the sparkle core. */
  runClassName?: Record<string, string>;
}

/**
 * Draws a pixel map as one absolutely-positioned block per horizontal run.
 * Purely presentational, so it stays a server component.
 */
export function PixelSprite({
  map,
  palette,
  unit,
  className,
  style,
  runClassName,
}: PixelSpriteProps) {
  const runs = toRuns(map);
  const w = mapWidth(map);
  // Snap to whole pixels. Callers pass fractional sizes (a cloud at 7.49px, or
  // anything times --px-scale), and with a fractional unit each run's edges get
  // rounded to the screen grid independently, so neighbouring rows can miss
  // each other and leave a hairline of sky between them. Whole-pixel units put
  // every edge an exact number of pixels from the sprite's origin.
  const px = `max(1px, round(${unit}, 1px))`;
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        width: `calc(${w} * ${px})`,
        height: `calc(${map.length} * ${px})`,
        ...style,
      }}
    >
      {runs.map((run) => (
        <i
          key={`${run.y}-${run.x}`}
          className={runClassName?.[run.key]}
          style={{
            position: 'absolute',
            display: 'block',
            left: `calc(${run.x} * ${px})`,
            top: `calc(${run.y} * ${px})`,
            width: `calc(${run.w} * ${px})`,
            height: px,
            background: palette[run.key],
          }}
        />
      ))}
    </div>
  );
}
