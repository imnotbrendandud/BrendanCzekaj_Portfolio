/**
 * All site copy lives here. Edit this file to change content without touching
 * layout, styling, or the scene. Every field is typed, so a typo or a missing
 * property fails `npm run typecheck` rather than shipping silently.
 *
 * Anything marked TODO is a placeholder you need to fill in.
 */

export type Tag = string;

export interface ProjectLink {
  /** Visible label, e.g. "GitHub" or "Live demo". */
  readonly label: string;
  readonly href: string;
}

export interface Project {
  readonly name: string;
  /** One or two sentences. Rendered as body copy, not pixel font. */
  readonly blurb: string;
  readonly stack: readonly Tag[];
  readonly link: ProjectLink;
}

export interface ExperienceEntry {
  readonly role: string;
  readonly company: string;
  /** Free-form date range. TODO: fill in the real start date. */
  readonly period: string;
  readonly bullets: readonly string[];
  readonly stack: readonly Tag[];
}

export interface ContactLink {
  readonly label: string;
  readonly href: string;
  /** Shown instead of the raw href when set. */
  readonly display?: string;
}

export interface SiteMeta {
  /** Absolute origin, no trailing slash. Used for canonical + Open Graph URLs. */
  readonly url: string;
  readonly title: string;
  readonly description: string;
  /** Path to the Open Graph image, relative to /public. */
  readonly ogImage: string;
  readonly ogImageAlt: string;
}

export interface Portfolio {
  readonly meta: SiteMeta;
  readonly hero: {
    readonly name: string;
    /** One line. Rendered in the pixel font, so keep it short. */
    readonly tagline: string;
  };
  readonly about: {
    readonly heading: string;
    readonly paragraphs: readonly string[];
  };
  readonly experience: {
    readonly heading: string;
    readonly entries: readonly ExperienceEntry[];
  };
  readonly projects: {
    readonly heading: string;
    readonly entries: readonly Project[];
  };
  readonly contact: {
    readonly heading: string;
    readonly blurb: string;
    readonly links: readonly ContactLink[];
  };
  readonly footer: {
    readonly note: string;
  };
}

export const portfolio: Portfolio = {
  meta: {
    url: 'https://brendanczekaj.com',
    title: 'Brendan — Software Engineer',
    description:
      'Software engineer at United Wholesale Mortgage. C#/.NET, React, SQL Server, Kafka, Redis, and Orkes-orchestrated workflows. Building Nexus and Hollow on the side.',
    ogImage: '/og.png',
    ogImageAlt:
      'Pixel-art night sky with stars, a crescent of moonlight and a dark treeline horizon, over the name BRENDAN.',
  },

  hero: {
    name: 'BRENDAN',
    tagline: 'SOFTWARE ENGINEER · INDIE BUILDER',
  },

  about: {
    heading: '01 · ABOUT',
    paragraphs: [
      "I'm a software engineer building internal microservices that mortgage loan teams use every day — owning features end-to-end across a C#/.NET and React stack on SQL Server, Kafka, Redis, and Orkes-orchestrated workflows.",
      "Off the clock, I'm building toward an independent product of my own.",
    ],
  },

  experience: {
    heading: '02 · EXPERIENCE',
    entries: [
      {
        role: 'Software Engineer',
        company: 'United Wholesale Mortgage',
        // TODO: replace with your real start date, e.g. '2023 — Present'.
        period: 'TODO — Present',
        bullets: [
          'Own features end-to-end across the Queue and Task microservices, the internal system mortgage loan teams use for task management.',
          'Work in an enterprise microservice architecture with Orkes-orchestrated workflows.',
          'Use mutation testing with Stryker to raise confidence in the test suite.',
        ],
        stack: ['C#/.NET', 'REACT', 'SQL SERVER', 'KAFKA', 'REDIS', 'ORKES', 'DOCKER'],
      },
    ],
  },

  projects: {
    heading: '03 · PROJECTS',
    entries: [
      {
        name: 'Nexus',
        blurb:
          'A local-first productivity app: journal, tasks, goals, habits and a Pomodoro timer in one place. Everything persists in the browser, so there is no backend and no account.',
        stack: ['NEXT.JS', 'TYPESCRIPT', 'DEXIE.JS'],
        // TODO: point this at the real repo or live site.
        link: { label: 'GitHub', href: 'TODO' },
      },
      {
        name: 'Hollow',
        blurb:
          'An ecosystem life-sim set in a three-biome world, with a 72-species creature encyclopedia that fills in as you discover them.',
        stack: ['UNITY 6 LTS', 'C#'],
        // TODO: point this at the real repo, devlog or itch.io page.
        link: { label: 'Devlog', href: 'TODO' },
      },
    ],
  },

  contact: {
    heading: '04 · CONTACT',
    blurb:
      "Heads-down on the day job, building an independent product on the side. If either overlaps with what you're doing, I'd like to hear about it.",
    links: [
      // TODO: fill in all three hrefs.
      { label: 'Email', href: 'mailto:TODO', display: 'TODO@example.com' },
      { label: 'GitHub', href: 'TODO', display: 'github.com/TODO' },
      { label: 'LinkedIn', href: 'TODO', display: 'linkedin.com/in/TODO' },
    ],
  },

  footer: {
    note: 'Built with Next.js. Hand-placed pixels. The sky follows your local clock.',
  },
};
