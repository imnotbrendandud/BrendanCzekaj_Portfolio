import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';
import type { NextConfig } from 'next';

export default function config(phase: string): NextConfig {
  return {
    // Pure static export — the whole site is prerendered HTML/CSS/JS with no
    // server runtime. Deploys to Vercel (or any static host) as-is.
    output: 'export',
    images: { unoptimized: true },
    reactStrictMode: true,
    trailingSlash: true,
    // `*.dev.ts` files exist only under `next dev`. That is how the in-place
    // editor's save route (src/app/api/content/route.dev.ts) stays out of the
    // static build.
    pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? ['tsx', 'ts', 'dev.ts'] : ['tsx', 'ts'],
  };
}
