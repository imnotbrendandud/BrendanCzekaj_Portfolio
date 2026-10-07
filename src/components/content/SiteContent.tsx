'use client';

import type { ReactNode } from 'react';
import type { Portfolio } from '@/content/portfolio';
import { TabbedWindow } from '@/components/TabbedWindow';
import { PixelSprite } from '@/components/scene/PixelSprite';
import { iconFor } from '@/lib/icons';
import { BlockList } from './Blocks';

interface SiteContentProps {
  content: Portfolio;
  /**
   * The editor swaps in its own versions of these. On the live site they're
   * left out and everything renders read-only.
   */
  slots?: {
    name?: ReactNode;
    tagline?: ReactNode;
    footer?: ReactNode;
    /** Content for the given tab, in place of its read-only blocks. */
    tab?: (index: number) => ReactNode;
  };
  /** Controlled active tab, for the editor. */
  activeTab?: number;
  onActiveTabChange?: (index: number) => void;
}

/** Title, the tabbed window, and the footer: everything in front of the scenery. */
export function SiteContent({ content, slots, activeTab, onActiveTabChange }: SiteContentProps) {
  const { hero, tabs, footer } = content;
  return (
    <>
      <header className="content hero">
        <h1 className="hero-title">{slots?.name ?? hero.name}</h1>
        <div className="hero-tagline">{slots?.tagline ?? hero.tagline}</div>
        {/* Always on screen: what a recruiter looks for first. */}
        {hero.links.length > 0 ? (
          <nav className="hero-links" aria-label="Résumé and profiles">
            {hero.links.map((link) => {
              const external = /^https?:\/\//i.test(link.href);
              const icon = iconFor(link.href);
              return (
                <a
                  key={link.id}
                  className="hero-link"
                  href={link.href}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <span
                    className="hero-link-icon"
                    aria-hidden="true"
                    style={{ width: icon[0]!.length * 2, height: icon.length * 2 }}
                  >
                    <PixelSprite
                      map={icon}
                      unit="2px"
                      palette={{ X: 'currentColor' }}
                      style={{ position: 'relative' }}
                    />
                  </span>
                  {link.label}
                </a>
              );
            })}
          </nav>
        ) : null}
      </header>

      <main id="main" className="content stage">
        <TabbedWindow
          label="Portfolio sections"
          active={activeTab}
          onActiveChange={onActiveTabChange}
          tabs={tabs.map((tab, i) => ({
            id: tab.id,
            label: tab.label,
            content: slots?.tab?.(i) ?? <BlockList blocks={tab.blocks} />,
          }))}
        />
      </main>

      <footer className="site-footer">
        <div className="site-footer-note">{slots?.footer ?? footer.note}</div>
      </footer>
    </>
  );
}
