/**
 * The shape of the main page's copy (the page at /, the one recruiters skim).
 * The copy itself lives in `site.json`; edit it in place with the editor
 * (`npm run dev`, then EDIT on /) or by hand.
 *
 * The JSON is validated when this module loads (see validate.ts), so a broken
 * file fails `npm run build` instead of shipping.
 *
 * Optional things are empty strings rather than missing keys: an empty résumé
 * path, project link or photo simply isn't shown. Nothing here ever renders as
 * a dead link.
 *
 * The pixel-art page at /gamedev has its own copy in portfolio.json.
 */

import data from './site.json';
import type { Network } from './networks';
import { validateSite } from './validate';

export { NETWORKS, type Network } from './networks';

/**
 * Formatted text: a strict HTML subset of <strong>, <em>, <mark> and
 * <a href="…">. See src/lib/inline.ts.
 */
export type RichText = string;

export interface Link {
  readonly label: string;
  /** Empty for no link. */
  readonly href: string;
}

/** Every list item carries a stable id for editing and drag-and-drop. */
interface Identified {
  readonly id: string;
}

/** A profile, shown as its icon; the handle is in the tooltip and accessible name. */
export interface Social extends Identified {
  readonly network: Network;
  /** Your address or username, exactly as it is there. */
  readonly handle: string;
  readonly href: string;
}

export interface Bullet extends Identified {
  readonly text: RichText;
}

/** A stack chip, e.g. "React". Plain text. */
export interface Tag extends Identified {
  readonly text: string;
}

export interface Role extends Identified {
  readonly title: string;
  readonly company: string;
  /** Free-form, e.g. 'May 2025 — Present'. */
  readonly period: string;
  readonly bullets: readonly Bullet[];
  readonly stack: readonly Tag[];
}

export interface Project extends Identified {
  readonly name: string;
  readonly blurb: RichText;
  readonly stack: readonly Tag[];
  /** Shown beside the name; leave the href empty for none. */
  readonly link: Link;
}

export interface Site {
  /** Absolute origin, no trailing slash. */
  readonly url: string;
  readonly name: string;
  /** One line under the name: role and company. */
  readonly headline: string;
  /** Headshot in public/, shown in a circle beside the name. Empty src for none. */
  readonly photo: { readonly src: string; readonly alt: string };
  /** Title and description for search results and link previews. */
  readonly title: string;
  readonly description: string;
  /** Profiles under your name, in this order. */
  readonly socials: readonly Social[];
  /** Path to a résumé PDF in public/, e.g. '/resume.pdf'. Empty until it exists. */
  readonly resume: string;
  readonly summary: RichText;
  /** Most recent first. */
  readonly experience: readonly Role[];
  readonly projects: readonly Project[];
  /** The pixel-art page, linked from the menu and footer. */
  readonly gamedev: Link;
}

export const site: Site = validateSite(data);
