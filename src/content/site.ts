/**
 * Copy for the main page at /, the one recruiters skim. Typed, so a typo or a
 * missing field fails `npm run typecheck`.
 *
 * The pixel-art game development page at /gamedev has its own copy in
 * portfolio.json, edited with the block editor there.
 *
 * Links are optional on purpose: leave one out rather than ship a placeholder.
 * A dead link is worse than none.
 */

export interface Link {
  readonly label: string;
  readonly href: string;
}

/** Networks with an icon in components/site/SocialIcon.tsx. */
export type Network = 'email' | 'linkedin' | 'github' | 'instagram';

/** A profile, shown as its icon and your handle there. */
export interface Social {
  readonly network: Network;
  /** What's shown next to the icon: your address or username, exactly as it is there. */
  readonly handle: string;
  readonly href: string;
}

export interface Role {
  readonly title: string;
  readonly company: string;
  /** Free-form, e.g. 'May 2025 — Present'. */
  readonly period: string;
  readonly bullets: readonly string[];
  readonly stack: readonly string[];
}

export interface Project {
  readonly name: string;
  readonly blurb: string;
  readonly stack: readonly string[];
  readonly link?: Link;
}

export interface Site {
  readonly url: string;
  readonly name: string;
  /** One line under the name: role and company. */
  readonly headline: string;
  /** Headshot in public/, shown in a circle beside the name. Square works best. */
  readonly photo?: { readonly src: string; readonly alt: string };
  /** Title and description for search results and link previews. */
  readonly title: string;
  readonly description: string;
  /** Profiles under your name, in this order. */
  readonly socials: readonly Social[];
  /** Path to a résumé PDF in public/, shown as a button. Leave unset until it exists. */
  readonly resume?: string;
  readonly summary: string;
  readonly experience: readonly Role[];
  readonly projects: readonly Project[];
  /** The pixel-art page, linked from the header and footer. */
  readonly gamedev: Link;
}

export const site: Site = {
  url: 'https://brendanczekaj.com',
  name: 'Brendan Czekaj',
  headline: 'Software Engineer at United Wholesale Mortgage',
  photo: { src: '/brendan-czekaj.jpg', alt: 'Headshot of Brendan Czekaj' },
  title: 'Brendan Czekaj — Software Engineer',
  description:
    'Software engineer at United Wholesale Mortgage building full-stack microservices in C#/.NET and React, with SQL Server, Kafka, Redis and Orkes.',

  socials: [
    { network: 'email', handle: 'brendanczekaj@gmail.com', href: 'mailto:brendanczekaj@gmail.com' },
    {
      network: 'linkedin',
      handle: 'brendan-czekaj-529b52255',
      href: 'https://www.linkedin.com/in/brendan-czekaj-529b52255/',
    },
    { network: 'github', handle: 'imnotbrendandud', href: 'https://github.com/imnotbrendandud' },
    // An Instagram icon is ready too:
    // { network: 'instagram', handle: '…', href: 'https://www.instagram.com/…/' },
  ],
  // TODO: resume: '/resume.pdf', once public/resume.pdf exists.

  summary:
    "I'm a software engineer at United Wholesale Mortgage, where I build and maintain full-stack microservices behind the internal tools used to manage tasks on mortgage loans. I own features end to end, working in C# .NET, React, and SQL Server, with Kafka, Redis, and Orkes for messaging, caching, and orchestration.",

  experience: [
    {
      title: 'Software Engineer',
      company: 'United Wholesale Mortgage',
      period: 'May 2025 — Present',
      bullets: [
        'Own features end-to-end across the Queue and Task microservices, the internal system mortgage loan teams use for task management.',
        'Work in an enterprise microservice architecture with Orkes-orchestrated workflows.',
        'Use mutation testing with Stryker to raise confidence in the test suite.',
      ],
      stack: ['C#/.NET', 'React', 'SQL Server', 'Kafka', 'Redis', 'Orkes', 'Docker'],
    },
  ],

  projects: [
    {
      name: 'Nexus',
      blurb:
        'A local-first productivity app: journal, tasks, goals, habits and a Pomodoro timer in one place. Everything persists in the browser, so there is no backend and no account.',
      stack: ['Next.js', 'TypeScript', 'Dexie.js'],
      // TODO: link: { label: 'GitHub', href: 'https://github.com/…' },
    },
    {
      name: 'Hollow',
      blurb:
        'An ecosystem life-sim set in a three-biome world, with a 72-species creature encyclopedia that fills in as you discover them.',
      stack: ['Unity 6', 'C#'],
      link: { label: 'Game dev portfolio', href: '/gamedev/' },
    },
  ],

  gamedev: { label: 'Game dev portfolio', href: '/gamedev/' },
};
