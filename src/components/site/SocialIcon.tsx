import type { ReactNode } from 'react';
import type { Network } from '@/content/site';

/**
 * Outline icons for the profile links: a 24px grid, rounded 1.75px strokes,
 * drawn in the text colour so they follow hover and focus states.
 *
 * The GitHub outline is adapted from Tabler Icons (MIT,
 * https://tabler.io/icons); the others are simple shapes drawn to match.
 */
const ICONS: Record<Network, ReactNode> = {
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  // LinkedIn's recognisable shape: "in" inside a rounded square.
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3.5" />
      <path d="M8 11v5.5" />
      <path d="M8 7.75v.01" />
      <path d="M12 16.5V11" />
      <path d="M16.5 16.5v-3.25a2.25 2.25 0 0 0-4.5 0" />
    </>
  ),
  github: (
    <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
  ),
  instagram: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M16.5 7.5v.01" />
    </>
  ),
};

export const NETWORK_NAMES: Record<Network, string> = {
  email: 'Email',
  linkedin: 'LinkedIn',
  github: 'GitHub',
  instagram: 'Instagram',
};

export function SocialIcon({ network }: { network: Network }) {
  return (
    <svg
      className="social-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[network]}
    </svg>
  );
}
