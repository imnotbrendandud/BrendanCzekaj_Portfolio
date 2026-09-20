/**
 * The cow that grazes at the bottom of the page.
 *
 * Deliberately chunky: an oversized head roughly as tall as the body, a big
 * pink snout, little horn nubs and short stubby legs. Realistic proportions
 * read as livestock; these read as a character.
 *
 * Authored facing LEFT (`Cow` mirrors her to walk the other way).
 *
 * Frames are generated at module load rather than hand-authored character by
 * character: the silhouette is declared once and the dark outline derived from
 * it, so the outline can never end up with a gap. The legs are part of that
 * silhouette, which is what gives them the pale hide and dark edge of the rest
 * of her — the gaps between them are wide enough to survive being outlined.
 *
 * Palette keys match the ones `Cow` maps to CSS custom properties:
 *   w hide   b patch   k outline & horns   p snout & udder   n nostril   e eye
 */

export const COW_W = 32;
export const COW_H = 20;

/** Row the hooves rest on. */
const GROUND_ROW = 17;
/** Row the legs hang from. */
const LEG_TOP = 12;
const LEG_W = 3;
/** Front pair (under the chest), then rear pair. */
const LEG_X = [12, 16, 20, 24] as const;

export type CowFrame = readonly string[];

type Cell = [x: number, y: number, ch: string];

const HIDE = 'w';
const EMPTY = '.';

const row = (...runs: [string, number][]): string => {
  const s = runs.map(([c, n]) => c.repeat(n)).join('');
  if (s.length > COW_W) throw new Error(`cow row too wide (${s.length} > ${COW_W}): "${s}"`);
  return s.padEnd(COW_W, EMPTY);
};

const _ = EMPTY;
const w = HIDE;

/** Torso and tail. Short and deep, so the head can dominate. */
const TORSO: string[] = [
  row(),
  row(),
  row(),
  row(),
  row(),
  row([_, 13], [w, 13]), // back, sitting well below the top of the head
  row([_, 13], [w, 15]), // tail, one pixel wide and joined to the rump
  row([_, 13], [w, 15]),
  row([_, 13], [w, 15]),
  row([_, 13], [w, 15]),
  row([_, 13], [w, 15]),
  row([_, 13], [w, 15]),
  row([_, 13], [w, 15]),
  row([_, 14], [w, 12]),
];

/**
 * The head, including the horn nubs. Nearly as tall as the torso and pushed
 * right up against it — a neck would make her look like an animal instead of a
 * character.
 */
const HEAD: string[] = [
  row([_, 2], [w, 3], [_, 5], [w, 3]), // horn nubs
  row([_, 2], [w, 3], [_, 5], [w, 3]),
  row([_, 2], [w, 12]), // rounded crown
  row([_, 1], [w, 14]),
  row([_, 1], [w, 14]),
  row([_, 1], [w, 14]),
  row([_, 1], [w, 14]),
  row([_, 1], [w, 14]),
  row([_, 1], [w, 14]),
  row([_, 1], [w, 14]),
  row([_, 1], [w, 14]),
  row([_, 2], [w, 13]),
  row([_, 2], [w, 12]),
  row([_, 3], [w, 10]),
];

const blankGrid = (): string[][] =>
  Array.from({ length: COW_H }, () => Array.from({ length: COW_W }, () => EMPTY));

/** Surround every filled cell with a dark outline. */
function outlined(fill: readonly string[]): string[][] {
  const g = blankGrid();
  for (let y = 0; y < COW_H; y += 1) {
    const src = fill[y];
    if (!src) continue;
    for (let x = 0; x < COW_W; x += 1) if (src[x] && src[x] !== EMPTY) g[y]![x] = src[x]!;
  }

  const out = g.map((r) => [...r]);
  for (let y = 0; y < COW_H; y += 1) {
    for (let x = 0; x < COW_W; x += 1) {
      if (g[y]![x] !== EMPTY) continue;
      let touching = false;
      for (let dy = -1; dy <= 1 && !touching; dy += 1) {
        for (let dx = -1; dx <= 1 && !touching; dx += 1) {
          if (!dx && !dy) continue;
          const c = g[y + dy]?.[x + dx];
          if (c && c !== EMPTY) touching = true;
        }
      }
      if (touching) out[y]![x] = 'k';
    }
  }
  return out;
}

/** Shift a fill vertically, dropping anything pushed off the grid. */
const shift = (fill: readonly string[], dy: number): string[] => {
  if (dy === 0) return [...fill];
  const blank = EMPTY.repeat(COW_W);
  return dy > 0
    ? [...Array.from({ length: dy }, () => blank), ...fill].slice(0, COW_H)
    : [...fill.slice(-dy), ...Array.from({ length: -dy }, () => blank)];
};

function union(...fills: readonly string[][]): string[] {
  return Array.from({ length: COW_H }, (_unused, y) => {
    let out = '';
    for (let x = 0; x < COW_W; x += 1) {
      let ch = EMPTY;
      for (const f of fills) {
        const c = f[y]?.[x];
        if (c && c !== EMPTY) ch = c;
      }
      out += ch;
    }
    return out;
  });
}

/** Paint over hide. Used for markings that sit directly on her coat. */
function paintOnHide(g: string[][], cells: readonly Cell[]): void {
  for (const [x, y, ch] of cells) if (g[y]?.[x] === HIDE) g[y]![x] = ch;
}

/**
 * Paint over an earlier feature — nostrils go on the snout, which is no longer
 * hide by the time they are drawn. Never touches the outline.
 */
function paintOnFeature(g: string[][], cells: readonly Cell[], under: string): void {
  for (const [x, y, ch] of cells) if (g[y]?.[x] === under) g[y]![x] = ch;
}

function block(x0: number, y0: number, x1: number, y1: number, ch: string): Cell[] {
  const cells: Cell[] = [];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) cells.push([x, y, ch]);
  return cells;
}

export interface LegPose {
  /** Horizontal swing, in pixels. */
  dx: number;
  /** How far the hoof is lifted off the ground, in pixels. */
  lift: number;
}

/** Legs as a fill, so they get the same hide and outline as the rest of her. */
function legFill(poses: readonly LegPose[], bob: number): string[] {
  const rows = Array.from({ length: COW_H }, () => Array.from({ length: COW_W }, () => EMPTY));
  LEG_X.forEach((baseX, i) => {
    const pose = poses[i] ?? { dx: 0, lift: 0 };
    const bottom = GROUND_ROW - pose.lift;
    for (let y = LEG_TOP + bob; y <= bottom; y += 1) {
      for (let x = baseX + pose.dx; x < baseX + pose.dx + LEG_W; x += 1) {
        if (x < 0 || x >= COW_W || !rows[y]) continue;
        rows[y]![x] = HIDE;
      }
    }
  });
  return rows.map((r) => r.join(''));
}

/** Markings. Kept off the head so her face stays readable. */
const HIDE_PATCHES: Cell[] = [...block(16, 6, 21, 10, 'b'), ...block(22, 8, 25, 11, 'b')];

/** Drawn on the hide: snout, eyes, and the dark horn nubs. */
const HEAD_FEATURES: Cell[] = [
  ...block(2, 9, 11, 13, 'p'), // big pink snout
  ...block(3, 5, 4, 6, 'e'), // eyes, set wide and high
  ...block(9, 5, 10, 6, 'e'),
  ...block(2, 0, 4, 1, 'k'), // horn nubs
  ...block(10, 0, 12, 1, 'k'),
];

/** Drawn on top of the snout. */
const NOSTRILS: Cell[] = [...block(4, 10, 5, 11, 'n'), ...block(8, 10, 9, 11, 'n')];

/** The tail reads as a dark switch rather than a white stub. */
const TAIL_CELLS: Cell[] = [...block(27, 6, 27, 12, 'b')];

interface FrameOptions {
  headDrop: number;
  legs: readonly LegPose[];
  bob: number;
}

function buildFrame({ headDrop, legs, bob }: FrameOptions): CowFrame {
  const torso = shift(TORSO, bob);
  const head = shift(HEAD, bob + headDrop);
  const legsFill = legFill(legs, bob);

  // Outline the whole animal in one pass, so there are no seams between the
  // head, the body and the legs.
  const g = outlined(union(torso, legsFill, head));

  paintOnHide(
    g,
    HIDE_PATCHES.map(([x, y, c]) => [x, y + bob, c] as Cell),
  );
  paintOnHide(g, block(18, 12 + bob, 20, 13 + bob, 'p')); // udder
  paintOnHide(
    g,
    TAIL_CELLS.map(([x, y, c]) => [x, y + bob, c] as Cell),
  );

  const headShift = bob + headDrop;
  paintOnHide(
    g,
    HEAD_FEATURES.map(([x, y, c]) => [x, y + headShift, c] as Cell),
  );
  paintOnFeature(
    g,
    NOSTRILS.map(([x, y, c]) => [x, y + headShift, c] as Cell),
    'p',
  );

  return g.map((r) => r.join(''));
}

/* ------------------------------------------------------------------- poses */

const planted: LegPose[] = Array.from({ length: 4 }, () => ({ dx: 0, lift: 0 }));
const passing: LegPose[] = Array.from({ length: 4 }, () => ({ dx: 0, lift: 1 }));

/**
 * A quadruped walk lifts diagonal pairs together. There is no horizontal swing
 * — at three pixels wide a leg that slides sideways reads as a broken leg
 * rather than a stride.
 */
const lifts = (a: number, b: number, c: number, d: number): LegPose[] =>
  [a, b, c, d].map((lift) => ({ dx: 0, lift }));

const WALK_LEGS: LegPose[][] = [lifts(0, 2, 0, 2), passing, lifts(2, 0, 2, 0), passing];

export const COW_STAND: CowFrame = buildFrame({ headDrop: 0, legs: planted, bob: 0 });

export const COW_WALK: CowFrame[] = WALK_LEGS.map((legs, i) =>
  // The torso rides up on the passing frames, which is what sells the gait.
  buildFrame({ headDrop: 0, legs, bob: i % 2 === 1 ? 1 : 0 }),
);

/**
 * Grazing. Her head is already low, so a small dip puts the snout in the grass
 * — and alternating the dip reads as chewing.
 */
export const COW_EAT: CowFrame[] = [3, 2].map((headDrop) =>
  buildFrame({ headDrop, legs: planted, bob: 0 }),
);
