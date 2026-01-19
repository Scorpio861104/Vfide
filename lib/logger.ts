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
  development: ['debug', 'info', 'warn', 'error'],
  test: ['warn', 'error'],
  production: ['error'], // Only errors in production
};

/**
 * Get current environment log levels
 */
function getEnabledLevels(): LogLevel[] {
  const env = process.env.NODE_ENV || 'development';
  return LOG_LEVELS[env as keyof typeof LOG_LEVELS] || LOG_LEVELS.development;
}

/**
 * Check if log level is enabled
 */
function isLevelEnabled(level: LogLevel): boolean {
  return getEnabledLevels().includes(level);
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
  debug(message: string, context?: LogContext): void {
    if (isLevelEnabled('debug')) {
      console.debug(`[DEBUG] ${formatMessage(message, context)}`);
    }
  }

  /**
   * Info level logging (development only)
   */
  info(message: string, context?: LogContext): void {
    if (isLevelEnabled('info')) {
      console.info(`[INFO] ${formatMessage(message, context)}`);
    }
  }

  /**
   * Warning level logging (development and test)
   */
  warn(message: string, context?: LogContext): void {
    if (isLevelEnabled('warn')) {
      console.warn(`[WARN] ${formatMessage(message, context)}`);
      
      // Send warnings to Sentry in production
      if (process.env.NODE_ENV === 'production') {
        Sentry.captureMessage(message, {
          level: 'warning',
          extra: context,
        });
      }
    }
  }

  /**
   * Error level logging (always enabled)
   * Automatically reports to Sentry
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (isLevelEnabled('error')) {
      console.error(`[ERROR] ${formatMessage(message, context)}`, error);
      
      // Always report errors to Sentry
      if (error instanceof Error) {
        Sentry.captureException(error, {
          extra: { message, ...context },
        });
      } else {
        Sentry.captureMessage(message, {
          level: 'error',
          extra: { error, ...context },
        });
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
