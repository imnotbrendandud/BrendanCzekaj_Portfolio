/**
 * Renders the Open Graph card: the night scene, drawn pixel by pixel and
 * written straight out as a PNG.
 *
 * There is no canvas dependency here on purpose — the image is pixel art, so
 * the "renderer" is a byte buffer and a hand-rolled PNG encoder, which keeps
 * the project free of native build steps.
 *
 *   npm run og
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WIDTH = 1200;
const HEIGHT = 630;

/* ------------------------------------------------------------------ colour */

const hex = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};

/** Night sky, the same nine stops the CSS uses. */
const SKY = [
  '#05041a',
  '#09072b',
  '#0e0b39',
  '#140f44',
  '#1b124f',
  '#241459',
  '#341960',
  '#4a2060',
  '#6b2f5c',
].map(hex);

const STAR_COLORS = ['#ffffff', '#8ecbff', '#9ad8ff', '#c4a0ff', '#d9a0ff', '#ff8a5c'].map(hex);

const MOON_LIGHT = hex('#fdf3d0');
const MOON_CRATER = hex('#ded0a4');
const RIDGES = [
  { color: hex('#241a52'), alpha: 0.95 },
  { color: hex('#191142'), alpha: 1 },
  { color: hex('#0f0a2e'), alpha: 1 },
];
const TREE_DARK = hex('#142620');
const TREE_MID = hex('#1b3229');
const GRASS = hex('#1d3a2e');
const GRASS_TOP = hex('#2a5240');
const GRASS_SPECKLE = hex('#3d6b52');
const TITLE_OUTLINE = hex('#1a0f3d');
const TITLE_GLOW = hex('#a894ff');

/* ------------------------------------------------------------------ buffer */

const px = new Uint8Array(WIDTH * HEIGHT * 3);

function setPx(x, y, rgb, alpha = 1) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 3;
  if (alpha >= 1) {
    px[i] = rgb[0];
    px[i + 1] = rgb[1];
    px[i + 2] = rgb[2];
    return;
  }
  px[i] = px[i] + (rgb[0] - px[i]) * alpha;
  px[i + 1] = px[i + 1] + (rgb[1] - px[i + 1]) * alpha;
  px[i + 2] = px[i + 2] + (rgb[2] - px[i + 2]) * alpha;
}

function fillRect(x, y, w, h, rgb, alpha = 1) {
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) setPx(x + dx, y + dy, rgb, alpha);
  }
}

/* --------------------------------------------------------------------- rng */

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(0x5eed1e);
const range = (a, b) => a + rnd() * (b - a);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

/* ------------------------------------------------------------------- scene */

// Sky gradient, interpolated across the nine stops.
for (let y = 0; y < HEIGHT; y += 1) {
  const t = (y / (HEIGHT - 1)) * (SKY.length - 1);
  const i = Math.min(SKY.length - 2, Math.floor(t));
  const f = t - i;
  const c = SKY[i].map((v, k) => v + f * (SKY[i + 1][k] - v));
  for (let x = 0; x < WIDTH; x += 1) setPx(x, y, c);
}

// Dither: 2px repeating lines at very low opacity, same as the page.
for (let y = 0; y < HEIGHT; y += 1) {
  if (y % 4 < 2) for (let x = 0; x < WIDTH; x += 1) setPx(x, y, [255, 255, 255], 0.035);
}
for (let x = 0; x < WIDTH; x += 1) {
  if (x % 4 < 2) for (let y = 0; y < HEIGHT; y += 1) setPx(x, y, [255, 255, 255], 0.025);
}

const HORIZON = 500;

// Plain dots.
for (let i = 0; i < 150; i += 1) {
  const x = range(0, WIDTH);
  const y = range(0, HORIZON - 40);
  const size = rnd() < 0.6 ? 2 : 3;
  fillRect(x, y, size, size, pick(STAR_COLORS), range(0.3, 0.85));
}

/** A 4-point tapered sparkle: vertical bar, horizontal bar, 3x3 centre block. */
function sparkle(cx, cy, unit, color, alpha) {
  fillRect(cx + 3 * unit, cy, unit, 7 * unit, color, alpha);
  fillRect(cx, cy + 3 * unit, 7 * unit, unit, color, alpha);
  fillRect(cx + 2 * unit, cy + 2 * unit, 3 * unit, 3 * unit, color, alpha);
  // Soft halo around the core.
  const gx = cx + 3.5 * unit;
  const gy = cy + 3.5 * unit;
  const r = unit * 5;
  for (let dy = -r; dy <= r; dy += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      setPx(gx + dx, gy + dy, color, (1 - d / r) ** 2 * 0.18 * alpha);
    }
  }
}

for (let i = 0; i < 26; i += 1) {
  sparkle(
    range(10, WIDTH - 40),
    range(10, HORIZON - 80),
    pick([3, 4, 5]),
    pick(STAR_COLORS),
    range(0.6, 1),
  );
}

// Moon: glow, then the pixel disc with its craters.
const MOON_MAP = (() => {
  // Read straight from the app's pixel maps so the card can't drift from the site.
  const src = readFileSync(join(ROOT, 'src/lib/pixel.ts'), 'utf8');
  const m = src.match(/export const MOON: PixelMap = \[([\s\S]*?)\n\];/);
  return m[1]
    .split('\n')
    .map((l) => l.trim().replace(/^'|',?$/g, ''))
    .filter(Boolean);
})();

const MOON_UNIT = 7;
const MOON_X = 950;
const MOON_Y = 70;
const moonCx = MOON_X + 8 * MOON_UNIT;
const moonCy = MOON_Y + 8 * MOON_UNIT;
const glowR = 16 * MOON_UNIT;
for (let dy = -glowR; dy <= glowR; dy += 1) {
  for (let dx = -glowR; dx <= glowR; dx += 1) {
    const d = Math.hypot(dx, dy);
    if (d > glowR) continue;
    setPx(moonCx + dx, moonCy + dy, hex('#fff7d6'), (1 - d / glowR) ** 2 * 0.3);
  }
}
MOON_MAP.forEach((row, y) => {
  [...row].forEach((ch, x) => {
    if (ch === '.') return;
    fillRect(
      MOON_X + x * MOON_UNIT,
      MOON_Y + y * MOON_UNIT,
      MOON_UNIT,
      MOON_UNIT,
      ch === 'D' ? MOON_CRATER : MOON_LIGHT,
    );
  });
});

// Stepped ridge silhouettes.
function ridge(baseY, maxDepth, step, colW, { color, alpha }) {
  let depth = Math.round(maxDepth / 2 / step) * step;
  for (let x = 0; x < WIDTH; x += colW) {
    if (rnd() > 0.28) {
      depth = Math.min(maxDepth, Math.max(0, depth + pick([-2, -1, -1, 0, 1, 1, 2]) * step));
    }
    fillRect(x, baseY + depth, colW, HEIGHT - baseY - depth, color, alpha);
  }
}
ridge(HORIZON - 70, 46, 6, 26, RIDGES[0]);
ridge(HORIZON - 40, 34, 6, 22, RIDGES[1]);
ridge(HORIZON - 14, 24, 5, 18, RIDGES[2]);

// Treeline.
const TREE = ['...dd...', '..dmdd..', '.ddmddd.', 'dddmdddd', '...dd...'];
for (let x = -10; x < WIDTH + 10; x += range(10, 22)) {
  const u = range(2.5, 4);
  const top = HORIZON + 10 - TREE.length * u;
  TREE.forEach((row, ry) => {
    [...row].forEach((ch, rx) => {
      if (ch === '.') return;
      fillRect(
        x + rx * u,
        top + ry * u,
        Math.ceil(u),
        Math.ceil(u),
        ch === 'm' ? TREE_MID : TREE_DARK,
      );
    });
  });
}

// Grass.
fillRect(0, HORIZON + 14, WIDTH, HEIGHT - HORIZON - 14, GRASS);
fillRect(0, HORIZON + 14, WIDTH, 6, GRASS_TOP);
for (let i = 0; i < 260; i += 1) {
  const x = range(0, WIDTH);
  const y = range(HORIZON + 24, HEIGHT);
  fillRect(x, y, 4, 4, GRASS_SPECKLE, 0.55);
  fillRect(x + 4, y + 4, 4, 4, GRASS_SPECKLE, 0.4);
}

/* -------------------------------------------------------------------- type */

/** A 5x7 pixel font, just the glyphs this card needs. */
const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  '·': ['00000', '00000', '00000', '00100', '00000', '00000', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
};

const textWidth = (text, unit, tracking) => text.length * (5 * unit + tracking) - tracking;

function drawText(text, x, y, unit, color, { outline, glow, tracking = unit } = {}) {
  let cx = x;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (!glyph) {
      cx += 5 * unit + tracking;
      continue;
    }
    glyph.forEach((row, gy) => {
      [...row].forEach((on, gx) => {
        if (on !== '1') return;
        const bx = cx + gx * unit;
        const by = y + gy * unit;
        if (outline) {
          // Hard pixel outline on all eight sides.
          for (const [ox, oy] of [
            [-1, -1],
            [0, -1],
            [1, -1],
            [-1, 0],
            [1, 0],
            [-1, 1],
            [0, 1],
            [1, 1],
          ]) {
            fillRect(bx + ox * unit, by + oy * unit, unit, unit, outline);
          }
        }
        if (glow) {
          const r = unit * 6;
          for (let dy = -r; dy <= r; dy += 2) {
            for (let dx = -r; dx <= r; dx += 2) {
              const d = Math.hypot(dx, dy);
              if (d > r) continue;
              setPx(bx + dx, by + dy, glow, (1 - d / r) ** 2 * 0.06);
            }
          }
        }
      });
    });
    cx += 5 * unit + tracking;
  }

  // Second pass so the glyph faces sit on top of every neighbour's outline.
  cx = x;
  for (const ch of text) {
    const glyph = FONT[ch];
    if (glyph) {
      glyph.forEach((row, gy) => {
        [...row].forEach((on, gx) => {
          if (on === '1') fillRect(cx + gx * unit, y + gy * unit, unit, unit, color);
        });
      });
    }
    cx += 5 * unit + tracking;
  }
}

const NAME = 'BRENDAN';
const TAGLINE = 'SOFTWARE ENGINEER · INDIE BUILDER';

const nameUnit = 11;
const nameTracking = 11;
drawText(
  NAME,
  (WIDTH - textWidth(NAME, nameUnit, nameTracking)) / 2,
  200,
  nameUnit,
  [255, 255, 255],
  { outline: TITLE_OUTLINE, glow: TITLE_GLOW, tracking: nameTracking },
);

const tagUnit = 3;
const tagTracking = 4;
drawText(
  TAGLINE,
  (WIDTH - textWidth(TAGLINE, tagUnit, tagTracking)) / 2,
  320,
  tagUnit,
  [255, 255, 255],
  { outline: TITLE_OUTLINE, tracking: tagTracking },
);

/* ---------------------------------------------------------------- png write */

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(WIDTH, 0);
ihdr.writeUInt32BE(HEIGHT, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // colour type: truecolour RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

// Each scanline is prefixed with a filter byte; 0 means "none".
const raw = Buffer.alloc(HEIGHT * (WIDTH * 3 + 1));
for (let y = 0; y < HEIGHT; y += 1) {
  const off = y * (WIDTH * 3 + 1);
  raw[off] = 0;
  Buffer.from(px.buffer, y * WIDTH * 3, WIDTH * 3).copy(raw, off + 1);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const out = join(ROOT, 'public/og.png');
writeFileSync(out, png);
console.log(`Wrote ${out} (${WIDTH}x${HEIGHT}, ${(png.length / 1024).toFixed(1)} KB)`);
