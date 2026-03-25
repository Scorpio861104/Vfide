/**
 * Centralized Error Handling Utilities
 * Provides consistent error handling and user-friendly messages
 */

import { BaseError, ContractFunctionRevertedError } from 'viem';
import { logger } from '@/lib/logger';

export interface ParsedError {
  message: string;
  code?: string;
  details?: string;
  userMessage: string;
}

/**
 * Parse contract errors into user-friendly messages
 * @param error - Error from contract call
 * @returns Parsed error with user-friendly message
 */
export function parseContractError(error: unknown): ParsedError {
  // Handle undefined/null
  if (!error) {
    return {
      message: 'Unknown error',
      userMessage: 'Transaction failed',
    };
  }

  // Handle viem errors
  const hasViemErrors = typeof BaseError === 'function' && typeof ContractFunctionRevertedError === 'function';
  if (hasViemErrors && error instanceof BaseError) {
    const baseError = error as BaseError;
    const revertError = baseError.walk((err) => err instanceof ContractFunctionRevertedError);

    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName ?? '';
      const args = revertError.data?.args ?? [];

      // Common contract error patterns
      const errorMessages: Record<string, string> = {
        Unauthorized: 'You are not authorized to perform this action',
        NotOwner: 'Only the owner can perform this action',
        InsufficientBalance: 'Insufficient balance to complete this transaction',
        AlreadyExists: 'This item already exists',
        NotFound: 'The requested item was not found',
        Expired: 'This operation has expired',
        Paused: 'This contract is currently paused',
        InvalidAddress: 'Invalid address provided',
        InvalidAmount: 'Invalid amount provided',
        TransferFailed: 'Token transfer failed',
        ApprovalFailed: 'Token approval failed',
        RecoveryActive: 'Cannot perform this action during active recovery',
        VaultLocked: 'Vault is currently locked',
        GuardianNotMature: 'Guardian has not passed the maturity period',
        QuorumNotMet: 'Quorum not met for this proposal',
        AlreadyVoted: 'You have already voted on this proposal',
        ProposalNotActive: 'This proposal is not active',
      };

      const userMessage = errorMessages[errorName] || `Contract error: ${errorName}`;

      return {
        message: revertError.message,
        code: errorName,
        details: args.length > 0 ? JSON.stringify(args) : undefined,
        userMessage,
      };
    }
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Contract/library short codes (used heavily in tests and UI)
    const uvMap: Record<string, string> = {
      UV_RecoveryActive: 'Cannot modify guardians during active recovery',
      UV_Locked: 'Vault is currently locked',
      UV_NotOwner: 'Only vault owner can modify guardians',
    };

    const uvMapped = uvMap[error.message as keyof typeof uvMap];
    if (uvMapped) {
      return {
        message: error.message,
        code: error.message,
        userMessage: uvMapped,
      };
    }
    
    // User rejected transaction
    if (message.includes('user rejected') || message.includes('user denied')) {
      return {
        message: error.message,
        code: 'USER_REJECTED',
        userMessage: error.message,
      };
    }
    
    // Insufficient funds for gas
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return {
        message: error.message,
        code: 'INSUFFICIENT_FUNDS',
        userMessage: 'Insufficient ETH for gas fees. Please add ETH to your wallet.',
      };
    }
    
    // Wrong network
    if (message.includes('chain') && (message.includes('wrong') || message.includes('unsupported') || message.includes('mismatch'))) {
      return {
        message: error.message,
        code: 'WRONG_NETWORK',
        userMessage: 'Please switch to the correct network in your wallet',
      };
    }
    
    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
      return {
        message: error.message,
        code: 'NETWORK_ERROR',
        userMessage: 'Network error. Please check your connection and try again.',
      };
    }
    
    // Gas estimation failed
    if (message.includes('gas') && message.includes('estimate')) {
      return {
        message: error.message,
        code: 'GAS_ESTIMATION_FAILED',
        userMessage: 'Transaction would fail. Please check your input and try again.',
      };
    }
    
    // Return generic error message
    return {
      message: error.message,
      userMessage: error.message.length > 100 
        ? 'Transaction failed. Please try again.'
        : error.message,
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      userMessage: 'Transaction failed',
    };
  }

  // Fallback for unknown error types
  return {
    message: String(error),
    userMessage: 'Transaction failed',
  };
}

/**
 * Async wrapper with error handling
 * @param fn - Async function to wrap
 * @param errorMessage - Custom error message
 * @returns Result with success flag and data/error
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorMessage = 'Operation failed'
): Promise<{ success: true; data: T } | { success: false; error: ParsedError }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    const parsedError = parseContractError(error);
    parsedError.userMessage = errorMessage + ': ' + parsedError.userMessage;
    return { success: false, error: parsedError };
  }
}

/**
 * Log error to console in development
 * @param context - Context where error occurred
 * @param error - Error to log
 */
export function logError(context: string, error: unknown): void {
  if (process.env.NODE_ENV === 'development') {
    logger.error(`[${context}]`, error);
  }
}

/**
 * Create error boundary error handler
 * @param error - Error from error boundary
 * @param errorInfo - React error info
 * @returns User-friendly error message
 */
export function handleErrorBoundary(error: Error, errorInfo: { componentStack: string }): string {
  logError('ErrorBoundary', { error, errorInfo });
  
  // Check for common React errors
  if (error.message.includes('Hydration')) {
    return 'There was a hydration error. Please refresh the page.';
  }
  
  if (error.message.includes('Cannot read property') || error.message.includes('undefined')) {
    return 'A component error occurred. Please refresh the page.';
  }
  
  return 'An unexpected error occurred. Please refresh the page.';
}

/**
 * Safe async operation with retry logic
 * @param fn - Function to retry
 * @param maxRetries - Maximum retry attempts
 * @param delay - Delay between retries in ms
 * @returns Result of operation
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry user rejections
      const parsed = parseContractError(error);
      if (parsed.code === 'USER_REJECTED') {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Type guard to check if error is a known contract error
 * @param error - Error to check
 * @returns True if contract error
 */
export function isContractError(error: unknown): error is BaseError {
  return typeof BaseError === 'function' && error instanceof BaseError;
}

/**
 * Extract error code from error
 * @param error - Error to extract from
 * @returns Error code or undefined
 */
export function getErrorCode(error: unknown): string | undefined {
  return parseContractError(error).code;
}

/**
 * Check if error is user rejection
 * @param error - Error to check
 * @returns True if user rejected
 */
export function isUserRejection(error: unknown): boolean {
  return getErrorCode(error) === 'USER_REJECTED';
}

/**
 * Check if error is network related
 * @param error - Error to check
 * @returns True if network error
 */
export function isNetworkError(error: unknown): boolean {
  const code = getErrorCode(error);
  return code === 'NETWORK_ERROR' || code === 'WRONG_NETWORK';
}
