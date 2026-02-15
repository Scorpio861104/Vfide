/**
 * Performance Profiling Utilities
 * 
 * Helpers for identifying React.memo optimization opportunities
 * and measuring component render performance
 */

import { useEffect, useRef } from 'react';

/**
 * Measure component render time
 */
export function useRenderCount(componentName: string, logThreshold: number = 5) {
  const renderCount = useRef(0);
  const startTime = useRef<number | null>(null);

  useEffect(() => {
    const now = Date.now();
    const start = startTime.current ?? now;
    renderCount.current += 1;
    const renderTime = now - start;

    if (renderCount.current >= logThreshold) {
      console.log(
        `[Performance] ${componentName} rendered ${renderCount.current} times ` +
        `(avg: ${(renderTime / renderCount.current).toFixed(2)}ms per render)`
      );
    }

    startTime.current = now;
  });

  // eslint-disable-next-line react-hooks/refs
  return renderCount.current;
}

/**
 * Detect unnecessary re-renders by comparing props
 */
export function useWhyDidYouUpdate(name: string, props: Record<string, unknown>) {
  const previousProps = useRef<Record<string, unknown> | undefined>(undefined);

  useEffect(() => {
    if (previousProps.current) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: unknown; to: unknown }> = {};

      allKeys.forEach((key) => {
        const prevValue = previousProps.current?.[key];
        if (prevValue !== props[key]) {
          changedProps[key] = {
            from: prevValue,
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log('[Performance]', name, 'props changed:', changedProps);
      }
    }

    previousProps.current = props;
  });
}

/**
 * Generate performance report for all tracked components
 */
const componentRenderTimes = new Map<string, number[]>();

export function trackComponentRender(componentName: string) {
  const renders = componentRenderTimes.get(componentName) || [];
  renders.push(Date.now());
  componentRenderTimes.set(componentName, renders);
}

export function generatePerformanceReport(): {
  componentName: string;
  renderCount: number;
  shouldMemo: boolean;
}[] {
  const report: { componentName: string; renderCount: number; shouldMemo: boolean }[] = [];
  const now = Date.now();
  const timeWindow = 60000; // Last minute

  componentRenderTimes.forEach((renders, componentName) => {
    const recentRenders = renders.filter(time => now - time < timeWindow);
    report.push({
      componentName,
      renderCount: recentRenders.length,
      shouldMemo: recentRenders.length >= 5,
    });
  });

  return report.sort((a, b) => b.renderCount - a.renderCount);
}

/**
 * Hook to measure expensive operations
 */
export function usePerformanceMark(label: string) {
  const mark = (operation: string) => {
    const markName = `${label}:${operation}`;
    performance.mark(markName);
  };

  const measure = (operation: string, startOperation?: string) => {
    const markName = `${label}:${operation}`;
    const startMarkName = startOperation ? `${label}:${startOperation}` : markName;
    try {
      performance.measure(markName, startMarkName);
      const m = performance.getEntriesByName(markName, 'measure')[0];
      const duration = m?.duration || 0;
      
      if (duration > 16) {
        console.warn(`[Performance] ${markName} took ${duration.toFixed(2)}ms`);
      }
      
      performance.clearMarks(markName);
      performance.clearMeasures(markName);
      
      return duration;
    } catch (_error) {
      return 0;
    }
  };

  return { mark, measure };
}
