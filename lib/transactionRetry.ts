/**
 * Transaction retry logic with exponential backoff
 * Improves error recovery for failed transactions
 */

import { logger } from './logger';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

/**
 * Check if an error is a user rejection
 */
export function isUserRejection(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('user rejected') ||
    message.includes('user denied') ||
    message.includes('user cancelled') ||
    message.includes('rejected by user')
  );
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  shouldRetry: (error: unknown) => {
    // Don't retry user rejections
    return !isUserRejection(error);
  },
};

/**
 * Wait for specified milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(exponentialDelay, maxDelay);
}

/**
 * Retry a transaction with exponential backoff
 * 
 * @example
 * ```typescript
 * const result = await retryTransaction(
 *   async () => {
 *     return await writeContract({
 *       address: contractAddress,
 *       abi: contractABI,
 *       functionName: 'transfer',
 *       args: [to, amount]
 *     });
 *   },
 *   {
 *     maxAttempts: 3,
 *     initialDelay: 1000,
 *   }
 * );
 * ```
 */
export async function retryTransaction<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      logger.debug('Attempting transaction', { attempt, maxAttempts: opts.maxAttempts });
      const result = await operation();
      
      if (attempt > 1) {
        logger.info('Transaction succeeded after retry', { attempt });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (!opts.shouldRetry(error)) {
        logger.debug('Transaction error is not retryable', { error });
        throw error;
      }

      // Don't retry if this was the last attempt
      if (attempt === opts.maxAttempts) {
        logger.error('Transaction failed after all retry attempts', error, {
          attempts: opts.maxAttempts,
        });
        break;
      }

      // Calculate delay and wait before next attempt
      const delayMs = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );
      
      logger.warn('Transaction failed, retrying...', {
        attempt,
        maxAttempts: opts.maxAttempts,
        delayMs,
        error: error instanceof Error ? error.message : String(error),
      });

      await delay(delayMs);
    }
  }

  // All attempts failed
  throw lastError;
}

/**
 * Retry a blockchain read operation (no gas cost)
 * More aggressive retry for reads since they're free
 */
export async function retryRead<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryTransaction(operation, {
    maxAttempts: 5,
    initialDelay: 500,
    maxDelay: 5000,
    ...options,
  });
}

/**
 * Check if an error is a network/RPC error that can be retried
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('fetch') ||
    message.includes('rpc') ||
    message.includes('connection')
  );
}

/**
 * Check if an error is a gas estimation error
 */
export function isGasError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('gas') ||
    message.includes('out of gas') ||
    message.includes('insufficient funds')
  );
}
