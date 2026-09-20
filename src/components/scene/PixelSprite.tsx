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
  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        width: `calc(${w} * ${unit})`,
        height: `calc(${map.length} * ${unit})`,
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
            left: `calc(${run.x} * ${unit})`,
            top: `calc(${run.y} * ${unit})`,
            width: `calc(${run.w} * ${unit})`,
            height: unit,
            background: palette[run.key],
          }}
        />
      ))}
    </div>
  );
}
