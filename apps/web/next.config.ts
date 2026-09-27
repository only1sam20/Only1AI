import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  distDir: process.env.NEXT_BUILD_DIR ?? '.next',
  async rewrites() {
    return [{ source: '/api/v1/:path*', destination: `${process.env.API_URL ?? 'http://localhost:3001'}/api/v1/:path*` }];
  },
};
export default nextConfig;
