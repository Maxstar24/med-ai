/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  // Disable ESLint during production builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during production builds
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  // Disable React strict mode for production
  reactStrictMode: false,
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  // Disable image optimization during build to reduce memory usage
  images: {
    unoptimized: true,
  },
  // Increase build timeout
  staticPageGenerationTimeout: 180,
  // Experimental features
  experimental: {
    // Increase memory limit for builds
    memoryBasedWorkersCount: true,
    // Disable incremental builds
    incrementalCacheHandlerPath: false,
  },
}

module.exports = nextConfig;
