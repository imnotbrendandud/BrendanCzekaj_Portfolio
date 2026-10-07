import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { site } from '@/content/site';
import './site.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: site.title,
  description: site.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'profile',
    url: site.url,
    title: site.title,
    description: site.description,
    siteName: site.name,
  },
  twitter: {
    card: 'summary',
    title: site.title,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The deep teal of the page background.
  themeColor: '#021d20',
};

/**
 * Root layout for the main page at /, the one recruiters skim: one readable
 * panel on a deep teal background. The only client-side code is the section
 * menu. The pixel-art page at /gamedev has a separate root layout, so none of
 * its theme loads here.
 */
export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
