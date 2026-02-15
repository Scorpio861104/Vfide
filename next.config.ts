import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Bundle analyzer configuration
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Fix for pino/thread-stream compatibility
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],

  // Enforce TypeScript strict mode - all errors must be fixed
  typescript: {
    ignoreBuildErrors: false,
  },

  // Ensure Turbopack treats `frontend/` as the workspace root.
  // Without this, Next may infer the monorepo root (multiple lockfiles) and scan far more files.
  turbopack: {
    root: __dirname,
  },

  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,

  // Optimize for production builds
  reactStrictMode: true,
  
  // Experimental features for better performance
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-icons',
      'lucide-react',
      'framer-motion',
    ],
  },

  // Image optimization
  images: {
    remotePatterns: [
      // Restrict to specific trusted domains for security
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      // Add more trusted domains as needed
    ],
  },

  // Security headers are set dynamically in middleware.ts to support CSP nonces.
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with Turbopack enabled)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
};

// Only wrap with Sentry if DSN is configured
const configWithBundleAnalyzer = withBundleAnalyzer(nextConfig);

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithBundleAnalyzer, sentryWebpackPluginOptions)
  : configWithBundleAnalyzer;
