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
        hostname: '*.amazonaws.com',
      },
      // Add more trusted domains as needed
    ],
  },

  // Security headers including Content Security Policy
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy
          // NOTE: 'unsafe-inline' has been removed from script-src.
          // Per-request nonce injection is handled by middleware.ts, which sets
          // the 'Content-Security-Policy' header with 'nonce-{nonce}' for every
          // HTML response.  This static header definition in next.config.ts is kept
          // only as a fallback for routes not matched by the middleware matcher
          // (static files, etc.) and deliberately omits 'unsafe-inline'.
          // 'unsafe-eval' is still required for WalletConnect/RainbowKit.
          {
            key: 'Content-Security-Policy',
            value: [
              // Default: only same origin
              "default-src 'self'",
              // Scripts: nonce injected by middleware; 'unsafe-eval' for WalletConnect/RainbowKit
              "script-src 'self' 'unsafe-eval' https://vercel.live https://*.walletconnect.com https://*.walletconnect.org",
              // Styles: self and unsafe-inline for Tailwind/Radix UI
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Images: self, data URIs, HTTPS, and blob for avatars/NFTs
              "img-src 'self' data: https: blob:",
              // Fonts: self, data URIs, and Google Fonts
              "font-src 'self' data: https://fonts.gstatic.com",
              // Connect: self, WebSocket, and blockchain RPC endpoints
              "connect-src 'self' wss: ws: https: https://*.walletconnect.com https://*.walletconnect.org https://*.base.org https://*.polygon.technology https://*.zksync.io",
              // Frame: self and wallet connect
              "frame-src 'self' https://*.walletconnect.com",
              // Media: self and blob (for potential voice/video features)
              "media-src 'self' blob:",
              // Object: none (block plugins)
              "object-src 'none'",
              // Base URI: self
              "base-uri 'self'",
              // Form actions: self
              "form-action 'self'",
              // Frame ancestors: none (prevent clickjacking)
              "frame-ancestors 'none'",
              // Upgrade insecure requests in production
              process.env.NODE_ENV === 'production' ? "upgrade-insecure-requests" : "",
            ].filter(Boolean).join('; '),
          },
          // X-Frame-Options: prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // X-Content-Type-Options: prevent MIME sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer-Policy: limit referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions-Policy: restrict browser features
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'payment=()',
              'usb=()',
              'interest-cohort=()',
            ].join(', '),
          },
          // X-XSS-Protection: legacy XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Strict-Transport-Security: enforce HTTPS (production only)
          ...(process.env.NODE_ENV === 'production' ? [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          }] : []),
        ],
      },
    ];
  },
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
