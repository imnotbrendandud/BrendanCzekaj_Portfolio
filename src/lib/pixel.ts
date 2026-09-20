/**
 * Pixel maps, transcribed from the mockups.
 *
 * Each map is an array of equal-length strings, one character per pixel.
 * `.` is transparent; every other character indexes into a palette supplied by
 * the component that draws it.
 *
 * Maps are compressed into horizontal runs before rendering (see `toRuns`), so
 * a 16x16 sprite costs ~40 DOM nodes rather than 256.
 */

export type PixelMap = readonly string[];

export interface Run {
  /** Column index where the run starts. */
  readonly x: number;
  /** Row index. */
  readonly y: number;
  /** Run length in pixels. */
  readonly w: number;
  /** Palette key for this run. */
  readonly key: string;
}

/** Collapse a pixel map into one run per horizontal stretch of equal pixels. */
export function toRuns(map: PixelMap): Run[] {
  const runs: Run[] = [];
  map.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x]!;
      if (key === '.') {
        x += 1;
        continue;
      }
      let w = 1;
      while (x + w < row.length && row[x + w] === key) w += 1;
      runs.push({ x, y, w, key });
      x += w;
    }
  });
  return runs;
}

export function mapWidth(map: PixelMap): number {
  return map[0]?.length ?? 0;
}

/**
 * Sun: 16x16 pixel circle. `R` is the outer ring, `C` the brighter core.
 */
export const SUN: PixelMap = [
  '....RRRCCRRR....',
  '...RCCCCCCCCR...',
  '..RCCCCCCCCCCR..',
  '.RCCCCCCCCCCCCR.',
  'RCCCCCCCCCCCCCCR',
  'RCCCCCCCCCCCCCCR',
  'RCCCCCCCCCCCCCCR',
  'CCCCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCCCC',
  'RCCCCCCCCCCCCCCR',
  'RCCCCCCCCCCCCCCR',
  'RCCCCCCCCCCCCCCR',
  '.RCCCCCCCCCCCCR.',
  '..RCCCCCCCCCCR..',
  '...RCCCCCCCCR...',
  '....RRRCCRRR....',
];

/**
 * Moon: 16x16 pixel circle. `L` is the lit surface, `D` a crater.
 */
export const MOON: PixelMap = [
  '.......LL.......',
  '....LLLLLLLL....',
  '...LLLLLLLLLL...',
  '..LLLLLLLLLLLL..',
  '.LLLDDDLLLLLLLL.',
  '.LLLDDDLLLLLLLL.',
  '.LLLDDDLLLLLLLL.',
  'LLLLLLLLLLLLLLLL',
  'LLLLLLLLLLDLLLLL',
  '.LLLLLLLLDDDLLL.',
  '.LLLLLDLLLDLLLL.',
  '.LLLLDDDLLLLLLL.',
  '..LLLLDLLLLLLL..',
  '...LLLLLLLLLL...',
  '....LLLLLLLL....',
  '.......LL.......',
];

/**
 * Clouds: chunky two-tone shapes, `l` lit on top, `s` shaded underneath.
 * Three silhouettes so the sky doesn't read as one shape repeated.
 */
export const CLOUDS: readonly PixelMap[] = [
  [
    '......llll......',
    '...llllllllll...',
    '.lllllllllllllll',
    'llllllllllllllll',
    'ssssssssssssssss',
    '..ssssssssssss..',
  ],
  [
    '.....lll....ll....',
    '...llllllllllllll.',
    '.llllllllllllllll.',
    'llllllllllllllllll',
    'ssssssssssssssssss',
    '...ssssssssssss...',
  ],
  [
    '........lll.....',
    '....lllllllll...',
    '..llllllllllllll',
    'llllllllllllllll',
    'ssssssssssssssss',
    '.....ssssss.....',
  ],
];

/**
 * Conifer silhouettes for the treeline. `d` is the dark body, `m` a lit edge.
 */
export const TREES: readonly PixelMap[] = [
  [
    '...dd...',
    '...dd...',
    '..dmdd..',
    '..dmdd..',
    '.ddmddd.',
    '.ddmddd.',
    'dddmdddd',
    'dddmdddd',
    '...dd...',
    '...dd...',
  ],
  ['..dd..', '..dd..', '.dmdd.', '.dmdd.', 'ddmddd', 'ddmddd', '..dd..'],
  [
    '....dd....',
    '...ddmd...',
    '...ddmd...',
    '..dddmdd..',
    '..dddmdd..',
    '.ddddmddd.',
    '.ddddmddd.',
    'dddddmdddd',
    '....dd....',
    '....dd....',
  ],
];

/**
 * Every row of a map must be the same width, or `toRuns` silently produces a
 * lopsided sprite. Checked once at module load in development.
 */
function assertRectangular(name: string, maps: readonly PixelMap[]): void {
  maps.forEach((map, i) => {
    const w = mapWidth(map);
    map.forEach((row, y) => {
      if (row.length !== w) {
        throw new Error(
          `${name}[${i}] row ${y} is ${row.length} px wide, expected ${w}. Pixel maps must be rectangular.`,
        );
      }
    });
  });
}

if (process.env.NODE_ENV !== 'production') {
  assertRectangular('SUN', [SUN]);
  assertRectangular('MOON', [MOON]);
  assertRectangular('CLOUDS', CLOUDS);
  assertRectangular('TREES', TREES);
}
