'use client';

/**
 * Performance Optimization Utilities
 * 
 * Tools for optimizing React component rendering and app performance.
 */

/* eslint-disable react-hooks/refs */

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  type ReactNode,
  type ComponentType,
} from 'react';

// ==================== LAZY LOADING ====================

/**
 * Enhanced lazy loading with preload capability
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options?: {
    fallback?: ReactNode;
    preload?: boolean;
  }
) {
  const LazyComponent = React.lazy(importFn);

  // Preload function
  const preload = () => {
    importFn();
  };

  // Start preloading if option is set
  if (options?.preload) {
    preload();
  }

  // Return component with attached preload function
  const Component = (props: P) => (
    <React.Suspense fallback={options?.fallback ?? <div className="animate-pulse" />}>
      <LazyComponent {...props} />
    </React.Suspense>
  );
  Component.displayName = 'LazyComponent';

  return Object.assign(Component, { preload });
}

// ==================== VIRTUALIZED LIST ====================

export interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 3,
  className = '',
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(items.length, startIndex + visibleCount + 2 * overscan);

  const visibleItems = items.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;
  const totalHeight = items.length * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div key={keyExtractor(item, startIndex + index)} style={{ height: itemHeight }}>
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== DEFERRED VALUE ====================

/**
 * Defers a value update to prevent blocking the main thread
 */
export function useDeferredValue<T>(value: T, delay: number = 0): T {
  const [deferredValue, setDeferredValue] = useState(value);

  useEffect(() => {
    if (delay === 0) {
      // Use requestIdleCallback if available
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(() => setDeferredValue(value));
        return () => window.cancelIdleCallback(id);
      }
    }
    
    const timeout = setTimeout(() => setDeferredValue(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return deferredValue;
}

// ==================== INTERSECTION OBSERVER ====================

export interface UseInViewOptions {
  threshold?: number | number[];
  rootMargin?: string;
  triggerOnce?: boolean;
}

export function useInView(options: UseInViewOptions = {}) {
  const { threshold = 0, rootMargin = '0px', triggerOnce = false } = options;
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (!firstEntry) return;
        
        setEntry(firstEntry);
        setInView(firstEntry.isIntersecting);
        
        if (triggerOnce && firstEntry.isIntersecting) {
          observer.unobserve(element);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, inView, entry };
}

// ==================== MEMOIZED CALLBACK ====================

/**
 * Like useCallback but with deep comparison of dependencies
 */
export function useDeepCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: unknown[]
): T {
  const callbackRef = useRef<T>(callback);
  const depsRef = useRef(deps);

  useEffect(() => {
    const hasChanged = !deps.every((dep, i) => 
      JSON.stringify(dep) === JSON.stringify(depsRef.current[i])
    );

    if (hasChanged) {
      callbackRef.current = callback;
      depsRef.current = deps;
    }
  }, [callback, deps]);

  return useCallback((...args: Parameters<T>) => callbackRef.current(...args), []) as T;
}

// ==================== RAF THROTTLE ====================

/**
 * Throttles a callback to run at most once per animation frame
 */
export function useRafThrottle<T extends (...args: unknown[]) => void>(
  callback: T
): T {
  const rafRef = useRef<number | null>(null);
  const callbackRef = useRef<T>(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const throttledFn = useCallback((...args: Parameters<T>) => {
    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      callbackRef.current(...args);
      rafRef.current = null;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return throttledFn as T;
}

// ==================== IMAGE PRELOADER ====================

export function useImagePreloader(urls: string[]): {
  loaded: boolean;
  progress: number;
  errors: string[];
} {
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (urls.length === 0) {
      setLoaded(true);
      setProgress(100);
      return;
    }

    let loadedCount = 0;
    const errorUrls: string[] = [];

    const images = urls.map((url) => {
      const img = new Image();
      
      img.onload = () => {
        loadedCount++;
        setProgress(Math.round((loadedCount / urls.length) * 100));
        
        if (loadedCount === urls.length) {
          setLoaded(true);
          setErrors(errorUrls);
        }
      };
      
      img.onerror = () => {
        loadedCount++;
        errorUrls.push(url);
        setProgress(Math.round((loadedCount / urls.length) * 100));
        
        if (loadedCount === urls.length) {
          setLoaded(true);
          setErrors(errorUrls);
        }
      };
      
      img.src = url;
      return img;
    });

    return () => {
      images.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [urls]);

  return { loaded, progress, errors };
}

// ==================== BATCH UPDATES ====================

/**
 * Batches multiple state updates into a single render
 */
export function useBatchedUpdates<T extends Record<string, unknown>>(
  initialState: T
): [T, (updates: Partial<T>) => void, (key: keyof T, value: T[keyof T]) => void] {
  const [state, setState] = useState(initialState);
  const pendingUpdates = useRef<Partial<T>>({});
  const rafRef = useRef<number | null>(null);

  const batchUpdate = useCallback((updates: Partial<T>) => {
    pendingUpdates.current = { ...pendingUpdates.current, ...updates };

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(() => {
        setState((prev) => ({ ...prev, ...pendingUpdates.current }));
        pendingUpdates.current = {};
        rafRef.current = null;
      });
    }
  }, []);

  const updateField = useCallback((key: keyof T, value: T[keyof T]) => {
    batchUpdate({ [key]: value } as Partial<T>);
  }, [batchUpdate]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return [state, batchUpdate, updateField];
}

// ==================== STABLE VALUE ====================

/**
 * Returns a stable reference that only changes when value deeply changes
 */
export function useStableValue<T>(value: T): T {
  const stableValueRef = useRef<T>(value);

  if (JSON.stringify(stableValueRef.current) !== JSON.stringify(value)) {
    stableValueRef.current = value;
  }

  return stableValueRef.current;
}

// ==================== COMPONENT PERFORMANCE ====================

export interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
}

export function usePerformanceMetrics(): PerformanceMetrics {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const lastRenderStart = useRef(0);

  useEffect(() => {
    const now = performance.now();
    if (lastRenderStart.current !== 0) {
      const renderTime = now - lastRenderStart.current;
      renderTimes.current.push(renderTime);
    }
    renderCount.current++;
    
    // Keep only last 10 renders
    if (renderTimes.current.length > 10) {
      renderTimes.current.shift();
    }

    lastRenderStart.current = now;
  });

  const averageRenderTime = renderTimes.current.length > 0
    ? renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length
    : 0;

  return {
    renderCount: renderCount.current,
    lastRenderTime: renderTimes.current[renderTimes.current.length - 1] || 0,
    averageRenderTime,
  };
}

// ==================== MEMORY CLEANUP ====================

/**
 * Automatically cleans up heavy resources when component unmounts
 */
export function useCleanup(cleanupFn: () => void, deps: unknown[] = []) {
  const cleanupRef = useRef(cleanupFn);

  useEffect(() => {
    cleanupRef.current = cleanupFn;
  }, [cleanupFn]);

  useEffect(() => {
    return () => cleanupRef.current();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default VirtualizedList;
