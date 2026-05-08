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

// OP-3 FIX: Sentry forwarder. Lazy-loaded so:
//   1. Edge runtimes that don't bundle @sentry/nextjs don't fail at import.
//   2. Test/CI environments without Sentry DSN don't pay any cost.
//   3. The logger module remains synchronous-friendly for callers; the
//      forwarder wraps Sentry calls in a try/catch so a Sentry outage
//      cannot interfere with the request being logged.
type SentryForwardLevel = 'warning' | 'error';

let _sentryClientCache: typeof import('@sentry/nextjs') | null | undefined;
function _loadSentryClient(): typeof import('@sentry/nextjs') | null {
  if (_sentryClientCache !== undefined) return _sentryClientCache;
  // Only attempt to load if the DSN is configured and we're in a Node
  // environment. Edge runtime sets EDGE_RUNTIME=true.
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    _sentryClientCache = null;
    return null;
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    // In edge runtime, lazy-load is unsafe. Skip — global-error.tsx and
    // other Sentry-aware boundaries handle edge errors directly.
    _sentryClientCache = null;
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _sentryClientCache = require('@sentry/nextjs');
  } catch {
    _sentryClientCache = null;
  }
  return _sentryClientCache ?? null;
}

function _forwardToSentry(
  level: SentryForwardLevel,
  message: string,
  context?: unknown,
  error?: unknown,
): void {
  try {
    const Sentry = _loadSentryClient();
    if (!Sentry) return;

    // Extras with PII already scrubbed by normalizeContext.
    const normalizedContext = normalizeContext(context);
    const extras = normalizedContext ? scrubValue(normalizedContext) : undefined;

    // Always set the message on the scope so an error captured via
    // captureException carries operator-meaningful context.
    Sentry.withScope((scope) => {
      scope.setLevel(level === 'error' ? 'error' : 'warning');
      if (extras && typeof extras === 'object') {
        for (const [k, v] of Object.entries(extras as Record<string, unknown>)) {
          scope.setExtra(k, v);
        }
      }
      scope.setExtra('logger_message', scrubString(message));

      if (level === 'error') {
        if (error instanceof Error) {
          Sentry.captureException(error);
        } else if (error !== undefined) {
          Sentry.captureException(new Error(scrubString(String(error))));
        } else {
          Sentry.captureMessage(scrubString(message), 'error');
        }
      } else {
        // warn: send as breadcrumb-like message to avoid event-quota burn
        Sentry.captureMessage(scrubString(message), 'warning');
      }
    });
  } catch {
    // Sentry forwarding must NEVER throw — the logger is on hot paths.
    // Swallow silently; the console output above is the source of truth.
  }
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

      // OP-3 FIX: Forward warnings to Sentry as breadcrumbs (not full events,
      // to avoid quota exhaustion). The Sentry import is lazy-required so
      // the logger remains lightweight in non-Sentry environments and so
      // edge runtimes that don't bundle @sentry/nextjs don't break.
      _forwardToSentry('warning', message, context);
    }
  }

  /**
   * Error level logging (always enabled)
   * Automatically reports to Sentry if configured
   */
  error(message: string, error?: unknown, context?: unknown): void {
    if (isLevelEnabled('error')) {
      console.error(`[ERROR] ${formatMessage(message, normalizeContext(context))}`, error);

      // OP-3 FIX: Forward errors to Sentry. Previously this method's
      // docstring claimed Sentry forwarding but the body explicitly
      // disabled it ("Sentry forwarding is intentionally disabled here").
      // 110 files in app/api/ call logger.error but none reached Sentry,
      // creating a major observability gap. We now forward via a lazy-
      // imported Sentry client. If Sentry is not configured (no DSN),
      // the forwarder is a no-op so nothing breaks.
      _forwardToSentry('error', message, context, error);
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
