import type { NextConfig } from 'next';

// Toggle the Coming Soon redirect on/off
const enableComingSoonRedirect = false;

const baseConfig: NextConfig = {
  // Server actions require server mode (not static export)
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
};

const configWithRedirects: NextConfig = {
  ...baseConfig,
  async redirects() {
    return [
      {
        source: '/:path((?!coming-soon|_next|favicon\\.ico).*)',
        destination: '/coming-soon',
        permanent: false,
      },
    ];
  },
};

const nextConfig = enableComingSoonRedirect ? configWithRedirects : baseConfig;

export default nextConfig;
