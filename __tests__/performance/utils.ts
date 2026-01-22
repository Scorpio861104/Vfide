/**
 * Performance Test Utilities
 * Shared utilities and helpers for performance testing
 */

export interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  inp?: number;
  tbt?: number;
  tti?: number;
  speedIndex?: number;
}

export interface ResourceTiming {
  url: string;
  duration: number;
  size: number;
  type: string;
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
  fn: () => Promise<T> | T
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await fn();
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  return { result, duration };
}

/**
 * Get current memory usage
 */
export function getMemoryUsage(): number {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
}

/**
 * Force garbage collection (requires --expose-gc flag)
 */
export async function forceGarbageCollection(): Promise<void> {
  if (global.gc) {
    global.gc();
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

/**
 * Calculate average of an array of numbers
 */
export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

/**
 * Calculate median of an array of numbers
 */
export function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  
  return sorted[middle];
}

/**
 * Calculate 95th percentile
 */
export function percentile95(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  
  return sorted[index];
}

/**
 * Format bytes to human-readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format milliseconds to human-readable time
 */
export function formatMs(ms: number): string {
  if (ms < 1000) {
    return `${ms.toFixed(0)}ms`;
  }
  
  return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Check if value is within threshold
 */
export function isWithinThreshold(
  value: number,
  threshold: number,
  tolerance: number = 0.1
): boolean {
  const maxValue = threshold * (1 + tolerance);
  return value <= maxValue;
}

/**
 * Calculate performance score from metrics
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
  const weights = {
    lcp: 0.25,
    fid: 0.10,
    cls: 0.15,
    fcp: 0.10,
    ttfb: 0.10,
    inp: 0.10,
    tbt: 0.10,
    tti: 0.10,
  };

  const thresholds = {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    fcp: 1800,
    ttfb: 800,
    inp: 200,
    tbt: 300,
    tti: 3800,
  };

  let score = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const metricKey = key as keyof PerformanceMetrics;
    const value = metrics[metricKey];
    
    if (value !== undefined && value !== null) {
      const threshold = thresholds[metricKey];
      const metricScore = Math.max(0, Math.min(1, 1 - (value / threshold) + 0.5));
      score += metricScore * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? (score / totalWeight) * 100 : 0;
}

/**
 * Run multiple performance measurements and return statistics
 */
export async function runMultipleMeasurements<T>(
  fn: () => Promise<T> | T,
  iterations: number = 10
): Promise<{
  results: T[];
  durations: number[];
  stats: {
    average: number;
    median: number;
    min: number;
    max: number;
    p95: number;
  };
}> {
  const results: T[] = [];
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const { result, duration } = await measureTime(fn);
    results.push(result);
    durations.push(duration);
    
    // Small delay between measurements
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  return {
    results,
    durations,
    stats: {
      average: average(durations),
      median: median(durations),
      min: Math.min(...durations),
      max: Math.max(...durations),
      p95: percentile95(durations),
    },
  };
}

/**
 * Monitor memory usage during execution
 */
export async function monitorMemoryUsage<T>(
  fn: () => Promise<T> | T
): Promise<{
  result: T;
  initialMemory: number;
  finalMemory: number;
  peakMemory: number;
  memoryGrowth: number;
}> {
  await forceGarbageCollection();
  
  const initialMemory = getMemoryUsage();
  let peakMemory = initialMemory;

  // Monitor memory every 100ms
  const interval = setInterval(() => {
    const current = getMemoryUsage();
    if (current > peakMemory) {
      peakMemory = current;
    }
  }, 100);

  const result = await fn();
  
  clearInterval(interval);
  
  await forceGarbageCollection();
  const finalMemory = getMemoryUsage();

  return {
    result,
    initialMemory,
    finalMemory,
    peakMemory,
    memoryGrowth: finalMemory - initialMemory,
  };
}

/**
 * Create a performance observer
 */
export function createPerformanceObserver(
  types: string[],
  callback: (entries: PerformanceEntry[]) => void
): PerformanceObserver | null {
  if (typeof PerformanceObserver === 'undefined') {
    return null;
  }

  const observer = new PerformanceObserver((list) => {
    callback(list.getEntries());
  });

  try {
    observer.observe({ entryTypes: types });
    return observer;
  } catch {
    return null;
  }
}

/**
 * Wait for condition with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries reached');
}

/**
 * Get resource timing information
 */
export function getResourceTimings(): ResourceTiming[] {
  if (typeof performance === 'undefined') {
    return [];
  }

  const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
  
  return entries.map(entry => ({
    url: entry.name,
    duration: entry.duration,
    size: entry.transferSize || 0,
    type: entry.initiatorType,
  }));
}

/**
 * Clear performance measurements
 */
export function clearPerformanceMetrics(): void {
  if (typeof performance !== 'undefined') {
    performance.clearMarks();
    performance.clearMeasures();
    performance.clearResourceTimings();
  }
}

/**
 * Log performance metrics to console
 */
export function logPerformanceMetrics(
  name: string,
  metrics: PerformanceMetrics
): void {
  console.log(`\n=== ${name} Performance Metrics ===`);
  
  if (metrics.lcp) console.log(`LCP: ${formatMs(metrics.lcp)}`);
  if (metrics.fid) console.log(`FID: ${formatMs(metrics.fid)}`);
  if (metrics.cls) console.log(`CLS: ${metrics.cls.toFixed(3)}`);
  if (metrics.fcp) console.log(`FCP: ${formatMs(metrics.fcp)}`);
  if (metrics.ttfb) console.log(`TTFB: ${formatMs(metrics.ttfb)}`);
  if (metrics.inp) console.log(`INP: ${formatMs(metrics.inp)}`);
  if (metrics.tbt) console.log(`TBT: ${formatMs(metrics.tbt)}`);
  if (metrics.tti) console.log(`TTI: ${formatMs(metrics.tti)}`);
  if (metrics.speedIndex) console.log(`Speed Index: ${formatMs(metrics.speedIndex)}`);
  
  const score = calculatePerformanceScore(metrics);
  console.log(`Performance Score: ${score.toFixed(0)}/100`);
  console.log('===================================\n');
}

/**
 * Compare two sets of metrics
 */
export function compareMetrics(
  baseline: PerformanceMetrics,
  current: PerformanceMetrics
): {
  improved: string[];
  degraded: string[];
  unchanged: string[];
} {
  const improved: string[] = [];
  const degraded: string[] = [];
  const unchanged: string[] = [];

  const keys = Object.keys(baseline) as (keyof PerformanceMetrics)[];

  for (const key of keys) {
    const baselineValue = baseline[key];
    const currentValue = current[key];

    if (baselineValue === undefined || currentValue === undefined) {
      continue;
    }

    const diff = ((currentValue - baselineValue) / baselineValue) * 100;

    if (Math.abs(diff) < 5) {
      unchanged.push(key);
    } else if (diff < 0) {
      improved.push(`${key} (${diff.toFixed(1)}%)`);
    } else {
      degraded.push(`${key} (+${diff.toFixed(1)}%)`);
    }
  }

  return { improved, degraded, unchanged };
}

/**
 * Assert performance threshold
 */
export function assertPerformanceThreshold(
  actual: number,
  threshold: number,
  metricName: string
): void {
  if (actual > threshold) {
    throw new Error(
      `Performance threshold exceeded for ${metricName}: ${actual} > ${threshold}`
    );
  }
}
