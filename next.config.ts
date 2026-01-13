import type { NextConfig } from "next";

// Bundle analyzer configuration
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // Fix for pino/thread-stream compatibility
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],

  // Ignore TypeScript errors during build
  typescript: {
    ignoreBuildErrors: true,
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
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Security headers including Content Security Policy
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              // Default: only same origin
              "default-src 'self'",
              // Scripts: self, inline with nonce, eval for development
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
              // Styles: self and inline styles (required by styled-jsx, Tailwind)
              "style-src 'self' 'unsafe-inline'",
              // Images: self, data URIs, HTTPS anywhere (for user avatars, external images)
              "img-src 'self' data: https: blob:",
              // Fonts: self and data URIs
              "font-src 'self' data:",
              // Connect: self and WebSocket (for real-time features)
              "connect-src 'self' wss: ws: https:",
              // Frame: self (for embedded content)
              "frame-src 'self'",
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

export default withBundleAnalyzer(nextConfig);
