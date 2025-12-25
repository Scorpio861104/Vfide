import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fix for pino/thread-stream compatibility and Privy
  serverExternalPackages: [
    'pino', 
    'pino-pretty', 
    'thread-stream',
    '@privy-io/react-auth',
    '@privy-io/wagmi',
  ],
  
  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    resolveAlias: {
      // Handle Node.js modules that aren't available in browser
      fs: { browser: '' },
      net: { browser: '' },
      tls: { browser: '' },
      crypto: { browser: '' },
      // Privy test files that shouldn't be bundled
      'thread-stream/test/syntax-error.mjs': { browser: '' },
      'thread-stream/test/close-on-gc.js': { browser: '' },
      'thread-stream/test/create-and-exit.js': { browser: '' },
      // Other Node dependencies
      desm: { browser: '' },
      fastbench: { browser: '' },
      'pino-elasticsearch': { browser: '' },
      tap: { browser: '' },
      '@solana-program/system': { browser: '' },
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
