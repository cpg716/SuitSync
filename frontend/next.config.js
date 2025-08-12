// const withPWA = require('next-pwa')({
//   dest: 'public',
//   register: true,
//   skipWaiting: true,
//   disable: process.env.NODE_ENV === 'development', // Disable PWA in development to prevent warnings
//   runtimeCaching: [
//     {
//       urlPattern: /^\/api\/.*$/,
//       handler: 'NetworkFirst', // Must be NetworkFirst if using networkTimeoutSeconds
//       options: {
//         cacheName: 'api-cache',
//         networkTimeoutSeconds: 10,
//         fetchOptions: { credentials: 'include' },
//       },
//     },
//     {
//       urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
//       handler: 'StaleWhileRevalidate',
//       options: { cacheName: 'images' },
//     },
//     // ...other asset rules...
//   ],
// });

/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  swcMinify: false, // Disable SWC to use Babel
  compress: true,
  poweredByHeader: false,

  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },

  // Webpack configuration
  webpack: (config, { isServer }) => {
    // Bundle analyzer (only in development)
    if (process.env.ANALYZE === 'true' && !isServer) {
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

  async rewrites() {
    // Use environment variable for backend URL to support both local and Docker environments
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};