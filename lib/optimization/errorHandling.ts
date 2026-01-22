/**
 * Error Handling Enhancements
 * 
 * Improved error handling utilities:
 * - Structured error responses
 * - Error classification
 * - User-friendly messages
 * - Error tracking integration
 * - Retry logic
 */

/**
 * Standard error types
 */
export enum ErrorType {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  
  // Blockchain errors
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
}

/**
 * Structured error response
 */
export interface ApiError {
  type: ErrorType;
  message: string;
  details?: Record<string, any>;
  code?: string;
  statusCode: number;
  timestamp: string;
  requestId?: string;
  retryable: boolean;
}

/**
 * Error type to status code mapping
 */
const ERROR_STATUS_CODES: Record<ErrorType, number> = {
  [ErrorType.BAD_REQUEST]: 400,
  [ErrorType.UNAUTHORIZED]: 401,
  [ErrorType.FORBIDDEN]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.VALIDATION_ERROR]: 422,
  [ErrorType.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorType.INTERNAL_ERROR]: 500,
  [ErrorType.SERVICE_UNAVAILABLE]: 503,
  [ErrorType.DATABASE_ERROR]: 500,
  [ErrorType.EXTERNAL_API_ERROR]: 502,
  [ErrorType.NETWORK_ERROR]: 503,
  [ErrorType.TIMEOUT_ERROR]: 504,
  [ErrorType.TRANSACTION_FAILED]: 400,
  [ErrorType.INSUFFICIENT_FUNDS]: 400,
  [ErrorType.CONTRACT_ERROR]: 400,
};

/**
 * Retryable error types
 */
const RETRYABLE_ERRORS = new Set([
  ErrorType.NETWORK_ERROR,
  ErrorType.TIMEOUT_ERROR,
  ErrorType.SERVICE_UNAVAILABLE,
  ErrorType.EXTERNAL_API_ERROR,
]);

/**
 * Create structured API error
 */
export function createApiError(
  type: ErrorType,
  message: string,
  details?: Record<string, any>,
  requestId?: string
): ApiError {
  return {
    type,
    message,
    details,
    statusCode: ERROR_STATUS_CODES[type],
    timestamp: new Date().toISOString(),
    requestId,
    retryable: RETRYABLE_ERRORS.has(type),
  };
}

/**
 * User-friendly error messages
 */
const USER_FRIENDLY_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.BAD_REQUEST]: 'Invalid request. Please check your input.',
  [ErrorType.UNAUTHORIZED]: 'Please sign in to continue.',
  [ErrorType.FORBIDDEN]: 'You don\'t have permission to perform this action.',
  [ErrorType.NOT_FOUND]: 'The requested resource was not found.',
  [ErrorType.CONFLICT]: 'This action conflicts with existing data.',
  [ErrorType.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ErrorType.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  [ErrorType.INTERNAL_ERROR]: 'Something went wrong. We\'re looking into it.',
  [ErrorType.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable. Please try again.',
  [ErrorType.DATABASE_ERROR]: 'Database error. Please try again.',
  [ErrorType.EXTERNAL_API_ERROR]: 'External service error. Please try again.',
  [ErrorType.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [ErrorType.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ErrorType.TRANSACTION_FAILED]: 'Transaction failed. Please try again.',
  [ErrorType.INSUFFICIENT_FUNDS]: 'Insufficient funds for this transaction.',
  [ErrorType.CONTRACT_ERROR]: 'Smart contract error. Please try again.',
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(type: ErrorType): string {
  return USER_FRIENDLY_MESSAGES[type] || 'An unexpected error occurred.';
}

/**
 * Custom application error class
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public details?: Record<string, any>,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode || ERROR_STATUS_CODES[type];
  }

  toJSON(): ApiError {
    return createApiError(this.type, this.message, this.details);
  }
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 10000,
};

/**
 * Retry function with exponential backoff
 * Automatically retries on retryable errors
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, delayMs, backoffMultiplier, maxDelayMs } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: any;
  let currentDelay = delayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const isRetryable = error instanceof AppError && error.type && RETRYABLE_ERRORS.has(error.type);

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxAttempts || !isRetryable) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, currentDelay));

      // Exponential backoff
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

/**
 * Timeout wrapper for async functions
 * Prevents hanging requests
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new AppError(ErrorType.TIMEOUT_ERROR, errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Error boundary for API routes
 * Converts errors to structured responses
 */
export function handleApiError(error: unknown, requestId?: string): ApiError {
  // AppError - already structured
  if (error instanceof AppError) {
    return createApiError(error.type, error.message, error.details, requestId);
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return createApiError(ErrorType.NETWORK_ERROR, 'Network connection failed', { originalError: error.message }, requestId);
    }

    if (error.message.includes('timeout')) {
      return createApiError(ErrorType.TIMEOUT_ERROR, 'Request timed out', { originalError: error.message }, requestId);
    }

    // Generic error
    return createApiError(ErrorType.INTERNAL_ERROR, error.message, undefined, requestId);
  }

  // Unknown error
  return createApiError(ErrorType.INTERNAL_ERROR, 'An unexpected error occurred', { error: String(error) }, requestId);
}

/**
 * Graceful degradation helper
 * Falls back to default value on error
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  options: { logError?: boolean } = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (options.logError) {
      console.error('Operation failed, using fallback:', error);
    }
    return fallback;
  }
}
