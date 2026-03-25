/**
 * Production-ready logging utility with Sentry integration
 * Replaces console.log/error with proper logging that respects environment
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

/**
 * Log levels for different environments
 */
const LOG_LEVELS = {
  development: ['debug', 'info', 'warn', 'error'] as LogLevel[],
  test: ['warn', 'error'] as LogLevel[],
  production: ['warn', 'error'] as LogLevel[], // Warnings + errors in production for valuable insights
};

const DEFAULT_LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

/**
 * Get current environment log levels
 */
function getEnabledLevels(): LogLevel[] {
  const env = process.env.NODE_ENV as keyof typeof LOG_LEVELS | undefined;
  if (env && env in LOG_LEVELS) {
    return LOG_LEVELS[env];
  }
  return DEFAULT_LOG_LEVELS;
}

/**
 * Check if log level is enabled
 */
function isLevelEnabled(level: LogLevel): boolean {
  return getEnabledLevels().includes(level);
}

/**
 * Normalize an arbitrary context value into a LogContext object.
 * Plain objects pass through; primitives and arrays are wrapped.
 */
function normalizeContext(context: unknown): LogContext | undefined {
  if (context === undefined || context === null) return undefined;
  if (typeof context === 'object' && !Array.isArray(context) && !(context instanceof Error)) {
    return context as LogContext;
  }
  if (context instanceof Error) {
    return { message: context.message, stack: context.stack };
  }
  return { value: String(context) };
}

/**
 * Format log message with context
 */
function formatMessage(message: string, context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return message;
  }
  return `${message} ${JSON.stringify(context)}`;
}

/**
 * Logger class with Sentry integration
 */
class Logger {
  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: unknown): void {
    if (isLevelEnabled('debug')) {
      console.debug(`[DEBUG] ${formatMessage(message, normalizeContext(context))}`);
    }
  }

  /**
   * Info level logging (development only)
   */
  info(message: string, context?: unknown): void {
    if (isLevelEnabled('info')) {
      console.info(`[INFO] ${formatMessage(message, normalizeContext(context))}`);
    }
  }

  /**
   * Warning level logging (development and test)
   */
  warn(message: string, context?: unknown): void {
    if (isLevelEnabled('warn')) {
      console.warn(`[WARN] ${formatMessage(message, normalizeContext(context))}`);
      
      // Send warnings to Sentry in production (if configured)
      if (process.env.NODE_ENV === 'production') {
        try {
          Sentry.captureMessage(message, {
            level: 'warning',
            extra: normalizeContext(context),
          });
        } catch {
          // Sentry not configured - fail silently
        }
      }
    }
  }

  /**
   * Error level logging (always enabled)
   * Automatically reports to Sentry if configured
   */
  error(message: string, error?: unknown, context?: unknown): void {
    if (isLevelEnabled('error')) {
      console.error(`[ERROR] ${formatMessage(message, normalizeContext(context))}`, error);
      
      // Always report errors to Sentry (if configured)
      try {
        if (error instanceof Error) {
          Sentry.captureException(error, {
            extra: { message, ...normalizeContext(context) },
          });
        } else {
          Sentry.captureMessage(message, {
            level: 'error',
            extra: { error, ...normalizeContext(context) },
          });
        }
      } catch {
        // Sentry not configured - fail silently
      }
    }
  }

  /**
   * Log transaction-related information
   */
  transaction(action: string, details: LogContext): void {
    this.info(`Transaction: ${action}`, details);
  }

  /**
   * Log wallet-related information
   */
  wallet(action: string, details: LogContext): void {
    this.info(`Wallet: ${action}`, details);
  }

  /**
   * Log network-related information
   */
  network(action: string, details: LogContext): void {
    this.info(`Network: ${action}`, details);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
