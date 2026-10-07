import { site } from '@/content/site';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteView } from '@/components/site/SiteView';

/** What the menu links to, in page order. */
const SECTIONS = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
] as const;

/**
 * The main page. Content is SiteView, rendered on the server with no client
 * JavaScript of its own; under `npm run dev` it's DevSiteContent instead,
 * which loads the in-place editor.
 *
 * DevSiteContent is imported dynamically inside the development branch, not
 * at the top: a static import of a client component is bundled for the page
 * even when it never renders. NODE_ENV is a constant in a production build,
 * so this branch and its import are dropped entirely.
 */
export default async function Home() {
  let content = <SiteView site={site} />;
  if (process.env.NODE_ENV === 'development') {
    const { DevSiteContent } = await import('@/components/site/DevSiteContent');
    content = <DevSiteContent source={site} />;
  }

  return (
    <>
      {/* Drifting colour and a little grain behind everything (see site.css). */}
      <div className="backdrop" aria-hidden="true">
        <span className="aurora aurora--teal" />
        <span className="aurora aurora--cyan" />
        <span className="aurora aurora--green" />
      </div>

      <SiteNav sections={SECTIONS} extra={site.gamedev} />

      {content}
    </>
  );
}
