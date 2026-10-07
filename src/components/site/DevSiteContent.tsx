'use client';

import { useEffect, useState } from 'react';
import type { Site } from '@/content/site';
// Type-only, so erased at build time: it doesn't pull the editor into the bundle.
import type { SiteEditor as SiteEditorComponent } from '@/components/site-editor/SiteEditor';
import { SiteView } from './SiteView';

/**
 * The main page's content under `npm run dev`: the read-only page, with the
 * editor loaded in over it. page.tsx only renders this in development; the
 * production build renders SiteView directly, on the server, with no editor
 * code and no extra JavaScript.
 *
 * The editor lives in this module's state rather than being imported by
 * page.tsx because every save rewrites site.json, and hot reload re-runs the
 * modules that import it. This one doesn't, so the editor (focus, undo
 * history, what you're typing) survives each save.
 */
export function DevSiteContent({ source }: { source: Site }) {
  const [Editor, setEditor] = useState<typeof SiteEditorComponent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      void import('@/components/site-editor/SiteEditor').then((m) => setEditor(() => m.SiteEditor));
    }
  }, []);

  return Editor ? <Editor source={source} /> : <SiteView site={source} />;
}
