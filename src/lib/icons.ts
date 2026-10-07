import type { PixelMap } from './pixel';

/**
 * Pixel icons for the header links (9x9, GitHub's 11x11), drawn on the same chunky grid as the
 * rest of the scene. `X` is ink (the button's text colour); `.` is
 * transparent, so the letters in the LinkedIn badge and the octocat's eyes
 * show the button behind them.
 */

const LINKEDIN: PixelMap = [
  '.XXXXXXX.',
  'XX.XXXXXX',
  'XXXXXXXXX',
  'XX.X...XX',
  'XX.X.X.XX',
  'XX.X.X.XX',
  'XX.X.X.XX',
  'XX.X.X.XX',
  '.XXXXXXX.',
];

/**
 * GitHub's mark: a filled circle with the cat cut out of it (ears, head,
 * neck and the curl of the tail). It needs 11x11 to read; a circle looks
 * smaller than a square at the same size, so the extra two pixels balance it
 * against the 9x9 icons.
 */
const GITHUB: PixelMap = [
  '...XXXXX...',
  '.XXXXXXXXX.',
  '.XX.XXX.XX.',
  'XX.......XX',
  'XX.......XX',
  'XX.......XX',
  'XXX.....XXX',
  'XX.X...XXXX',
  '.XX....XXX.',
  '.XXX...XXX.',
  '...X...X...',
];

const EMAIL: PixelMap = [
  '.........',
  'XXXXXXXXX',
  'XX.....XX',
  'X.X...X.X',
  'X..X.X..X',
  'X...X...X',
  'X.......X',
  'XXXXXXXXX',
  '.........',
];

/** A page with a folded corner and lines of text, for a résumé or any PDF. */
const DOCUMENT: PixelMap = [
  '.XXXXX...',
  '.X...XX..',
  '.X...XXX.',
  '.X.....X.',
  '.X.XXX.X.',
  '.X.....X.',
  '.X.XXX.X.',
  '.X.....X.',
  '.XXXXXXX.',
];

/** Anything else: an arrow pointing out. */
const EXTERNAL: PixelMap = [
  '....XXXXX',
  '......XXX',
  '.....X.XX',
  '....X...X',
  '...X.....',
  '..X......',
  '.X.......',
  'X........',
  '.........',
];

/** The icon for a link, chosen from where it goes, so links need no icon setting. */
export function iconFor(href: string): PixelMap {
  if (/^mailto:/i.test(href)) return EMAIL;
  if (/(^|\/\/|\.)linkedin\.com(\/|$)/i.test(href)) return LINKEDIN;
  if (/(^|\/\/|\.)github\.com(\/|$)/i.test(href)) return GITHUB;
  if (/\.pdf(\?|#|$)|r[ée]sum[ée]|\bcv\b/i.test(href)) return DOCUMENT;
  return EXTERNAL;
}
