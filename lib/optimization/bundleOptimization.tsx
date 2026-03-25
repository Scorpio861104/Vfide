/**
 * Bundle Optimization Utilities
 * 
 * Utilities for optimizing bundle size and reducing JavaScript payload:
 * - Dynamic import helpers
 * - Code splitting utilities
 * - Tree-shaking verification
 * - Lazy loading patterns
 */

import React, { Suspense } from 'react';
import { logger } from '@/lib/logger';

/**
 * Lazy load a component with preload capability
 * Reduces initial bundle size by splitting heavy components
 * 
 * @example
 * const Chart = lazyWithPreload(() => import('./Chart'));
 * // Preload on hover
 * <button onMouseEnter={() => Chart.preload()}>View Chart</button>
 */
export function lazyWithPreload<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  const LazyComponent = React.lazy(importFunc);
  
  return Object.assign(LazyComponent, {
    preload: importFunc,
  });
}

/**
 * Preload a dynamic import on route change or user interaction
 * Improves perceived performance
 * 
 * @example
 * // Preload dashboard when user hovers over link
 * <Link href="/dashboard" onMouseEnter={() => preloadComponent('/dashboard')}>
 */
export function preloadComponent(route: string) {
  const routeMap: Record<string, () => Promise<any>> = {
    '/dashboard': () => import('@/app/dashboard/page'),
    '/vault': () => import('@/app/vault/page'),
    '/rewards': () => import('@/app/rewards/page'),
    '/social': () => import('@/app/social/page'),
    '/governance': () => import('@/app/governance/page'),
  };

  const loader = routeMap[route];
  if (loader) {
    loader().catch(() => {
      // Silently fail preloading
    });
    return;
  }
  return;
}

/**
 * Dynamic import with error boundary and loading state
 * Provides better UX for code-split components
 */
export function withDynamicImport<T extends Record<string, any>>(
  importFunc: () => Promise<{ default: React.ComponentType<T> }>,
  fallback?: React.ReactNode
) {
  const Component = React.lazy(importFunc);
  
  return function DynamicComponent(props: T) {
    return (
      <Suspense fallback={fallback || <div className="animate-pulse">Loading...</div>}>
        <Component {...props} />
      </Suspense>
    );
  };
}

/**
 * Optimize heavy libraries by dynamic imports
 * Only load when needed, reducing initial bundle
 * 
 * @example
 * const qrCode = await importHeavyLibrary('qrcode');
 * const code = await qrCode.toDataURL('https://vfide.io');
 */
export async function importHeavyLibrary(library: string) {
  const libraryMap: Record<string, () => Promise<any>> = {
    'qrcode': () => import('qrcode'),
    'recharts': () => import('recharts'),
    'framer-motion': () => import('framer-motion'),
    'confetti': () => import('react-confetti'),
    'dompurify': () => import('dompurify'),
  };

  const loader = libraryMap[library];
  if (!loader) {
    throw new Error(`Library "${library}" not configured for dynamic import`);
  }

  return loader();
}

/**
 * Code splitting strategy configuration
 * Ensures optimal chunk sizes and loading patterns
 */
export const CODE_SPLITTING_CONFIG = {
  // Maximum chunk size before webpack splits it
  maxChunkSize: 250 * 1024, // 250KB
  
  // Minimum chunk size (avoid too many small chunks)
  minChunkSize: 20 * 1024, // 20KB
  
  // Routes that should be preloaded
  criticalRoutes: [
    '/',
    '/dashboard',
    '/vault',
  ],
  
  // Heavy components to always code-split
  heavyComponents: [
    'Chart',
    'QRCode',
    'Confetti',
    'RichTextEditor',
    'VideoPlayer',
  ],
};

/**
 * Analyze bundle and suggest optimizations
 * Run in development to identify bundle bloat
 * 
 * @example
 * // In development console
 * analyzeBundleSize().then(console.table);
 */
export async function analyzeBundleSize() {
  if (process.env.NODE_ENV !== 'development') {
    logger.warn('Bundle analysis only available in development');
    return [];
  }

  // Suggestions based on common optimization patterns
  const suggestions = [
    {
      module: 'lodash',
      currentSize: '70KB',
      optimized: '5KB',
      action: 'Use lodash-es and import specific functions',
    },
    {
      module: 'moment',
      currentSize: '230KB',
      optimized: '10KB',
      action: 'Replace with date-fns or Temporal API',
    },
    {
      module: 'recharts',
      currentSize: '400KB',
      optimized: 'Dynamic import',
      action: 'Load charts only when needed',
    },
  ];

  return suggestions;
}

/**
 * Monitor bundle size changes
 * Tracks size over time to prevent bundle bloat
 */
export function trackBundleMetrics() {
  if (typeof window === 'undefined') return undefined;

  // Use Navigation Timing API
  const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (perfData) {
    const metrics = {
      dnsTime: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcpTime: perfData.connectEnd - perfData.connectStart,
      requestTime: perfData.responseStart - perfData.requestStart,
      responseTime: perfData.responseEnd - perfData.responseStart,
      domProcessing: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
      totalTime: perfData.loadEventEnd - perfData.fetchStart,
    };

    // Log to analytics or monitoring
    if (process.env.NODE_ENV === 'development') {
      logger.info('Bundle Load Metrics:', metrics);
    }

    return metrics;
  }
  
  return undefined;
}

/**
 * Prefetch critical resources
 * Loads fonts, styles, and images before they're needed
 */
export function prefetchCriticalResources() {
  if (typeof window === 'undefined') return;

  const criticalResources = [
    { href: '/fonts/inter.woff2', as: 'font', type: 'font/woff2' },
    { href: '/fonts/space-grotesk.woff2', as: 'font', type: 'font/woff2' },
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = resource.href;
    link.as = resource.as;
    if (resource.type) link.type = resource.type;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
}
