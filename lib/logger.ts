/**
 * Production-safe logger utility
 * 
 * Wraps console methods with environment checks to prevent
 * debug logging in production builds
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

export const logger = {
  /**
   * Log debug information (only in development)
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Log informational messages (only in development)
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Log warnings (always shown)
   */
  warn: (...args: unknown[]): void => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Log errors (always shown)
   */
  error: (...args: unknown[]): void => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Log API requests (only in development)
   */
  api: (method: string, path: string, status?: number): void => {
    if (isDevelopment) {
      console.log(`[API] ${method} ${path}${status ? ` - ${status}` : ''}`);
    }
  },

  /**
   * Log performance metrics (only in development)
   */
  perf: (label: string, duration: number): void => {
    if (isDevelopment) {
      console.log(`[PERF] ${label}: ${duration.toFixed(2)}ms`);
    }
  },

  /**
   * Log in test environment only
   */
  test: (...args: unknown[]): void => {
    if (isTest) {
      console.log('[TEST]', ...args);
    }
  },
};

/**
 * Helper to measure execution time
 */
export function measureTime<T>(
  label: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  if (!isDevelopment) {
    return fn();
  }

  const start = performance.now();
  const result = fn();

  if (result instanceof Promise) {
    return result.finally(() => {
      const duration = performance.now() - start;
      logger.perf(label, duration);
    }) as Promise<T>;
  } else {
    const duration = performance.now() - start;
    logger.perf(label, duration);
    return result;
  }
}
