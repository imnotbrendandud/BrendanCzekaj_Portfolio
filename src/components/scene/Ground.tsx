import { Cow } from './Cow';
import { createRng, type Rng } from '@/lib/prng';
import { TREES, mapWidth } from '@/lib/pixel';
import { PixelSprite } from './PixelSprite';

/**
 * A jagged stepped silhouette, as a clip-path polygon.
 *
 * The walk is deliberately blocky: the outline only changes height at fixed
 * column boundaries, and always by a whole multiple of `step`, so it reads as
 * pixel art rather than a smooth curve. Every coordinate is a percentage, so
 * the ridge keeps its shape at any viewport size.
 */
function steppedRidge(rng: Rng, columns: number, maxDepth: number, step: number): string {
  const points: string[] = [];
  let depth = Math.round(maxDepth / 2 / step) * step;
  const fmt = (n: number) => `${n.toFixed(2)}%`;

  for (let i = 0; i <= columns; i += 1) {
    const x = (i / columns) * 100;
    // An occasional flat stretch keeps the ridge from reading as pure noise.
    if (i > 0 && !rng.chance(0.28)) {
      const delta = rng.pick([-2, -1, -1, 0, 1, 1, 2]) * step;
      depth = Math.min(maxDepth, Math.max(0, depth + delta));
    }
    // Two points per column — a horizontal run, then a vertical jump. That pair
    // is what makes each step square instead of diagonal.
    points.push(`${fmt(x)} ${fmt(depth)}`);
    if (i < columns) {
      points.push(`${fmt(((i + 1) / columns) * 100)} ${fmt(depth)}`);
    }
  }

  points.push('100% 100%', '0% 100%');
  return `polygon(${points.join(',')})`;
}

/**
 * Ground band geometry, as percentages of --ground-height, so the whole horizon
 * scales with the viewport instead of being pinned to desktop pixels.
 */
const LAYOUT = {
  ridges: [
    { className: 'ridge ridge--1', top: 0, height: 40.4 },
    { className: 'ridge ridge--2', top: 13.5, height: 38.5 },
    { className: 'ridge ridge--3', top: 26.9, height: 38.5 },
  ],
  treeline: { top: 46.2, height: 13.5 },
  grass: { top: 57.7 },
} as const;

const scene = (() => {
  const rng = createRng(0x6204d);

  const ridges = [
    { ...LAYOUT.ridges[0], clip: steppedRidge(rng, 42, 34, 3) },
    { ...LAYOUT.ridges[1], clip: steppedRidge(rng, 34, 28, 3) },
    { ...LAYOUT.ridges[2], clip: steppedRidge(rng, 26, 20, 2.5) },
  ];

  // Trees are packed left to right with overlap, so the line reads as a forest
  // rather than a fence.
  const trees: { left: number; scale: number; mapIndex: number; z: number }[] = [];
  let x = -2;
  while (x < 102) {
    trees.push({
      left: x,
      scale: rng.range(3.2, 5.4),
      mapIndex: rng.int(0, TREES.length - 1),
      z: rng.chance(0.4) ? 0 : 1,
    });
    x += rng.range(1.6, 3.4);
  }

  // Grass speckle: pairs of 4px pixels, the way the mockups texture the field.
  const specks: { left: number; top: number; dim: boolean }[] = [];
  for (let i = 0; i < 170; i += 1) {
    const left = rng.range(0, 100);
    const top = rng.range(0, 100);
    specks.push({ left, top, dim: false });
    specks.push({ left, top, dim: true });
  }

  return { ridges, trees, specks };
})();

/**
 * Stepped wedge for the dirt path. Narrow at the horizon and widening sharply
 * toward the viewer, in a handful of large steps — a gentle taper reads as a
 * mound rather than a track running away from you.
 */
const PATH_CLIP =
  'polygon(46% 0%, 54% 0%, 54% 12%, 58% 12%, 58% 28%, 64% 28%, 64% 46%, 72% 46%, 72% 66%, 84% 66%, 84% 100%, 16% 100%, 16% 66%, 28% 66%, 28% 46%, 36% 46%, 36% 28%, 42% 28%, 42% 12%, 46% 12%)';

/* The same wedge widened 10% about the centre line. Drawn behind the path, it
   leaves a lighter rim along both edges. */
const PATH_LIP_CLIP =
  'polygon(45.6% 0%, 54.4% 0%, 54.4% 12%, 58.8% 12%, 58.8% 28%, 65.4% 28%, 65.4% 46%, 74.2% 46%, 74.2% 66%, 87.4% 66%, 87.4% 100%, 12.6% 100%, 12.6% 66%, 25.8% 66%, 25.8% 46%, 34.6% 46%, 34.6% 28%, 41.2% 28%, 41.2% 12%, 45.6% 12%)';

export function Ground() {
  return (
    <>
      <div className="ground" aria-hidden="true">
        {scene.ridges.map((ridge, i) => (
          <div
            key={i}
            className={ridge.className}
            style={{ top: `${ridge.top}%`, height: `${ridge.height}%`, clipPath: ridge.clip }}
          />
        ))}

        {/* The treeline sits on the grass line, tucked behind the grass lip. */}
        <div
          className="treeline"
          style={{ top: `${LAYOUT.treeline.top}%`, height: `${LAYOUT.treeline.height}%` }}
        >
          {scene.trees.map((tree, i) => {
            const map = TREES[tree.mapIndex]!;
            const unit = `calc(${tree.scale.toFixed(2)}px * var(--px-scale))`;
            return (
              <div
                key={i}
                className="tree"
                style={{
                  left: `${tree.left}%`,
                  width: `calc(${mapWidth(map)} * ${unit})`,
                  height: `calc(${map.length} * ${unit})`,
                  zIndex: tree.z,
                }}
              >
                <PixelSprite
                  map={map}
                  unit={unit}
                  palette={{ d: 'var(--tree-dark)', m: 'var(--tree-mid)' }}
                  style={{ position: 'relative' }}
                />
              </div>
            );
          })}
        </div>

        <div className="grass" style={{ top: `${LAYOUT.grass.top}%` }}>
          <div className="grass-lip" />

          {/* Speckle is scattered across the whole field, so it has to be laid
              down before the path — otherwise tufts of grass sprout through the
              dirt. */}
          {scene.specks.map((speck, i) => (
            <span
              key={i}
              className="grass-speck"
              style={{
                left: `calc(${speck.left}% + ${speck.dim ? 4 : 0}px)`,
                top: `calc(${speck.top}% + ${speck.dim ? 4 : 0}px)`,
                opacity: speck.dim ? 0.4 : 0.55,
              }}
            />
          ))}

          <div className="path-lip" style={{ clipPath: PATH_LIP_CLIP }} />
          <div className="path" style={{ clipPath: PATH_CLIP }} />
        </div>
      </div>

      <Cow />
    </>
  );
}
