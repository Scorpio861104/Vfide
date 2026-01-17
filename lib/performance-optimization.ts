/**
 * Performance Optimization Utilities
 * 
 * Helpers for React.memo, useMemo, and useCallback patterns to prevent
 * unnecessary re-renders and improve application performance.
 * 
 * Usage:
 * ```tsx
 * // Memoize expensive component
 * const MyComponent = memo(({ data }) => {
 *   return <div>{data}</div>;
 * }, propsAreEqual);
 * 
 * // Memoize expensive computation
 * const result = useMemoizedValue(() => expensiveCalculation(data), [data]);
 * ```
 */

import { memo, useMemo, useCallback, DependencyList } from 'react';

/**
 * Shallow compare props for React.memo
 * Use this for simple props comparison
 */
export function shallowPropsAreEqual<P>(prevProps: P, nextProps: P): boolean {
  const prevKeys = Object.keys(prevProps as object);
  const nextKeys = Object.keys(nextProps as object);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  return prevKeys.every(
    (key) => (prevProps as Record<string, unknown>)[key] === (nextProps as Record<string, unknown>)[key]
  );
}

/**
 * Deep compare props for React.memo
 * Uses a simple but reliable comparison
 * Note: For complex objects, consider using a dedicated library
 */
export function deepPropsAreEqual<P>(prevProps: P, nextProps: P): boolean {
  if (prevProps === nextProps) return true;
  
  if (typeof prevProps !== 'object' || typeof nextProps !== 'object') {
    return false;
  }
  
  if (prevProps === null || nextProps === null) {
    return prevProps === nextProps;
  }
  
  const prevKeys = Object.keys(prevProps as object);
  const nextKeys = Object.keys(nextProps as object);
  
  if (prevKeys.length !== nextKeys.length) {
    return false;
  }
  
  // Recursive comparison for nested objects
  for (const key of prevKeys) {
    const prevVal = (prevProps as Record<string, unknown>)[key];
    const nextVal = (nextProps as Record<string, unknown>)[key];
    
    if (typeof prevVal === 'object' && typeof nextVal === 'object') {
      if (!deepPropsAreEqual(prevVal, nextVal)) {
        return false;
      }
    } else if (prevVal !== nextVal) {
      return false;
    }
  }
  
  return true;
}

/**
 * Create memoized component with shallow comparison
 * Best for components with primitive props
 */
export function memoShallow<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> {
  const memoized = memo(Component, shallowPropsAreEqual);
  if (displayName) {
    memoized.displayName = `MemoShallow(${displayName})`;
  }
  return memoized;
}

/**
 * Create memoized component with deep comparison
 * Use sparingly - deep comparison is expensive
 */
export function memoDeep<P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
): React.MemoExoticComponent<React.ComponentType<P>> {
  const memoized = memo(Component, deepPropsAreEqual);
  if (displayName) {
    memoized.displayName = `MemoDeep(${displayName})`;
  }
  return memoized;
}

/**
 * Custom memoized value hook with debug logging
 */
export function useMemoizedValue<T>(
  factory: () => T,
  deps: DependencyList,
  debugName?: string
): T {
  return useMemo(() => {
    if (process.env.NODE_ENV === 'development' && debugName) {
      console.debug(`[Performance] Computing ${debugName}`);
    }
    return factory();
  }, deps);
}

/**
 * Custom memoized callback hook with debug logging
 */
export function useMemoizedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  deps: DependencyList,
  debugName?: string
): T {
  return useCallback((...args: never[]) => {
    if (process.env.NODE_ENV === 'development' && debugName) {
      console.debug(`[Performance] Calling ${debugName}`);
    }
    return callback(...args);
  }, deps) as T;
}

/**
 * Memoize expensive calculation with cache
 * Uses a simple string key based on input
 */
export function createMemoizedCalculation<TInput extends string | number, TOutput>(
  calculate: (input: TInput) => TOutput,
  maxCacheSize = 10
): (input: TInput) => TOutput {
  const cache = new Map<TInput, TOutput>();
  const accessOrder: TInput[] = [];

  return (input: TInput) => {
    if (cache.has(input)) {
      // Move to end (most recently used)
      const index = accessOrder.indexOf(input);
      if (index > -1) {
        accessOrder.splice(index, 1);
      }
      accessOrder.push(input);
      return cache.get(input)!;
    }

    const result = calculate(input);
    cache.set(input, result);
    accessOrder.push(input);

    // Evict oldest if cache is full
    if (cache.size > maxCacheSize) {
      const oldest = accessOrder.shift();
      if (oldest !== undefined) {
        cache.delete(oldest);
      }
    }

    return result;
  };
}

/**
 * Performance monitoring decorator for functions
 */
export function measurePerformance<T extends (...args: never[]) => unknown>(
  fn: T,
  name: string
): T {
  return ((...args: never[]) => {
    if (process.env.NODE_ENV === 'development') {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      
      if (end - start > 16) { // More than one frame (16ms)
        console.warn(`[Performance] ${name} took ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    }
    return fn(...args);
  }) as T;
}

/**
 * List of component patterns that should be memoized
 * Use this guide when refactoring components
 */
export const MEMOIZATION_GUIDE = {
  ALWAYS_MEMOIZE: [
    'List items in virtualized lists',
    'Components that receive callbacks as props',
    'Components with expensive render logic',
    'Pure display components with multiple props',
  ],
  CONSIDER_MEMOIZING: [
    'Components rendered in loops',
    'Components with context consumers',
    'Components with expensive useEffect',
  ],
  DONT_MEMOIZE: [
    'Top-level App component',
    'Components that always change',
    'Very simple components (< 10 lines)',
  ],
} as const;

/**
 * Utility to identify components that should be memoized
 * Run this in development to find optimization opportunities
 */
export function analyzeRenderPerformance(componentName: string) {
  if (process.env.NODE_ENV === 'development') {
    const renderTimes: number[] = [];
    
    return {
      beforeRender() {
        renderTimes.push(performance.now());
      },
      afterRender() {
        const start = renderTimes.pop();
        if (start) {
          const duration = performance.now() - start;
          if (duration > 16) {
            console.warn(
              `[Performance] ${componentName} took ${duration.toFixed(2)}ms to render. Consider memoization.`
            );
          }
        }
      },
    };
  }
  
  return {
    beforeRender() {},
    afterRender() {},
  };
}
