const withPWA = require('next-pwa');
const runtimeCaching = require('next-pwa/cache');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Performance optimizations
  swcMinify: true, // Use SWC for faster minification
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Bundle analyzer (only in development)
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config, { isServer }) => {
      if (!isServer) {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
          })
        );
      }
      return config;
    },
  }),

  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:3000/api/:path*',
      },
    ];
  },
};

const pwaOptions = {
  dest: 'public',
  disable: process.env.NODE_ENV !== 'production',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    ...runtimeCaching,
    {
      urlPattern: /^\/_next\/static\/.*/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'next-static-cache' },
    },
    {
      urlPattern: /^\/_next\/image\?url=.*$/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'next-image-cache' },
    },
  ],
};

module.exports = withPWA(pwaOptions)(nextConfig);