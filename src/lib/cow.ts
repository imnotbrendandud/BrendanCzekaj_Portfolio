/**
 * The cow that grazes at the bottom of the page.
 *
 * Frames are generated at module load rather than hand-authored character by
 * character: a silhouette is declared once and the dark outline is derived from
 * it, so the outline can never end up with a gap.
 *
 * Draw order matters. Legs are drawn after the body is outlined — outlining
 * them too would fuse neighbouring legs into a single block. The grazing head
 * is then stamped over the top, because a lowered head passes in front of the
 * forelegs.
 *
 * Palette keys match the ones `Cow` maps to CSS custom properties:
 *   w hide   b patch/shadow   k outline & hooves   p muzzle & udder   e eye
 */

export const COW_W = 32;
export const COW_H = 20;

/** Row the hooves rest on. */
const GROUND_ROW = 17;
/** Row the legs hang from. */
const LEG_TOP = 10;
const LEG_W = 3;
/** Rear pair, then front pair. */
const LEG_X = [7, 12, 18, 23] as const;

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

/** Torso. Identical in both postures — only the head moves. */
const TORSO: string[] = [
  row(),
  row([_, 6], [w, 13]),
  row([_, 5], [w, 15]),
  row([_, 5], [w, 16]),
  row([_, 5], [w, 17]),
  row([_, 5], [w, 17]),
  row([_, 5], [w, 17]),
  row([_, 5], [w, 17]),
  row([_, 5], [w, 16]),
  row([_, 5], [w, 15]),
  row([_, 6], [w, 13]), // belly
];

/** Head up: neck and head reach forward from the shoulder. */
const HEAD_UP: string[] = [
  row(),
  row(),
  row([_, 22], [w, 3]), // ear
  row([_, 22], [w, 3]),
  row([_, 20], [w, 8]),
  row([_, 20], [w, 9]),
  row([_, 20], [w, 9]),
  row([_, 20], [w, 9]),
  row([_, 21], [w, 7]),
];

/**
 * Head down. A narrow neck angles down from the shoulder to a compact head
 * sitting at ground level — taper the whole thing evenly and it reads as a
 * snout rather than a grazing cow.
 */
const HEAD_DOWN: string[] = [
  row(),
  row(),
  row(),
  row(),
  row(),
  row(),
  row([_, 19], [w, 4]), // neck leaving the shoulder
  row([_, 20], [w, 4]),
  row([_, 20], [w, 4]),
  row([_, 21], [w, 4]),
  row([_, 21], [w, 4]),
  row([_, 22], [w, 7]), // head
  row([_, 22], [w, 8]),
  row([_, 22], [w, 8]),
  row([_, 23], [w, 7]),
  row([_, 23], [w, 6]),
  row([_, 24], [w, 5]), // muzzle in the grass
];

/** Tail, part of the torso silhouette so it picks up the outline too. */
const TAIL: [number, number][] = [
  [4, 2],
  [4, 3],
  [4, 4],
  [4, 5],
  [4, 6],
  [4, 7],
  [3, 8],
  [3, 9],
  [3, 10],
  [3, 11],
];

const blankGrid = (): string[][] =>
  Array.from({ length: COW_H }, () => Array.from({ length: COW_W }, () => EMPTY));

/** Surround every filled cell with a dark outline. */
function outlined(fill: readonly string[], tail = false): string[][] {
  const g = blankGrid();
  for (let y = 0; y < COW_H; y += 1) {
    const src = fill[y];
    if (!src) continue;
    for (let x = 0; x < COW_W; x += 1) if (src[x] && src[x] !== EMPTY) g[y]![x] = src[x]!;
  }
  if (tail) for (const [x, y] of TAIL) if (g[y]) g[y]![x] = HIDE;

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

function paintOnHide(g: string[][], cells: readonly Cell[]): void {
  for (const [x, y, ch] of cells) if (g[y]?.[x] === HIDE) g[y]![x] = ch;
}

function block(x0: number, y0: number, x1: number, y1: number, ch: string): Cell[] {
  const cells: Cell[] = [];
  for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) cells.push([x, y, ch]);
  return cells;
}

const HIDE_PATCHES: Cell[] = [
  ...block(7, 2, 11, 4, 'b'),
  ...block(6, 6, 9, 9, 'b'),
  ...block(14, 5, 16, 7, 'b'),
];

export interface LegPose {
  /** Horizontal swing, in pixels. */
  dx: number;
  /** How far the hoof is lifted off the ground, in pixels. */
  lift: number;
}

function drawLegs(g: string[][], poses: readonly LegPose[], bob: number): void {
  LEG_X.forEach((baseX, i) => {
    const pose = poses[i] ?? { dx: 0, lift: 0 };
    const bottom = GROUND_ROW - pose.lift;
    for (let y = LEG_TOP + bob; y <= bottom; y += 1) {
      for (let x = baseX + pose.dx; x < baseX + pose.dx + LEG_W; x += 1) {
        if (!g[y] || x < 0 || x >= COW_W) continue;
        g[y]![x] = y >= bottom - 1 ? 'k' : 'b';
      }
    }
  });
}

interface FrameOptions {
  head: readonly string[];
  headFeatures: readonly Cell[];
  legs: readonly LegPose[];
  bob: number;
}

function buildFrame({ head, headFeatures, legs, bob }: FrameOptions): CowFrame {
  const torso = shift(TORSO, bob);
  const headFill = shift(head, bob);

  // Outline the torso and head as ONE silhouette. Outlining the head on its own
  // would draw its border straight down the neck, leaving a seam at the
  // shoulder that reads as a detached head.
  const g = outlined(union(torso, headFill), true);
  paintOnHide(
    g,
    HIDE_PATCHES.map(([x, y, c]) => [x, y + bob, c] as Cell),
  );
  paintOnHide(g, block(15, 10 + bob, 17, 11 + bob, 'p')); // udder
  paintOnHide(
    g,
    headFeatures.map(([x, y, c]) => [x, y + bob, c] as Cell),
  );

  // A lowered head passes in front of the forelegs, so keep a copy of the head
  // and put it back once the legs are down.
  const beforeLegs = g.map((r) => [...r]);
  drawLegs(g, legs, bob);
  restore(g, beforeLegs, headMask(headFill, torso));

  return g.map((r) => r.join(''));
}

/** Cells covered by the head and its outline, excluding the torso itself. */
function headMask(head: readonly string[], torso: readonly string[]): boolean[][] {
  const mask = Array.from({ length: COW_H }, () => Array.from({ length: COW_W }, () => false));
  for (let y = 0; y < COW_H; y += 1) {
    for (let x = 0; x < COW_W; x += 1) {
      if (head[y]?.[x] === undefined || head[y]![x] === EMPTY) continue;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= COW_H || nx < 0 || nx >= COW_W) continue;
          // Never restore over the torso: the legs join the body there.
          if (torso[ny]?.[nx] && torso[ny]![nx] !== EMPTY) continue;
          mask[ny]![nx] = true;
        }
      }
    }
  }
  return mask;
}

function union(a: readonly string[], b: readonly string[]): string[] {
  return Array.from({ length: COW_H }, (_unused, y) => {
    let out = '';
    for (let x = 0; x < COW_W; x += 1) {
      const ca = a[y]?.[x];
      const cb = b[y]?.[x];
      out += cb && cb !== EMPTY ? cb : ca && ca !== EMPTY ? ca : EMPTY;
    }
    return out;
  });
}

function restore(g: string[][], from: readonly string[][], mask: readonly boolean[][]): void {
  for (let y = 0; y < COW_H; y += 1)
    for (let x = 0; x < COW_W; x += 1) if (mask[y]![x]) g[y]![x] = from[y]![x]!;
}

/* ------------------------------------------------------------------- poses */

const UP_FEATURES: Cell[] = [...block(26, 6, 28, 7, 'p'), [24, 5, 'e']];
const DOWN_FEATURES: Cell[] = [...block(24, 15, 28, 16, 'p'), [25, 12, 'e']];

const planted: LegPose[] = Array.from({ length: 4 }, () => ({ dx: 0, lift: 0 }));
const passing: LegPose[] = Array.from({ length: 4 }, () => ({ dx: 0, lift: 1 }));

/** A quadruped walk swings diagonal pairs together. */
const WALK_LEGS: LegPose[][] = [
  [
    { dx: -2, lift: 0 },
    { dx: 2, lift: 3 },
    { dx: 2, lift: 0 },
    { dx: -2, lift: 3 },
  ],
  passing,
  [
    { dx: 2, lift: 3 },
    { dx: -2, lift: 0 },
    { dx: -2, lift: 3 },
    { dx: 2, lift: 0 },
  ],
  passing,
];

export const COW_STAND: CowFrame = buildFrame({
  head: HEAD_UP,
  headFeatures: UP_FEATURES,
  legs: planted,
  bob: 0,
});

export const COW_WALK: CowFrame[] = WALK_LEGS.map((legs, i) => {
  // The torso rides up on the passing frames, which is what sells the gait.
  const bob = i % 2 === 1 ? 1 : 0;
  return buildFrame({ head: HEAD_UP, headFeatures: UP_FEATURES, legs, bob });
});

/** Head down, jaw working — the second frame is the chew. */
export const COW_EAT: CowFrame[] = [0, -1].map((chew) =>
  buildFrame({
    head: shift(HEAD_DOWN, chew),
    headFeatures: DOWN_FEATURES.map(([x, y, c]) => [x, y + chew, c] as Cell),
    legs: planted,
    bob: 0,
  }),
);
