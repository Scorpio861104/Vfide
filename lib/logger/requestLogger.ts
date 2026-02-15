/**
 * Request Logging Utilities
 * 
 * Provides utilities for logging HTTP requests with tracing
 */

import { logger } from '../logger';

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Array.from(crypto.getRandomValues(new Uint8Array(5)), b => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Log an HTTP request
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  requestId?: string
): void {
  const context = {
    method,
    path,
    statusCode,
    duration,
    requestId,
    type: 'http-request',
  };
  
  if (statusCode >= 500) {
    logger.error('HTTP Request Error', undefined, context);
  } else if (statusCode >= 400) {
    logger.warn(`HTTP Request ${statusCode}`, context);
  } else {
    logger.info(`HTTP ${method} ${path}`, context);
  }
}

/**
 * Create a timer for measuring operation duration
 */
export function createTimer(label: string) {
  const start = Date.now();
  
  return {
    end: () => {
      const duration = Date.now() - start;
      logger.info(`${label} completed`, { label, duration });
      return duration;
    }
  };
}
