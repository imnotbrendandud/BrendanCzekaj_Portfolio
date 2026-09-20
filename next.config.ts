import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Pure static export — the whole site is prerendered HTML/CSS/JS with no
  // server runtime. Deploys to Vercel (or any static host) as-is.
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  trailingSlash: true,
};

export default nextConfig;
