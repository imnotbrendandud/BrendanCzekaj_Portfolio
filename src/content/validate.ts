import type { Block, HeroLink, Portfolio, Tab } from './portfolio';
import { NETWORKS, type Network } from './networks';
import type { Site } from './site';
import { normalizeInline, sanitizeHref } from '@/lib/inline';

/**
 * Checks that `input` is a well-formed Portfolio and returns a normalised copy:
 * formatted text in canonical form, unknown fields dropped, keys in a fixed
 * order (so two equal documents always stringify identically).
 *
 * Throws with the path of the first problem. Runs when portfolio.json is
 * imported and on every save from the editor, so the file can't drift into a
 * shape the site can't render.
 */
export function validatePortfolio(input: unknown): Portfolio {
  const ids = new Set<string>();
  const doc = object(input, 'content');
  const meta = object(doc.meta, 'meta');
  const hero = object(doc.hero, 'hero');
  const footer = object(doc.footer, 'footer');

  const tabs = array(doc.tabs, 'tabs');
  if (tabs.length === 0) throw new ContentError('tabs', 'needs at least one tab');
  if (tabs.length > MAX_TABS) throw new ContentError('tabs', `allows at most ${MAX_TABS} tabs`);
  const tabIds = new Set<string>();

  return {
    meta: {
      url: string(meta.url, 'meta.url'),
      title: string(meta.title, 'meta.title'),
      description: string(meta.description, 'meta.description'),
      ogImage: string(meta.ogImage, 'meta.ogImage'),
      ogImageAlt: string(meta.ogImageAlt, 'meta.ogImageAlt'),
    },
    hero: {
      name: string(hero.name, 'hero.name'),
      tagline: string(hero.tagline, 'hero.tagline'),
      links: heroLinks(hero.links, ids),
    },
    tabs: tabs.map((raw, i): Tab => {
      const at = `tabs[${i}]`;
      const tab = object(raw, at);
      const id = slug(tab.id, `${at}.id`);
      if (tabIds.has(id)) throw new ContentError(`${at}.id`, `duplicates another tab's id "${id}"`);
      tabIds.add(id);
      return {
        id,
        label: string(tab.label, `${at}.label`),
        blocks: array(tab.blocks, `${at}.blocks`).map((b, j) =>
          block(b, `${at}.blocks[${j}]`, ids),
        ),
      };
    }),
    footer: { note: string(footer.note, 'footer.note') },
  };
}

export class ContentError extends Error {
  constructor(path: string, problem: string) {
    super(`${path} ${problem}.`);
    this.name = 'ContentError';
  }
}

const MAX_TABS = 12;
const MAX_HERO_LINKS = 6;
const MAX_TEXT = 5000;

function heroLinks(input: unknown, ids: Set<string>): HeroLink[] {
  const links = array(input, 'hero.links');
  if (links.length > MAX_HERO_LINKS) {
    throw new ContentError('hero.links', `allows at most ${MAX_HERO_LINKS} links`);
  }
  return links.map((raw, i) => {
    const at = `hero.links[${i}]`;
    const link = object(raw, at);
    return {
      id: uniqueId(link.id, `${at}.id`, ids),
      label: string(link.label, `${at}.label`),
      href: href(link.href, `${at}.href`),
    };
  });
}

function block(input: unknown, at: string, ids: Set<string>): Block {
  const raw = object(input, at);
  const id = uniqueId(raw.id, `${at}.id`, ids);
  const type = raw.type;
  switch (type) {
    case 'heading':
    case 'subheading':
    case 'meta':
    case 'paragraph':
      return { id, type, text: rich(raw.text, `${at}.text`) };
    case 'list':
      return {
        id,
        type,
        items: array(raw.items, `${at}.items`).map((item, i) => {
          const where = `${at}.items[${i}]`;
          const o = object(item, where);
          return { id: uniqueId(o.id, `${where}.id`, ids), text: rich(o.text, `${where}.text`) };
        }),
      };
    case 'tags':
      return {
        id,
        type,
        tags: array(raw.tags, `${at}.tags`).map((tag, i) => {
          const where = `${at}.tags[${i}]`;
          const o = object(tag, where);
          return { id: uniqueId(o.id, `${where}.id`, ids), text: string(o.text, `${where}.text`) };
        }),
      };
    case 'link':
      return {
        id,
        type,
        text: string(raw.text, `${at}.text`),
        href: href(raw.href, `${at}.href`),
      };
    case 'contact':
      return {
        id,
        type,
        label: string(raw.label, `${at}.label`),
        text: string(raw.text, `${at}.text`),
        href: href(raw.href, `${at}.href`),
      };
    case 'divider':
      return { id, type };
    default:
      throw new ContentError(`${at}.type`, `is "${String(type)}", which isn't a block type`);
  }
}

function object(value: unknown, at: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ContentError(at, 'should be an object');
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, at: string): unknown[] {
  if (!Array.isArray(value)) throw new ContentError(at, 'should be a list');
  return value;
}

function string(value: unknown, at: string): string {
  if (typeof value !== 'string') throw new ContentError(at, 'should be text');
  if (value.length > MAX_TEXT) throw new ContentError(at, `is over ${MAX_TEXT} characters`);
  return value;
}

function rich(value: unknown, at: string): string {
  return normalizeInline(string(value, at));
}

function href(value: unknown, at: string): string {
  const safe = sanitizeHref(string(value, at));
  if (safe === null)
    throw new ContentError(at, 'uses a link scheme other than http, https, mailto or tel');
  return safe;
}

function slug(value: unknown, at: string): string {
  const s = string(value, at);
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(s)) {
    throw new ContentError(at, 'should be lowercase letters, digits and dashes');
  }
  return s;
}

function uniqueId(value: unknown, at: string, ids: Set<string>): string {
  const s = string(value, at);
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(s)) throw new ContentError(at, 'should be a short id');
  if (ids.has(s)) throw new ContentError(at, `duplicates the id "${s}"`);
  ids.add(s);
  return s;
}

/**
 * The same checks for the main page's copy (site.json): returns a normalised
 * copy or throws with the path of the first problem.
 */
export function validateSite(input: unknown): Site {
  const ids = new Set<string>();
  const doc = object(input, 'site');
  const photo = object(doc.photo, 'photo');
  const gamedev = object(doc.gamedev, 'gamedev');

  const tags = (value: unknown, at: string) =>
    array(value, at).map((raw, i) => {
      const where = `${at}[${i}]`;
      const tag = object(raw, where);
      return { id: uniqueId(tag.id, `${where}.id`, ids), text: string(tag.text, `${where}.text`) };
    });

  return {
    url: string(doc.url, 'url'),
    name: string(doc.name, 'name'),
    headline: string(doc.headline, 'headline'),
    photo: { src: string(photo.src, 'photo.src'), alt: string(photo.alt, 'photo.alt') },
    title: string(doc.title, 'title'),
    description: string(doc.description, 'description'),
    socials: array(doc.socials, 'socials').map((raw, i) => {
      const at = `socials[${i}]`;
      const social = object(raw, at);
      const network = social.network;
      if (!(NETWORKS as readonly unknown[]).includes(network)) {
        throw new ContentError(`${at}.network`, `should be one of ${NETWORKS.join(', ')}`);
      }
      return {
        id: uniqueId(social.id, `${at}.id`, ids),
        network: network as Network,
        handle: string(social.handle, `${at}.handle`),
        href: href(social.href, `${at}.href`),
      };
    }),
    resume: href(doc.resume, 'resume'),
    summary: rich(doc.summary, 'summary'),
    experience: array(doc.experience, 'experience').map((raw, i) => {
      const at = `experience[${i}]`;
      const role = object(raw, at);
      return {
        id: uniqueId(role.id, `${at}.id`, ids),
        title: string(role.title, `${at}.title`),
        company: string(role.company, `${at}.company`),
        period: string(role.period, `${at}.period`),
        bullets: array(role.bullets, `${at}.bullets`).map((rawBullet, j) => {
          const where = `${at}.bullets[${j}]`;
          const bullet = object(rawBullet, where);
          return {
            id: uniqueId(bullet.id, `${where}.id`, ids),
            text: rich(bullet.text, `${where}.text`),
          };
        }),
        stack: tags(role.stack, `${at}.stack`),
      };
    }),
    projects: array(doc.projects, 'projects').map((raw, i) => {
      const at = `projects[${i}]`;
      const project = object(raw, at);
      const link = object(project.link, `${at}.link`);
      return {
        id: uniqueId(project.id, `${at}.id`, ids),
        name: string(project.name, `${at}.name`),
        blurb: rich(project.blurb, `${at}.blurb`),
        stack: tags(project.stack, `${at}.stack`),
        link: {
          label: string(link.label, `${at}.link.label`),
          href: href(link.href, `${at}.link.href`),
        },
      };
    }),
    gamedev: {
      label: string(gamedev.label, 'gamedev.label'),
      href: href(gamedev.href, 'gamedev.href'),
    },
  };
}
