/**
 * Web Vitals Monitoring & Optimization
 */

import React, { useEffect } from 'react';
import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

interface WebVitalsMetrics {
  CLS: number; // Cumulative Layout Shift
  FID: number; // First Input Delay
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  TTFB: number; // Time to First Byte
}

/**
 * Send metrics to analytics service
 */
export function sendMetricsToAnalytics(metric: Metric) {
  const body = JSON.stringify(metric);
  
  // Use navigator.sendBeacon if available (doesn't block page unload)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/metrics', body);
  } else {
    // Fallback to fetch
    fetch('/api/metrics', {
      method: 'POST',
      body,
      keepalive: true,
    }).catch((error) => {
      console.warn('Failed to send metrics:', error);
    });
  }
}

/**
 * Hook to monitor Web Vitals
 */
export function useWebVitals() {
  useEffect(() => {
    try {
      onCLS(sendMetricsToAnalytics);
      onFCP(sendMetricsToAnalytics);
      onLCP(sendMetricsToAnalytics);
      onTTFB(sendMetricsToAnalytics);
      onINP(sendMetricsToAnalytics);
    } catch (error) {
      console.error('Error monitoring Web Vitals:', error);
    }
  }, []);
}

/**
 * Performance optimization utilities
 */

/**
 * Lazy load an image with intersection observer
 */
export function useLazyImage(ref: React.RefObject<HTMLImageElement>) {
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && ref.current?.dataset.src) {
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
export function debounce<T extends (...args: any[]) => any>(
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
export function throttle<T extends (...args: any[]) => any>(
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
export function memoize<T extends (...args: any[]) => any>(func: T): T {
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

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
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
  preload: (href: string, as: string, crossOrigin?: 'anonymous' | 'use-credentials') => (
    <link
      rel="preload"
      href={href}
      as={as}
      crossOrigin={crossOrigin}
    />
  ),

  /**
   * Prefetch likely-to-be-needed resources
   */
  prefetch: (href: string) => (
    <link rel="prefetch" href={href} />
  ),

  /**
   * Preconnect to external services
   */
  preconnect: (href: string, crossOrigin?: 'anonymous' | 'use-credentials') => (
    <link
      rel="preconnect"
      href={href}
      crossOrigin={crossOrigin}
    />
  ),

  /**
   * DNS prefetch for external domains
   */
  dnsPrefetch: (href: string) => (
    <link rel="dns-prefetch" href={href} />
  ),
};

/**
 * Performance monitoring decorator
 */
export function measurePerformance(label: string) {
  return function decorator(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
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
  } catch (error) {
    console.log('Long Task monitoring not available');
    return null;
  }
}
