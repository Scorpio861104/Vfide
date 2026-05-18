/**
 * Logger Configuration
 * 
 * Environment-specific configuration for logging system
 */

export const LOG_LEVELS = {
  trace: 60,
  debug: 50,
  info: 40,
  warn: 30,
  error: 20,
  fatal: 10,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

/**
 * Get default log level based on environment
 */
export function getDefaultLogLevel(): LogLevel {
  const env = process.env.NODE_ENV;
  
  if (env === 'production') return 'info';
  if (env === 'test') return 'error';
  return 'debug'; // Development: show debug and above
}

/**
 * Check if a log level should be logged
 */
export function shouldLog(level: LogLevel, currentLevel: LogLevel): boolean {
  return LOG_LEVELS[level] <= LOG_LEVELS[currentLevel];
}

/**
 * Sensitive fields to redact from logs
 */
export const REDACTED_FIELDS = [
  'password',
  'token',
  'secret',
  'apiKey',
  'authorization',
  'privateKey',
  'mnemonic',
  'seed',
];

/**
 * Redact sensitive fields from an object
 */
export function redactSensitiveData(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  
  const redacted = { ...data } as Record<string, unknown>;
  
  for (const field of REDACTED_FIELDS) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }
  
  return redacted;
}
