import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for pino/thread-stream compatibility
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  
  // Exclude test files from build
  webpack: (config) => {
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /node_modules\/@privy-io\/.*\/test\//,
      use: 'null-loader',
    });
    return config;
  },
  
  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    resolveAlias: {
      // Handle Node.js modules that aren't available in browser
      fs: { browser: '' },
      net: { browser: '' },
      tls: { browser: '' },
      crypto: { browser: '' },
    },
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
