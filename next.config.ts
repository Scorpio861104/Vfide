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

  // Type checking runs in dedicated CI scripts; avoid blocking deployments on Next's in-build checker.
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
    webpackBuildWorker: false,
    cpus: 1,
  },

  // Image optimization — allow only explicit remote hosts used by the app.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cloudflare-ipfs.com',
        pathname: '/**',
      },
    ],
  },

  // Keep unfinished stealth functionality non-routable until the EIP-5564 flow is fully implemented.
  async redirects() {
    const redirects = [
      {
        source: '/stealth',
        destination: '/docs',
        permanent: false,
      },
    ];

    // F-FE-014 FIX: paper-wallet route generates and DISPLAYS private keys
    // and mnemonics in the browser. Even if the page never transmits them,
    // shipping a "click here to generate keys" page in a multi-tenant DeFi
    // app is a phishing magnet — attackers will iframe-clickjack it,
    // browser extensions can read DOM contents, screen-recording trojans
    // can capture it, and customer-support trust-but-verify flows can be
    // socially engineered around it. Gate the route behind an explicit
    // opt-in env var so it's NOT routable in default production builds.
    if (process.env.NEXT_PUBLIC_ENABLE_PAPER_WALLET !== 'true') {
      // NAV-WALLET-1: /wallet does not exist as a route; /crypto is the wallet
      // page (listed in Vault group nav as "Wallet"). Redirect there instead.
      redirects.push({
        source: '/paper-wallet',
        destination: '/crypto',
        permanent: false,
      });
      redirects.push({
        source: '/paper-wallet/:path*',
        destination: '/crypto',
        permanent: false,
      });
    }

    return redirects;
  },

  // Security headers — CSP is applied per-request in proxy.ts with a nonce.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Strict fallback CSP for non-proxy paths.
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
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
