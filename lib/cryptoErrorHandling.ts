/**
 * Error handling and retry logic for crypto operations
 */

export class CryptoError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

// Error codes
export const ErrorCodes = {
  USER_REJECTED: 'USER_REJECTED',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONTRACT_ERROR: 'CONTRACT_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_INPUT: 'INVALID_INPUT',
  WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
  RATE_LIMIT: 'RATE_LIMIT',
  GAS_TOO_HIGH: 'GAS_TOO_HIGH',
  UNKNOWN: 'UNKNOWN',
} as const;

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Parse MetaMask/Web3 errors into friendly messages
 */
export function parseCryptoError(error: unknown): CryptoError {
  const err = error as { code?: string | number; message?: string };
  
  // User rejected transaction
  if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
    return new CryptoError(
      'Transaction was rejected',
      ErrorCodes.USER_REJECTED,
      error,
      false
    );
  }

  // Insufficient funds
  if (
    err.code === -32000 ||
    err.message?.includes('insufficient funds') ||
    err.message?.includes('insufficient balance')
  ) {
    return new CryptoError(
      'Insufficient funds for transaction',
      ErrorCodes.INSUFFICIENT_FUNDS,
      error,
      false
    );
  }

  // Network errors (retryable)
  if (
    err.code === 'NETWORK_ERROR' ||
    error.message?.includes('network') ||
    error.message?.includes('timeout') ||
    error.message?.includes('connection')
  ) {
    return new CryptoError(
      'Network error - please try again',
      ErrorCodes.NETWORK_ERROR,
      error,
      true
    );
  }

  // Gas estimation errors
  if (
    error.message?.includes('gas') ||
    error.message?.includes('intrinsic gas too low')
  ) {
    return new CryptoError(
      'Gas estimation failed - transaction may fail',
      ErrorCodes.GAS_TOO_HIGH,
      error,
      false
    );
  }

  // Contract execution reverted
  if (
    err.message?.includes('revert') ||
    err.message?.includes('execution reverted')
  ) {
    return new CryptoError(
      'Transaction would fail - contract error',
      ErrorCodes.CONTRACT_ERROR,
      error,
      false
    );
  }

  // Rate limit
  if (err.message?.includes('rate limit') || err.message?.includes('too many requests')) {
    return new CryptoError(
      'Rate limit exceeded - please wait and try again',
      ErrorCodes.RATE_LIMIT,
      error,
      true
    );
  }

  // Wallet not connected
  if (err.message?.includes('wallet') || err.message?.includes('not connected')) {
    return new CryptoError(
      'Wallet not connected',
      ErrorCodes.WALLET_NOT_CONNECTED,
      error,
      false
    );
  }

  // Generic error
  return new CryptoError(
    err.message || 'An unknown error occurred',
    ErrorCodes.UNKNOWN,
    error,
    true
  );
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: CryptoError) => void
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: CryptoError;

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = parseCryptoError(error);

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === retryConfig.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, attempt - 1),
        retryConfig.maxDelay
      );

      // Notify about retry
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      console.log(`Retry attempt ${attempt}/${retryConfig.maxAttempts} after ${delay}ms`);

      // Wait before retry
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Execute with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new CryptoError('Operation timed out', ErrorCodes.TIMEOUT, null, true)
          ),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Safe execution wrapper with error handling and retry
 */
export async function safeExecute<T>(
  fn: () => Promise<T>,
  options: {
    retry?: Partial<RetryConfig>;
    timeout?: number;
    onError?: (error: CryptoError) => void;
    onRetry?: (attempt: number, error: CryptoError) => void;
  } = {}
): Promise<{ success: boolean; data?: T; error?: CryptoError }> {
  try {
    const executeWithTimeout = options.timeout
      ? () => withTimeout(fn, options.timeout)
      : fn;

    const data = await withRetry(executeWithTimeout, options.retry, options.onRetry);

    return { success: true, data };
  } catch (error: unknown) {
    const cryptoError = error instanceof CryptoError ? error : parseCryptoError(error);

    if (options.onError) {
      options.onError(cryptoError);
    }

    return { success: false, error: cryptoError };
  }
}

/**
 * Check if error is user rejection
 */
export function isUserRejection(error: unknown): boolean {
  const cryptoError = error instanceof CryptoError ? error : parseCryptoError(error);
  return cryptoError.code === ErrorCodes.USER_REJECTED;
}

/**
 * Check if error is retryable
 */
export function isRetryable(error: unknown): boolean {
  const cryptoError = error instanceof CryptoError ? error : parseCryptoError(error);
  return cryptoError.retryable;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): string {
  const cryptoError = error instanceof CryptoError ? error : parseCryptoError(error);

  const messages: Record<string, string> = {
    [ErrorCodes.USER_REJECTED]: 'You cancelled the transaction',
    [ErrorCodes.INSUFFICIENT_FUNDS]: 'Insufficient funds in your wallet',
    [ErrorCodes.NETWORK_ERROR]: 'Network error - please check your connection and try again',
    [ErrorCodes.CONTRACT_ERROR]: 'Transaction failed - contract error',
    [ErrorCodes.TIMEOUT]: 'Request timed out - please try again',
    [ErrorCodes.INVALID_INPUT]: 'Invalid input - please check your entries',
    [ErrorCodes.WALLET_NOT_CONNECTED]: 'Please connect your wallet first',
    [ErrorCodes.RATE_LIMIT]: 'Too many requests - please wait a moment',
    [ErrorCodes.GAS_TOO_HIGH]: 'Gas price is too high - try again later',
  };

  return messages[cryptoError.code] || cryptoError.message || 'An unexpected error occurred';
}

/**
 * React hook for error handling
 */
export function useCryptoError() {
  const [error, setError] = React.useState<CryptoError | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleError = React.useCallback((err: unknown) => {
    const cryptoError = err instanceof CryptoError ? err : parseCryptoError(err);
    setError(cryptoError);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const retry = React.useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      setIsRetrying(true);
      setError(null);

      try {
        const result = await withRetry(fn, {}, (attempt, retryError) => {
          console.log(`Retry attempt ${attempt}:`, retryError.message);
        });
        return result;
      } catch (err: unknown) {
        handleError(err);
        return null;
      } finally {
        setIsRetrying(false);
      }
    },
    [handleError]
  );

  return {
    error,
    isRetrying,
    errorMessage: error ? formatErrorForUser(error) : null,
    isUserRejection: error ? isUserRejection(error) : false,
    isRetryable: error ? isRetryable(error) : false,
    handleError,
    clearError,
    retry,
  };
}

/**
 * Circuit breaker pattern for failing operations
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private resetTimeMs: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    if (
      this.state === 'OPEN' &&
      Date.now() - this.lastFailureTime > this.resetTimeMs
    ) {
      this.state = 'HALF_OPEN';
      this.failures = 0;
    }

    // Reject if circuit is open
    if (this.state === 'OPEN') {
      throw new CryptoError(
        'Service temporarily unavailable - too many failures',
        ErrorCodes.NETWORK_ERROR,
        null,
        true
      );
    }

    try {
      const result = await fn();
      
      // Reset on success
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      // Open circuit if threshold reached
      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
        console.warn(`Circuit breaker opened after ${this.failures} failures`);
      }

      throw error;
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}

// Helper: Sleep function
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// For React hook
import * as React from 'react';
