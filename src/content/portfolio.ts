/**
 * The shape of the site copy. The copy itself lives in `portfolio.json`; edit
 * it by hand, or in place on the page with the block editor (`npm run dev`,
 * then EDIT).
 *
 * Each tab in the window is a list of blocks: headings, paragraphs, lists,
 * tags, links, contact rows and dividers. A project, a job or any other
 * "section" is just a run of blocks, with a divider between one and the next.
 *
 * The JSON is validated when this module loads (see validate.ts), so a broken
 * file fails `npm run build` instead of shipping.
 *
 * Anything marked TODO in the JSON is a placeholder you need to fill in:
 * - experience: your real start date, e.g. '2023 — Present'
 * - project links: the real repo, live site, devlog or itch.io page
 * - contact links: all three hrefs and their display text
 */

import data from './portfolio.json';
import { validatePortfolio } from './validate';

export interface SiteMeta {
  /** Absolute origin, no trailing slash. Used for canonical + Open Graph URLs. */
  readonly url: string;
  readonly title: string;
  readonly description: string;
  /** Path to the Open Graph image, relative to /public. */
  readonly ogImage: string;
  readonly ogImageAlt: string;
}

/**
 * Formatted text: a strict HTML subset of <strong>, <em>, <mark> and
 * <a href="…">. See src/lib/inline.ts.
 */
export type RichText = string;

/** Every block, tag and list item carries a stable id for editing and drag-and-drop. */
interface Identified {
  readonly id: string;
}

export interface ListItem extends Identified {
  readonly text: RichText;
}

export interface Tag extends Identified {
  readonly text: string;
}

export interface TextBlock extends Identified {
  /** heading: pixel-font title · subheading: bold line · meta: small muted line */
  readonly type: 'heading' | 'subheading' | 'meta' | 'paragraph';
  readonly text: RichText;
}

export interface ListBlock extends Identified {
  readonly type: 'list';
  readonly items: readonly ListItem[];
}

/** A row of pixel-font labels, e.g. a tech stack. Plain text; keep each short. */
export interface TagsBlock extends Identified {
  readonly type: 'tags';
  readonly tags: readonly Tag[];
}

/** A pixel-font call to action, e.g. "GitHub →". Opens in a new tab. */
export interface LinkBlock extends Identified {
  readonly type: 'link';
  readonly text: string;
  readonly href: string;
}

/** A labelled contact line, e.g. EMAIL  you@example.com. */
export interface ContactBlock extends Identified {
  readonly type: 'contact';
  readonly label: string;
  readonly text: string;
  readonly href: string;
}

/** A horizontal rule, used to separate one project or job from the next. */
export interface DividerBlock extends Identified {
  readonly type: 'divider';
}

export type Block = TextBlock | ListBlock | TagsBlock | LinkBlock | ContactBlock | DividerBlock;
export type BlockType = Block['type'];

export interface Tab {
  /** URL hash for the tab, e.g. `projects` for /#projects. */
  readonly id: string;
  /** Tab label in the pixel font. One short word; numbering is automatic. */
  readonly label: string;
  readonly blocks: readonly Block[];
}

/** A button under the title, e.g. Résumé or LinkedIn. Always on screen. */
export interface HeroLink extends Identified {
  /** Short; rendered in the pixel font. */
  readonly label: string;
  readonly href: string;
}

export interface Portfolio {
  readonly meta: SiteMeta;
  readonly hero: {
    /** Your full name, so a search for it finds the page. */
    readonly name: string;
    /** Role and company, in the pixel font. */
    readonly tagline: string;
    /** The first thing a recruiter looks for: résumé, LinkedIn, GitHub, email. */
    readonly links: readonly HeroLink[];
  };
  readonly tabs: readonly Tab[];
  readonly footer: {
    readonly note: string;
  };
}

export const portfolio: Portfolio = validatePortfolio(data);
