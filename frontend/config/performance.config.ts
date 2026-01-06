/**
 * Performance Optimization Configuration
 * Targets: LCP <2.5s, FID <100ms, CLS <0.1
 */

// ============================================
// Next.js Performance Optimizations
// ============================================

module.exports = {
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Code splitting
  experimental: {
    optimizePackageImports: [
      'framer-motion',
      '@radix-ui/react-dialog',
      'wagmi',
      'viem',
    ],
  },

  // Headers for performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
        ],
      },
      {
        source: '/(.*).html',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600',
          },
        ],
      },
    ];
  },

  // Redirects for performance
  async redirects() {
    return [];
  },
};

// ============================================
// Bundle Analysis Configuration
// ============================================

// In next.config.js, enable bundle analysis:
// npm run analyze

// package.json scripts:
/*
"analyze": "ANALYZE=true next build",
"analyze:bundle": "BUNDLE_ANALYZE=both next build",
"analyze:browser": "BUNDLE_ANALYZE=browser next build",
"analyze:server": "BUNDLE_ANALYZE=server next build"
*/

// ============================================
// Web Vitals Monitoring
// ============================================

/*
// pages/_app.tsx
import { useEffect } from 'react';
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Report Web Vitals
    getCLS(console.log);
    getFID(console.log);
    getFCP(console.log);
    getLCP(console.log);
    getTTFB(console.log);
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
*/

// ============================================
// Dynamic Imports (Code Splitting)
// ============================================

/*
// Example: Lazy load heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Load only on client
});

// Usage
<Suspense fallback={<Skeleton />}>
  <HeavyChart />
</Suspense>
*/

// ============================================
// Image Optimization Utilities
// ============================================

export function getImageProps(src: string, alt: string) {
  return {
    src,
    alt,
    loading: 'lazy' as const,
    placeholder: 'blur' as const,
    blurDataURL: 'data:image/svg+xml;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  };
}

// ============================================
// Font Optimization
// ============================================
// (Example snippet removed: nested JSX comments inside /* */ break TS parsing)

// ============================================
// Service Worker Registration (Offline Support)
// ============================================

/*
// public/sw.js
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (event) => {
  // Handle requests
});

// pages/_app.tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered:', registration);
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error);
      });
  }
}, []);
*/

// ============================================
// Script Loading Strategy
// ============================================
// (Example snippet removed: nested JSX comments inside /* */ break TS parsing)

// ============================================
// Performance Budgets
// ============================================

/*
{
  "version": 2,
  "budgets": [
    {
      "type": "bundle",
      "name": "js",
      "baselineBytes": 375000,
      "maximumBytes": 400000,
      "warning": 95
    },
    {
      "type": "bundle",
      "name": "css",
      "baselineBytes": 75000,
      "maximumBytes": 100000,
      "warning": 95
    },
    {
      "type": "AnyComponentStyle",
      "baselineBytes": 10000,
      "maximumBytes": 20000,
      "warning": 95
    },
    {
      "type": "anyScript",
      "name": "polyfill",
      "baselineBytes": 10000,
      "maximumBytes": 15000,
      "warning": 95
    },
    {
      "type": "resourceSize",
      "resourceType": "image",
      "maximumBytes": 200000
    }
  ]
}
*/

// ============================================
// Lighthouse Configuration
// ============================================

/*
module.exports = {
  ci: {
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'max-potential-fid': ['error', { maxNumericValue: 100 }],
        'categories:pwa': ['warn', { minScore: 0.9 }],
      },
    },
  },
};
*/
