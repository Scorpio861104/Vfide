/**
 * Centralized Logging Service
 * 
 * Provides structured logging with different log levels and prevents
 * sensitive information leakage in production environments.
 * 
 * Usage:
 *   logger.error('Failed to fetch data', { context: 'API' });
 *   logger.warn('Rate limit approaching', { remaining: 5 });
 *   logger.info('User logged in', { userId: '0x123...' });
 *   logger.debug('Cache hit', { key: 'user_data' });
 */

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isTest = process.env.NODE_ENV === 'test';
  
  // Pre-compile sensitive keys as a Set for fast lookup
  private sensitiveKeys = new Set([
    'password',
    'privatekey',
    'secret',
    'token',
    'apikey',
    'signature',
    'mnemonic',
  ]);

  /**
   * Sanitize log data to prevent leaking sensitive information
   * Uses Set for O(1) exact key matching
   */
  private sanitize(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Check exact match first (O(1))
      if (this.sensitiveKeys.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  /**
   * Format log message with context
   */
  private format(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(this.sanitize(context))}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  /**
   * Log error messages
   * In production, logs are sanitized and structured
   */
  error(message: string, context?: LogContext): void {
    if (this.isTest) return;

    const formatted = this.format(LogLevel.ERROR, message, context);
    
    if (this.isDevelopment) {
      console.error(formatted, context);
    } else {
      // In production, only log sanitized data
      console.error(formatted);
      // Here you would integrate with error tracking services (Sentry, DataDog, etc.)
    }
  }

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext): void {
    if (this.isTest) return;

    const formatted = this.format(LogLevel.WARN, message, context);
    
    if (this.isDevelopment) {
      console.warn(formatted, context);
    } else {
      console.warn(formatted);
    }
  }

  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    if (this.isTest) return;

    const formatted = this.format(LogLevel.INFO, message, context);
    
    if (this.isDevelopment) {
      console.info(formatted, context);
    } else {
      console.log(formatted);
    }
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isDevelopment || this.isTest) return;

    const formatted = this.format(LogLevel.DEBUG, message, context);
    console.debug(formatted, context);
  }

  /**
   * Create a child logger with a specific context prefix
   * Useful for maintaining context across multiple log calls
   */
  child(contextPrefix: string): ChildLogger {
    return new ChildLogger(this, contextPrefix);
  }
}

/**
 * Child logger that maintains context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private contextPrefix: string
  ) {}

  private addPrefix(message: string): string {
    return `[${this.contextPrefix}] ${message}`;
  }

  error(message: string, context?: LogContext): void {
    this.parent.error(this.addPrefix(message), context);
  }

  warn(message: string, context?: LogContext): void {
    this.parent.warn(this.addPrefix(message), context);
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(this.addPrefix(message), context);
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(this.addPrefix(message), context);
  }
}

/**
 * Global logger instance
 * Use this throughout the application for consistent logging
 */
export const logger = new Logger();

/**
 * Create API-specific logger
 */
export const apiLogger = logger.child('API');

/**
 * Create WebSocket-specific logger
 */
export const wsLogger = logger.child('WebSocket');

/**
 * Create Auth-specific logger
 */
export const authLogger = logger.child('Auth');
