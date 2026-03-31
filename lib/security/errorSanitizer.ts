/**
 * Error Message Sanitization
 * 
 * Maps internal/technical errors to user-friendly messages to prevent
 * information disclosure (M-4 mitigation). Raw errors are logged server-side only.
 * 
 * Usage:
 *   import { sanitizeError, getUserFriendlyMessage } from '@/lib/security/errorSanitizer';
 *   
 *   try { ... } catch (error) {
 *     console.error('[INTERNAL]', error); // Server-side logging
 *     toast.error(getUserFriendlyMessage(error)); // User sees sanitized message
 *   }
 */

type ErrorPattern = {
  pattern: RegExp;
  userMessage: string;
  severity: 'info' | 'warning' | 'error';
};

/**
 * Map of error patterns to user-friendly messages
 * Order matters - first match wins
 */
const ERROR_PATTERNS: ErrorPattern[] = [
  // User rejection / cancellation (user-initiated, not an error to report)
  {
    pattern: /user (rejected|denied|cancelled?)/i,
    userMessage: 'You cancelled this transaction. Please try again if you want to proceed.',
    severity: 'info',
  },

  // Network/RPC errors (transient, user should retry)
  {
    pattern: /network request failed|ENOTFOUND|ECONNREFUSED|timeout|timed out/i,
    userMessage: 'Network connection failed. Please check your internet connection and try again.',
    severity: 'warning',
  },
  {
    pattern: /JsonRpcError|JSON.parse|invalid JSON response/i,
    userMessage: 'Failed to communicate with the blockchain. Please try again in a moment.',
    severity: 'warning',
  },
  {
    pattern: /insufficient funds|not enough balance|exceeds balance/i,
    userMessage: 'Insufficient balance. Please ensure you have enough to pay gas and transaction fees.',
    severity: 'warning',
  },

  // Smart contract errors (contract logic rejected)
  {
    pattern: /execution reverted|revert|out of gas|gas limit exceeded/i,
    userMessage: 'This transaction cannot be completed. Please check your wallet balance, token approvals, and contract conditions.',
    severity: 'warning',
  },
  {
    pattern: /invalid opcode|assertion failed|panic/i,
    userMessage: 'The contract encountered an unexpected condition. Please contact support if this persists.',
    severity: 'error',
  },

  // Wallet/signature errors
  {
    pattern: /signature|signing failed|sign message|SigningError/i,
    userMessage: 'Signature verification failed. Please check your wallet and try again.',
    severity: 'warning',
  },
  {
    pattern: /wallet not connected|no provider|ethereum not found/i,
    userMessage: 'Please connect your wallet to continue.',
    severity: 'info',
  },

  // Validation errors (user input)
  {
    pattern: /ZodError|validation failed|invalid|malformed/i,
    userMessage: 'The information you provided is invalid. Please check and try again.',
    severity: 'warning',
  },

  // Authorization errors
  {
    pattern: /unauthorized|forbidden|access denied|not authorized|permission denied/i,
    userMessage: 'You do not have permission to perform this action.',
    severity: 'warning',
  },
  {
    pattern: /401|403/,
    userMessage: 'You need to be logged in or authorized to perform this action.',
    severity: 'warning',
  },

  // Not found / missing data
  {
    pattern: /not found|no data|doesn'?t exist|404/i,
    userMessage: 'The requested item was not found. Please try a different search or refresh the page.',
    severity: 'info',
  },

  // Database/server errors (should rarely leak)
  {
    pattern: /database|SQL|query.*error|connection pool|ECONNREFUSED.*post/i,
    userMessage: 'A server error occurred. Please try again in a moment.',
    severity: 'error',
  },

  // Rate limiting
  {
    pattern: /rate limit|too many requests|429|throttl/i,
    userMessage: 'Too many requests. Please wait a moment and try again.',
    severity: 'warning',
  },

  // File upload errors
  {
    pattern: /file.*too large|size limit|upload.*fail|400/i,
    userMessage: 'File upload failed. Make sure the file is not too large and try again.',
    severity: 'warning',
  },
];

/**
 * Extract error message string from various error types
 */
function extractErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    // Chain the error message with cause if available (Error.cause)
    const message = error.message || '';
    const cause = (error as any).cause;
    if (cause instanceof Error && cause.message && message !== cause.message) {
      return `${message} (${cause.message})`;
    }
    return message;
  }

  if (typeof error === 'object' && error !== null) {
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
    if ('error' in error && typeof (error as any).error === 'string') {
      return (error as any).error;
    }
    if ('reason' in error && typeof (error as any).reason === 'string') {
      return (error as any).reason;
    }
  }

  return 'An unknown error occurred';
}

/**
 * Get user-friendly message based on error pattern matching
 * @param error Any error type
 * @returns User-safe error message (no internal details)
 */
export function getUserFriendlyMessage(error: unknown): string {
  const errorMessage = extractErrorMessage(error);

  // Find matching pattern
  const match = ERROR_PATTERNS.find(({ pattern }) => pattern.test(errorMessage));

  if (match) {
    return match.userMessage;
  }

  // If no pattern matches but it's a known short error, allow it
  if (errorMessage.length < 100 && !errorMessage.includes('localhost') && !errorMessage.includes('/')) {
    return errorMessage;
  }

  // Default fallback (very safe)
  return 'An error occurred. Please try again or contact support if the problem persists.';
}

/**
 * Get severity level for error (for styling/handling)
 * @param error Any error type
 * @returns Severity level: 'info' | 'warning' | 'error'
 */
export function getErrorSeverity(error: unknown): 'info' | 'warning' | 'error' {
  const errorMessage = extractErrorMessage(error);

  const match = ERROR_PATTERNS.find(({ pattern }) => pattern.test(errorMessage));
  return match?.severity ?? 'error';
}

/**
 * Sanitize error for storage/logging (removes PII, paths, stack traces)
 * @param error Any error type
 * @returns Sanitized error object for server-side logging
 */
export function sanitizeErrorForLogging(error: unknown): Record<string, unknown> {
  const message = extractErrorMessage(error);

  // Redact common PII patterns
  const sanitized = message
    .replace(/0x[a-fA-F0-9]{40}/g, '[WALLET_ADDRESS]') // Ethereum addresses
    .replace(/(\d{1,3}\.){3}\d{1,3}/g, '[IP_ADDRESS]') // IP addresses
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]') // US SSN
    .replace(/\b\d{16}\b/g, '[CARD_NUMBER]'); // Credit card

  return {
    type: error instanceof Error ? error.constructor.name : typeof error,
    message: sanitized,
    severity: getErrorSeverity(error),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Log error server-side with full details, return sanitized message to user
 * Call this in catch blocks to properly handle errors
 * @param error The error to handle
 * @param context Optional context string for logging
 * @returns User-friendly message safe to display
 */
export function handleErrorWithLogging(error: unknown, context?: string): string {
  // Log full details (server-side or to monitoring)
  console.error('[ERROR]', context || 'Unhandled error:', error);

  // Return sanitized message to user
  return getUserFriendlyMessage(error);
}
