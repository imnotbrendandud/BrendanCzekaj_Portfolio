'use client';

import { portfolio } from '@/content/portfolio';
import { useTheme } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { PageContent } from '@/components/content/PageContent';
import { StarField } from '@/components/scene/StarField';
import { Clouds } from '@/components/scene/Clouds';
import { CelestialBody } from '@/components/scene/CelestialBody';
import { ShootingStars } from '@/components/scene/ShootingStars';
import { Ground } from '@/components/scene/Ground';

export default function Home() {
  const { theme } = useTheme();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      {/* Fixed to the top-right corner, but placed first in the DOM so keyboard
          users reach it right after the skip link rather than after the whole
          page. */}
      <ThemeToggle />

      <div className="scene">
        {/* Everything in here is decoration. */}
        <StarField />
        <Clouds />
        <CelestialBody />
        <ShootingStars theme={theme} />
        <div className="dither" aria-hidden="true" />
        <Ground />

        {/* Title, tabbed window and footer; the block editor under `npm run dev`. */}
        <PageContent content={portfolio} />
      </div>
    </>
  );
}
