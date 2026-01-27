/**
 * Centralized Logging Utility
 * 
 * Provides structured logging with levels and production-safe output.
 * Integrates with error monitoring services in production.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';

  /**
   * Log debug information (only in development)
   */
  debug(message: string, context?: LogContext) {
    if (this.isDevelopment && !this.isTest) {
      console.debug('[DEBUG]', message, context || '');
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.info('[INFO]', message, context || '');
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext) {
    console.warn('[WARN]', message, context || '');
    
    // In production, send to monitoring service
    if (!this.isDevelopment) {
      this.sendToMonitoring('warn', message, context);
    }
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | unknown, context?: LogContext) {
    console.error('[ERROR]', message, error, context || '');
    
    // In production, send to monitoring service
    if (!this.isDevelopment) {
      this.sendToMonitoring('error', message, { error, ...context });
    }
  }

  /**
   * Send logs to monitoring service (Sentry, etc.)
   */
  private sendToMonitoring(level: LogLevel, message: string, context?: LogContext) {
    // TODO: Integrate with Sentry or other monitoring service
    // For now, just ensure it's logged to console in production
    if (typeof window !== 'undefined' && (window as { Sentry?: unknown }).Sentry) {
      // Sentry integration would go here
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const log = {
  debug: logger.debug.bind(logger),
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
};
