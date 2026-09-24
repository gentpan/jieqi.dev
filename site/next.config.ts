import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  assetPrefix: process.env.NEXT_PUBLIC_JIEQI_STATIC_ORIGIN || undefined,
  crossOrigin: 'anonymous',
};

export default nextConfig;
