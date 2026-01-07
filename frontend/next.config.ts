import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for pino/thread-stream compatibility
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],

  // Ensure Turbopack treats `frontend/` as the workspace root.
  // Without this, Next may infer the monorepo root (multiple lockfiles) and scan far more files.
  turbopack: {
    root: __dirname,
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
};

export default nextConfig;
