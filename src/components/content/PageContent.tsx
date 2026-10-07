'use client';

import { useEffect, useState } from 'react';
import type { Portfolio } from '@/content/portfolio';
// Type-only, so erased at build time: it doesn't pull the editor into the bundle.
import type { Editor as EditorComponent } from '@/components/editor/Editor';
import { SiteContent } from './SiteContent';

/**
 * The page content. Under `npm run dev` the block editor loads in its place.
 *
 * Two details matter here:
 * - The import sits inside a NODE_ENV check that is constant in a production
 *   build, so the bundler drops it: the editor, TipTap and dnd-kit never ship.
 * - The editor is held in this module's state rather than created with
 *   `dynamic()` in page.tsx. Every save rewrites portfolio.json, and hot reload
 *   re-runs page.tsx; a component created there would be a new type each time,
 *   and React would throw the whole editor away (focus, undo history, typing)
 *   after every keystroke that saved. This module doesn't import the content,
 *   so it isn't re-run, and the editor survives.
 */
export function PageContent({ content }: { content: Portfolio }) {
  const [Editor, setEditor] = useState<typeof EditorComponent | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      void import('@/components/editor/Editor').then((m) => setEditor(() => m.Editor));
    }
  }, []);

  // The read-only page renders first (and is all the live site ever renders),
  // so nothing flashes while the editor loads.
  return Editor ? <Editor source={content} /> : <SiteContent content={content} />;
}
