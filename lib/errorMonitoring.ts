/**
 * Error Monitoring and Tracking System
 * 
 * Comprehensive error tracking with logging, reporting, and analytics.
 * Integrates with error boundaries and provides detailed error context.
 */

'use client';

export interface ErrorReport {
  id: string;
  timestamp: number;
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  context?: Record<string, any>;
  tags?: string[];
  fingerprint?: string;
}

export interface ErrorContext {
  componentName?: string;
  actionName?: string;
  metadata?: Record<string, any>;
  userId?: string;
  sessionId?: string;
}

class ErrorMonitor {
  private errors: ErrorReport[] = [];
  private maxErrors = 1000;
  private sessionId: string;
  private userId?: string;
  private isProduction: boolean;
  private errorListeners: Array<(error: ErrorReport) => void> = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = process.env.NODE_ENV === 'production';
    this.initializeGlobalHandlers();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize global error handlers
   */
  private initializeGlobalHandlers() {
    if (typeof window === 'undefined') return;

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        componentName: 'window',
        actionName: 'uncaught-error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          componentName: 'window',
          actionName: 'unhandled-rejection',
          metadata: {
            reason: event.reason,
          },
        }
      );
    });

    // Handle console errors in development
    if (!this.isProduction) {
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        this.captureError(new Error(args.join(' ')), {
          componentName: 'console',
          actionName: 'console-error',
        });
        originalError.apply(console, args);
      };
    }
  }

  /**
   * Set user ID for error tracking
   */
  setUserId(userId: string) {
    this.userId = userId;
  }

  /**
   * Capture error with context
   */
  captureError(
    error: Error | string,
    context?: ErrorContext,
    severity: ErrorReport['severity'] = 'medium'
  ): ErrorReport {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

    const report: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'error',
      severity,
      message: errorObj.message || String(error),
      stack: errorObj.stack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      userId: context?.userId || this.userId,
      context: {
        sessionId: this.sessionId,
        componentName: context?.componentName,
        actionName: context?.actionName,
        ...context?.metadata,
      },
      fingerprint: this.generateFingerprint(errorObj, context),
    };

    this.storeError(report);
    this.notifyListeners(report);
    this.sendToBackend(report);

    // Log in development
    if (!this.isProduction) {
      console.error('[ErrorMonitor]', report);
    }

    return report;
  }

  /**
   * Capture warning
   */
  captureWarning(message: string, context?: ErrorContext) {
    const report: ErrorReport = {
      id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'warning',
      severity: 'low',
      message,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      userId: context?.userId || this.userId,
      context: {
        sessionId: this.sessionId,
        ...context?.metadata,
      },
    };

    this.storeError(report);
    this.notifyListeners(report);

    if (!this.isProduction) {
      console.warn('[ErrorMonitor]', report);
    }
  }

  /**
   * Capture info message
   */
  captureInfo(message: string, context?: ErrorContext) {
    const report: ErrorReport = {
      id: `info_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'info',
      severity: 'low',
      message,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      userId: context?.userId || this.userId,
      context: {
        sessionId: this.sessionId,
        ...context?.metadata,
      },
    };

    this.storeError(report);

    if (!this.isProduction) {
      console.info('[ErrorMonitor]', report);
    }
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(error: Error, context?: ErrorContext): string {
    const parts = [
      error.message,
      error.stack?.split('\n')[0],
      context?.componentName,
      context?.actionName,
    ].filter(Boolean);

    return parts.join('|');
  }

  /**
   * Store error in memory
   */
  private storeError(report: ErrorReport) {
    this.errors.push(report);

    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }
  }

  /**
   * Send error to backend
   */
  private async sendToBackend(report: ErrorReport) {
    if (!this.isProduction) return;

    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        keepalive: true,
      });
    } catch (error) {
      // Silently fail to avoid error loops
      console.error('Failed to send error report:', error);
    }
  }

  /**
   * Subscribe to error events
   */
  onError(callback: (error: ErrorReport) => void) {
    this.errorListeners.push(callback);
    return () => {
      this.errorListeners = this.errorListeners.filter((cb) => cb !== callback);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(report: ErrorReport) {
    this.errorListeners.forEach((listener) => {
      try {
        listener(report);
      } catch (error) {
        console.error('Error in error listener:', error);
      }
    });
  }

  /**
   * Get all errors
   */
  getErrors(filter?: {
    type?: ErrorReport['type'];
    severity?: ErrorReport['severity'];
    limit?: number;
  }): ErrorReport[] {
    let filtered = [...this.errors];

    if (filter?.type) {
      filtered = filtered.filter((e) => e.type === filter.type);
    }

    if (filter?.severity) {
      filtered = filtered.filter((e) => e.severity === filter.severity);
    }

    if (filter?.limit) {
      filtered = filtered.slice(-filter.limit);
    }

    return filtered.reverse();
  }

  /**
   * Get error statistics
   */
  getStatistics() {
    const stats = {
      total: this.errors.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byFingerprint: {} as Record<string, number>,
      recentErrors: this.errors.slice(-10).reverse(),
    };

    this.errors.forEach((error) => {
      stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
      
      if (error.fingerprint) {
        stats.byFingerprint[error.fingerprint] = 
          (stats.byFingerprint[error.fingerprint] || 0) + 1;
      }
    });

    return stats;
  }

  /**
   * Clear all errors
   */
  clearErrors() {
    this.errors = [];
  }

  /**
   * Export errors for debugging
   */
  exportErrors() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      errors: this.errors,
      statistics: this.getStatistics(),
    };
  }
}

// Singleton instance
export const errorMonitor = new ErrorMonitor();

/**
 * React hook for error monitoring
 */
export function useErrorMonitor() {
  return {
    captureError: errorMonitor.captureError.bind(errorMonitor),
    captureWarning: errorMonitor.captureWarning.bind(errorMonitor),
    captureInfo: errorMonitor.captureInfo.bind(errorMonitor),
    getErrors: errorMonitor.getErrors.bind(errorMonitor),
    getStatistics: errorMonitor.getStatistics.bind(errorMonitor),
    setUserId: errorMonitor.setUserId.bind(errorMonitor),
  };
}

/**
 * Wrapper for async functions with error tracking
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      errorMonitor.captureError(
        error instanceof Error ? error : new Error(String(error)),
        context,
        'high'
      );
      throw error;
    }
  }) as T;
}

/**
 * Try-catch wrapper with error tracking
 */
export async function tryCatch<T>(
  fn: () => Promise<T> | T,
  context?: ErrorContext,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    errorMonitor.captureError(
      error instanceof Error ? error : new Error(String(error)),
      context,
      'medium'
    );
    return fallback;
  }
}
