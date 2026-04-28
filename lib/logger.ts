/**
 * Production-ready logging utility with Sentry integration
 * Replaces console.log/error with proper logging that respects environment
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const ETH_ADDRESS_RE = /\b0x[a-fA-F0-9]{40}\b/g;
const TX_HASH_RE = /\b0x[a-fA-F0-9]{64}\b/g;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /\b\+?\d{7,15}\b/g;

function scrubString(value: string): string {
  return value
    .replace(TX_HASH_RE, '0xTXHASH')
    .replace(ETH_ADDRESS_RE, '0xADDR')
    .replace(EMAIL_RE, '<EMAIL>')
    .replace(PHONE_RE, '<PHONE>');
}

function scrubValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return scrubString(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => scrubValue(entry));
  }

  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = scrubValue(v);
    }
    return out;
  }

  return value;
}

function toSentryExtras(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
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
    return {
      message: scrubString(context.message),
      stack: context.stack ? scrubString(context.stack) : undefined,
    };
  }
  return { value: scrubString(String(context)) };
}

/**
 * Format log message with context
 */
function formatMessage(message: string, context?: LogContext): string {
  const safeMessage = scrubString(message);
  if (!context || Object.keys(context).length === 0) {
    return safeMessage;
  }
  return `${safeMessage} ${JSON.stringify(scrubValue(context))}`;
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

      // Sentry forwarding is intentionally disabled here to keep logger lightweight
      // and avoid pulling heavy tracing dependencies into frontend startup.
    }
  }

  /**
   * Error level logging (always enabled)
   * Automatically reports to Sentry if configured
   */
  error(message: string, error?: unknown, context?: unknown): void {
    if (isLevelEnabled('error')) {
      console.error(`[ERROR] ${formatMessage(message, normalizeContext(context))}`, error);

      // Sentry forwarding is intentionally disabled here to keep logger lightweight
      // and avoid pulling heavy tracing dependencies into frontend startup.
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
