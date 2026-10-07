import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans, Press_Start_2P } from 'next/font/google';
import { ThemeScript } from '@/components/ThemeScript';
import { ThemeProvider } from '@/components/ThemeProvider';
import { DEFAULT_THEME } from '@/lib/theme';
import { portfolio } from '@/content/portfolio';
import './gamedev.css';

/** Headings, labels and tags only — never paragraphs. */
const pressStart = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pixel',
});

/** All body copy. */
const plex = IBM_Plex_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-body',
});

const { meta } = portfolio;

/** This layout serves /gamedev; the recruiter-facing page at / has its own. */
const PATH = '/gamedev/';

export const metadata: Metadata = {
  metadataBase: new URL(meta.url),
  title: meta.title,
  description: meta.description,
  alternates: { canonical: PATH },
  openGraph: {
    type: 'website',
    url: `${meta.url}${PATH}`,
    title: meta.title,
    description: meta.description,
    siteName: meta.title,
    images: [{ url: meta.ogImage, width: 1200, height: 630, alt: meta.ogImageAlt }],
  },
  twitter: {
    card: 'summary_large_image',
    title: meta.title,
    description: meta.description,
    images: [{ url: meta.ogImage, alt: meta.ogImageAlt }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Matches the night sky, which is what the server renders.
  themeColor: '#05041a',
};

/**
 * Root layout for the pixel-art game development page. A separate root layout
 * from the main site's, so the pixel theme, its fonts and its pre-paint theme
 * script never load on the recruiter-facing page, and vice versa.
 */
export default function GamedevLayout({ children }: { children: React.ReactNode }) {
  return (
    // The server can't know the visitor's local time, so it renders the default
    // theme. ThemeScript corrects this before the first paint.
    // suppressHydrationWarning covers exactly one attribute: data-theme, which
    // ThemeScript rewrites before React hydrates. That mismatch is the whole
    // point of the pre-paint swap, not a bug to fix.
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      className={`${pressStart.variable} ${plex.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
