'use client';

/**
 * Performance Monitoring System
 * 
 * Real-time performance tracking for web vitals, component rendering,
 * and user interactions.
 */

// ==================== TYPES ====================

/** Chrome-only non-standard memory API on the Performance object. */
interface PerformanceMemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

export interface WebVitals {
  // Core Web Vitals
  lcp: number | null;  // Largest Contentful Paint
  fid: number | null;  // First Input Delay
  cls: number | null;  // Cumulative Layout Shift
  
  // Additional metrics
  fcp: number | null;  // First Contentful Paint
  ttfb: number | null; // Time to First Byte
  inp: number | null;  // Interaction to Next Paint
}

export interface ComponentMetric {
  name: string;
  renderCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  lastRenderTime: number;
  lastRenderTimestamp: number;
}

export interface InteractionMetric {
  type: string;
  target: string;
  duration: number;
  timestamp: number;
}

export interface ResourceMetric {
  name: string;
  type: string;
  size: number;
  duration: number;
  cached: boolean;
}

export interface PerformanceReport {
  timestamp: number;
  sessionId: string;
  webVitals: WebVitals;
  components: ComponentMetric[];
  interactions: InteractionMetric[];
  resources: ResourceMetric[];
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  navigation: {
    type: string;
    redirectCount: number;
    loadTime: number;
    domContentLoaded: number;
  };
}

// ==================== PERFORMANCE MONITOR CLASS ====================

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  
  private sessionId: string;
  private webVitals: WebVitals = {
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null,
  };
  private componentMetrics: Map<string, ComponentMetric> = new Map();
  private interactions: InteractionMetric[] = [];
  private resources: ResourceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  private reportCallbacks: ((report: PerformanceReport) => void)[] = [];
  private isInitialized = false;

  private constructor() {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance monitoring
   */
  init(): void {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    this.isInitialized = true;
    this.observeWebVitals();
    this.observeResources();
    this.observeLongTasks();
    this.trackInteractions();
    
    // Report on page unload
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.sendReport();
      }
    });
  }

  /**
   * Observe Core Web Vitals using PerformanceObserver
   */
  private observeWebVitals(): void {
    // LCP Observer
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.webVitals.lcp = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      this.observers.push(lcpObserver);
    } catch (_e) {
      logger.debug('LCP not supported');
    }

    // FID Observer
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceEventTiming[];
        for (const entry of entries) {
          if (entry.processingStart && entry.startTime) {
            this.webVitals.fid = entry.processingStart - entry.startTime;
          }
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });
      this.observers.push(fidObserver);
    } catch (_e) {
      logger.debug('FID not supported');
    }

    // CLS Observer
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as (PerformanceEntry & { hadRecentInput?: boolean; value?: number })[]) {
          if (!entry.hadRecentInput && entry.value) {
            clsValue += entry.value;
            this.webVitals.cls = clsValue;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      this.observers.push(clsObserver);
    } catch (_e) {
      logger.debug('CLS not supported');
    }

    // FCP Observer
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntriesByName('first-contentful-paint');
        if (entries.length > 0 && entries[0]) {
          this.webVitals.fcp = entries[0].startTime;
        }
      });
      fcpObserver.observe({ type: 'paint', buffered: true });
      this.observers.push(fcpObserver);
    } catch (_e) {
      logger.debug('FCP not supported');
    }

    // TTFB from Navigation Timing
    if (typeof window !== 'undefined' && window.performance) {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      if (navEntry) {
        this.webVitals.ttfb = navEntry.responseStart - navEntry.requestStart;
      }
    }
  }

  /**
   * Observe resource loading
   */
  private observeResources(): void {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
          this.resources.push({
            name: entry.name,
            type: entry.initiatorType,
            size: entry.transferSize || 0,
            duration: entry.duration,
            cached: entry.transferSize === 0 && entry.decodedBodySize > 0,
          });
          
          // Keep only last 100 resources
          if (this.resources.length > 100) {
            this.resources.shift();
          }
        }
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
      this.observers.push(resourceObserver);
    } catch (_e) {
      logger.debug('Resource timing not supported');
    }
  }

  /**
   * Observe long tasks (> 50ms)
   */
  private observeLongTasks(): void {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.interactions.push({
            type: 'long-task',
            target: 'main-thread',
            duration: entry.duration,
            timestamp: Date.now(),
          });
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
      this.observers.push(longTaskObserver);
    } catch (_e) {
      logger.debug('Long task timing not supported');
    }
  }

  /**
   * Track user interactions
   */
  private trackInteractions(): void {
    const trackEvent = (e: Event) => {
      const target = e.target as HTMLElement;
      const start = performance.now();
      
      requestAnimationFrame(() => {
        const duration = performance.now() - start;
        this.interactions.push({
          type: e.type,
          target: target.tagName?.toLowerCase() || 'unknown',
          duration,
          timestamp: Date.now(),
        });

        // Keep only last 50 interactions
        if (this.interactions.length > 50) {
          this.interactions.shift();
        }
      });
    };

    window.addEventListener('click', trackEvent, { passive: true });
    window.addEventListener('keydown', trackEvent, { passive: true });
    window.addEventListener('scroll', trackEvent, { passive: true });
  }

  /**
   * Track component render performance
   */
  trackComponent(name: string, renderTime: number): void {
    const existing = this.componentMetrics.get(name);
    
    if (existing) {
      existing.renderCount++;
      existing.totalRenderTime += renderTime;
      existing.averageRenderTime = existing.totalRenderTime / existing.renderCount;
      existing.lastRenderTime = renderTime;
      existing.lastRenderTimestamp = Date.now();
    } else {
      this.componentMetrics.set(name, {
        name,
        renderCount: 1,
        totalRenderTime: renderTime,
        averageRenderTime: renderTime,
        lastRenderTime: renderTime,
        lastRenderTimestamp: Date.now(),
      });
    }
  }

  /**
   * Get current web vitals
   */
  getWebVitals(): WebVitals {
    return { ...this.webVitals };
  }

  /**
   * Get component metrics
   */
  getComponentMetrics(): ComponentMetric[] {
    return Array.from(this.componentMetrics.values());
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    let score = 100;
    
    // LCP scoring (good < 2.5s, needs improvement < 4s, poor >= 4s)
    if (this.webVitals.lcp !== null) {
      if (this.webVitals.lcp > 4000) score -= 30;
      else if (this.webVitals.lcp > 2500) score -= 15;
    }
    
    // FID scoring (good < 100ms, needs improvement < 300ms, poor >= 300ms)
    if (this.webVitals.fid !== null) {
      if (this.webVitals.fid > 300) score -= 30;
      else if (this.webVitals.fid > 100) score -= 15;
    }
    
    // CLS scoring (good < 0.1, needs improvement < 0.25, poor >= 0.25)
    if (this.webVitals.cls !== null) {
      if (this.webVitals.cls > 0.25) score -= 30;
      else if (this.webVitals.cls > 0.1) score -= 15;
    }
    
    // FCP scoring
    if (this.webVitals.fcp !== null) {
      if (this.webVitals.fcp > 3000) score -= 10;
      else if (this.webVitals.fcp > 1800) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate a full performance report
   */
  generateReport(): PerformanceReport {
    const navEntry = typeof window !== 'undefined' 
      ? performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      : undefined;

    const report: PerformanceReport = {
      timestamp: Date.now(),
      sessionId: this.sessionId,
      webVitals: this.getWebVitals(),
      components: this.getComponentMetrics(),
      interactions: [...this.interactions],
      resources: [...this.resources],
      navigation: {
        type: navEntry?.type || 'unknown',
        redirectCount: navEntry?.redirectCount || 0,
        loadTime: navEntry ? navEntry.loadEventEnd - navEntry.startTime : 0,
        domContentLoaded: navEntry ? navEntry.domContentLoadedEventEnd - navEntry.startTime : 0,
      },
    };

    // Add memory info if available
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as Performance & { memory: PerformanceMemoryInfo }).memory;
      report.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }

    return report;
  }

  /**
   * Subscribe to performance reports
   */
  onReport(callback: (report: PerformanceReport) => void): () => void {
    this.reportCallbacks.push(callback);
    return () => {
      this.reportCallbacks = this.reportCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Send performance report to callbacks
   */
  private sendReport(): void {
    const report = this.generateReport();
    for (const callback of this.reportCallbacks) {
      try {
        callback(report);
      } catch (e) {
        logger.error('Error in performance report callback:', e);
      }
    }
  }

  /**
   * Clean up observers
   */
  destroy(): void {
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];
    this.isInitialized = false;
  }
}

// ==================== EXPORTS ====================

export const performanceMonitor = PerformanceMonitor.getInstance();

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(): void {
  performanceMonitor.init();
}

/**
 * Track a component's render time
 */
export function trackComponentRender(componentName: string, renderTime: number): void {
  performanceMonitor.trackComponent(componentName, renderTime);
}

/**
 * Get current performance score
 */
export function getPerformanceScore(): number {
  return performanceMonitor.getPerformanceScore();
}

/**
 * Get web vitals
 */
export function getWebVitals(): WebVitals {
  return performanceMonitor.getWebVitals();
}

// ==================== REACT HOOKS ====================

import { useState, useEffect, useRef } from 'react';
import { logger } from '@/lib/logger';

/**
 * Hook to track component render performance
 */
export function useRenderTracking(componentName: string): void {
  const renderStart = useRef(performance.now());
  
  useEffect(() => {
    const renderTime = performance.now() - renderStart.current;
    trackComponentRender(componentName, renderTime);
    renderStart.current = performance.now();
  });
}

/**
 * Hook to get current web vitals
 */
export function useWebVitals(): WebVitals {
  const [vitals, setVitals] = useState<WebVitals>({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null,
  });

  useEffect(() => {
    const update = () => setVitals(getWebVitals());
    
    // Initial update
    update();
    
    // Update periodically
    const interval = setInterval(update, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return vitals;
}

/**
 * Hook to get performance score
 */
export function usePerformanceScore(): number {
  const [score, setScore] = useState(100);

  useEffect(() => {
    const update = () => setScore(getPerformanceScore());
    
    update();
    const interval = setInterval(update, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return score;
}

/**
 * Hook to get full performance report
 */
export function usePerformanceReport(): PerformanceReport | null {
  const [report, setReport] = useState<PerformanceReport | null>(null);

  useEffect(() => {
    const unsubscribe = performanceMonitor.onReport(setReport);
    
    // Generate initial report
    setReport(performanceMonitor.generateReport());
    
    return unsubscribe;
  }, []);

  return report;
}

export default performanceMonitor;
