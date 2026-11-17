import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/',
      headers: [{
        key: 'Cache-Control',
        value: 'private, no-cache, max-age=0, must-revalidate',
      }],
    }];
  },
};

export default nextConfig;
