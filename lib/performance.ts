/**
 * Web Vitals Monitoring & Performance Optimization
 * 
 * Comprehensive performance tracking with Web Vitals, custom metrics,
 * navigation timing, and resource monitoring.
 */

import * as React from 'react';
import { onCLS, onINP, onFCP, onLCP, onTTFB, onFID, Metric } from 'web-vitals';
import { buildCsrfHeaders } from '@/lib/security/csrfClient';

export interface WebVitalsMetrics {
  CLS: number; // Cumulative Layout Shift
  INP: number; // Interaction to Next Paint
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  TTFB: number; // Time to First Byte
  FID: number; // First Input Delay
}

export interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta?: number;
  id?: string;
  navigationType?: string;
}

// Metrics store
const metricsStore: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

/**
 * Get performance rating
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
    INP: [200, 500],
  };

  const threshold = thresholds[name] ?? [0, 0];
  const good = threshold[0];
  const poor = threshold[1];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Send metric to backend
 */
async function sendMetric(metric: PerformanceMetric) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Performance]', metric);
  }

  metricsStore.push(metric);
  if (metricsStore.length > MAX_METRICS) {
    metricsStore.shift();
  }

  if (process.env.NODE_ENV === 'production') {
    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
      await fetch('/api/performance/metrics', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          metric,
          timestamp: Date.now(),
          url: window.location.href,
        }),
        keepalive: true,
      });
    } catch (error) {
      console.error('Failed to send performance metric:', error);
    }
  }
}

/**
 * Handle Web Vitals metric
 */
function handleMetric({ name, value, rating, delta, id, navigationType }: Metric) {
  const metric: PerformanceMetric = {
    name,
    value,
    rating: rating as 'good' | 'needs-improvement' | 'poor',
    delta,
    id,
    navigationType,
  };
  sendMetric(metric);
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  onCLS(handleMetric);
  onFID(handleMetric);
  onINP(handleMetric);
  onFCP(handleMetric);
  onLCP(handleMetric);
  onTTFB(handleMetric);
}

/**
 * Track custom metric
 */
export function trackMetric(name: string, value: number) {
  const metric: PerformanceMetric = {
    name,
    value,
    rating: getRating(name, value),
  };
  sendMetric(metric);
}

/**
 * Measure component render time
 */
export function measureComponentRender(componentName: string) {
  const startTime = performance.now();
  return () => {
    const renderTime = performance.now() - startTime;
    trackMetric(`component-render-${componentName}`, renderTime);
  };
}

/**
 * Measure API call
 */
export async function measureAPICall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await apiCall();
    trackMetric(`api-${name}`, performance.now() - startTime);
    return result;
  } catch (error) {
    trackMetric(`api-${name}-error`, performance.now() - startTime);
    throw error;
  }
}

/**
 * Get navigation metrics
 */
export function getNavigationMetrics() {
  if (typeof window === 'undefined' || !performance.getEntriesByType) {
    return null;
  }

  const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
  if (!navigation) return null;

  return {
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    request: navigation.responseStart - navigation.requestStart,
    response: navigation.responseEnd - navigation.responseStart,
    domProcessing: navigation.domComplete - navigation.domInteractive,
    total: navigation.loadEventEnd - navigation.fetchStart,
  };
}

/**
 * Get memory usage
 */
export function getMemoryUsage() {
  if (typeof window === 'undefined') return null;
  
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (!memory) return null;

  return {
    usedJSHeapSize: memory.usedJSHeapSize,
    totalJSHeapSize: memory.totalJSHeapSize,
    jsHeapSizeLimit: memory.jsHeapSizeLimit,
    percentUsed: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
  };
}

/**
 * Observe long tasks
 */
export function observeLongTasks(callback: (duration: number) => void) {
  if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
    return () => {};
  }

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          callback(entry.duration);
          trackMetric('long-task', entry.duration);
        }
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    return () => observer.disconnect();
  } catch (error) {
    console.error('Long tasks observation not supported:', error);
    return () => {};
  }
}

/**
 * Get performance summary
 */
export function getPerformanceSummary() {
  const grouped = metricsStore.reduce<Record<string, number[]>>((acc, metric) => {
    if (!acc[metric.name]) {
      acc[metric.name] = [];
    }
    acc[metric.name]!.push(metric.value);
    return acc;
  }, {});

  const summary: Record<string, {
    count: number;
    avg: number;
    min: number;
    max: number;
  }> = {};

  for (const [name, values] of Object.entries(grouped)) {
    summary[name] = {
      count: values.length,
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  return summary;
}

/**
 * Export metrics
 */
export function exportMetrics() {
  return {
    metrics: [...metricsStore],
    summary: getPerformanceSummary(),
    navigation: getNavigationMetrics(),
    memory: getMemoryUsage(),
  };
}

/**
 * Hook to monitor Web Vitals (legacy)
 */
export function useWebVitals() {
  React.useEffect(() => {
    initWebVitals();
  }, []);
}

/**
 * Performance optimization utilities
 */
export function useOptimizeRendering(callback: () => void, deps: React.DependencyList = []) {
  const callbackRef = React.useRef(callback);
  React.useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

   
  React.useEffect(() => {
    // Use requestAnimationFrame for smoother rendering
    const rafId = requestAnimationFrame(() => callbackRef.current())
    return () => cancelAnimationFrame(rafId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/**
 * Lazy load an image with intersection observer
 */
export function useLazyImage(ref: React.RefObject<HTMLImageElement>) {
  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting && ref.current?.dataset.src) {
          ref.current.src = ref.current.dataset.src;
          ref.current.removeAttribute('data-src');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
}

/**
 * Debounce function for performance-critical operations
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;

  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle function for continuous operations
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function throttled(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoization utility for expensive computations
 */
export function memoize<T extends (...args: unknown[]) => unknown>(func: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Request animation frame wrapper
 */
export function requestAnimationFrameWrapper(callback: FrameRequestCallback) {
  if (typeof window === 'undefined') return;
  
  const rafId = requestAnimationFrame(callback);
  
  return () => cancelAnimationFrame(rafId);
}

/**
 * Intersection Observer utility for lazy loading
 */
export function useIntersectionObserver(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverInit = {}
) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (entry?.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, options);

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);

  return isVisible;
}

/**
 * Resource hints for performance
 */
export const ResourceHints = {
  /**
   * Preload critical resources
   */
  preload: (href: string, as: string, crossOrigin?: string) =>
    React.createElement('link', {
      rel: 'preload',
      href,
      as,
      crossOrigin,
    }),

  /**
   * Prefetch likely-to-be-needed resources
   */
  prefetch: (href: string) => React.createElement('link', { rel: 'prefetch', href }),

  /**
   * Preconnect to external services
   */
  preconnect: (href: string, crossOrigin?: string) =>
    React.createElement('link', {
      rel: 'preconnect',
      href,
      crossOrigin,
    }),

  /**
   * DNS prefetch for external domains
   */
  dnsPrefetch: (href: string) => React.createElement('link', { rel: 'dns-prefetch', href }),
};

/**
 * Performance monitoring decorator
 */
export function measurePerformance(label: string) {
  return function decorator(
    target: Record<string, unknown>,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const start = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const end = performance.now();
        console.log(`${label}: ${(end - start).toFixed(2)}ms`);
        return result;
      } catch (error) {
        const end = performance.now();
        console.error(`${label} failed after ${(end - start).toFixed(2)}ms:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Memory leak detection utility
 */
export function detectMemoryLeaks() {
  if (typeof window === 'undefined') return;

  const perfWithMemory = performance as Performance & { memory?: { usedJSHeapSize: number } };
  const initialMemory = perfWithMemory.memory?.usedJSHeapSize ?? 0;

  return {
    check: () => {
      const currentMemory = perfWithMemory.memory?.usedJSHeapSize ?? 0;
      const diff = currentMemory - initialMemory;
      
      if (diff > 10 * 1024 * 1024) { // 10MB threshold
        console.warn(`Potential memory leak detected: +${(diff / 1024 / 1024).toFixed(2)}MB`);
      }

      return {
        initial: initialMemory,
        current: currentMemory,
        difference: diff,
      };
    },
  };
}

/**
 * Long Task detection
 */
export function detectLongTasks() {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.warn(`Long Task detected: ${(entry.duration).toFixed(2)}ms`, entry);
      }
    });

    observer.observe({ entryTypes: ['longtask'] });
    return observer;
  } catch (_error) {
    console.log('Long Task monitoring not available');
    return null;
  }
}
