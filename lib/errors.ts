/**
 * Error Handling Utilities
 * H-4 Fix: Centralized error handling with proper logging and user feedback
 * 
 * This module provides utilities for handling errors in async operations,
 * contract interactions, and data fetching with consistent error messages.
 */

import { devLog } from './utils';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

export interface AppError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  originalError?: Error;
  timestamp: Date;
}

/**
 * Custom error class for application errors
 */
export class CustomError extends Error implements AppError {
  code: string;
  severity: ErrorSeverity;
  context?: Record<string, unknown>;
  originalError?: Error;
  timestamp: Date;

  constructor(
    code: string,
    message: string,
    severity: ErrorSeverity = 'error',
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'CustomError';
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date();
    
    // Maintain proper prototype chain
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

/**
 * Parse a contract error to a user-friendly message
 * H-4 Fix: Handles common contract error patterns
 */
export function parseContractError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Common contract errors
    if (message.includes('insufficient balance')) return 'Insufficient balance';
    if (message.includes('insufficient allowance')) return 'Token approval required';
    if (message.includes('execution reverted')) return 'Transaction reverted - check contract state';
    if (message.includes('user rejected')) return 'Transaction rejected by user';
    if (message.includes('transaction failed')) return 'Transaction failed - please try again';
    if (message.includes('gas')) return 'Gas estimation failed - check parameters';
    if (message.includes('nonce')) return 'Transaction nonce error - please refresh and try again';
    if (message.includes('invalid address')) return 'Invalid address provided';
    if (message.includes('timeout')) return 'Request timed out - please try again';
    
    return error.message;
  }
  
  return 'An unknown error occurred';
}

/**
 * Safe async operation wrapper with error handling
 * H-4 Fix: Catches and logs all async errors consistently
 * 
 * @param operation - Async function to execute
 * @param context - Context information for error logging
 * @param fallback - Optional fallback value on error
 * @returns Result of operation or fallback
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: { name: string; metadata?: Record<string, unknown> } = { name: 'unknown' },
  fallback?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    devLog.error(
      `[${context.name}] Async operation failed: ${message}`,
      context.metadata
    );
    return fallback;
  }
}

/**
 * Safe async operation with retry logic
 * H-4 Fix: Implements exponential backoff retry strategy
 * 
 * @param operation - Async function to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delayMs - Initial delay in milliseconds (default: 100)
 * @param context - Context information for error logging
 * @returns Result of operation
 * @throws CustomError if all retries fail
 */
export async function safeAsyncWithRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100,
  context: { name: string; metadata?: Record<string, unknown> } = { name: 'unknown' }
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Exponential backoff: wait 100ms, 200ms, 400ms, etc.
        const waitTime = delayMs * Math.pow(2, attempt);
        devLog.warn(
          `[${context.name}] Retry ${attempt + 1}/${maxRetries} after ${waitTime}ms`,
          context.metadata
        );
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new CustomError(
    'ASYNC_MAX_RETRIES_EXCEEDED',
    `${context.name}: Failed after ${maxRetries + 1} attempts - ${lastError?.message}`,
    'error',
    context.metadata,
    lastError
  );
}

/**
 * Handle errors in event listeners and callbacks
 * H-4 Fix: Catches errors that might otherwise fail silently
 * 
 * @param handler - Function to execute
 * @param context - Context information for error logging
 * @returns Wrapped function that catches errors
 */
export function safeEventHandler<T extends (...args: unknown[]) => void | Promise<void>>(
  handler: T,
  context: { name: string; metadata?: Record<string, unknown> } = { name: 'unknown' }
): T {
  return (async (...args: unknown[]) => {
    try {
      const result = handler(...args);
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      devLog.error(
        `[${context.name}] Event handler error: ${message}`,
        { ...context.metadata, args }
      );
    }
  }) as T;
}

/**
 * Create a loading state with timeout protection
 * H-4 Fix: Prevents infinite loading states
 * 
 * @param timeoutMs - Timeout in milliseconds (default: 30000ms = 30 seconds)
 * @param context - Context information for error logging
 * @returns Abort controller
 */
export function createLoadingTimeout(
  timeoutMs: number = 30000,
  context: { name: string; metadata?: Record<string, unknown> } = { name: 'unknown' }
): {
  controller: AbortController;
  cancel: () => void;
  onTimeout: (callback: () => void) => void;
} {
  const controller = new AbortController();
  const timeoutHandle: NodeJS.Timeout | null = null;
  let timeoutCallback: (() => void) | null = null;

  const timeout = setTimeout(() => {
    controller.abort();
    if (timeoutCallback) {
      timeoutCallback();
    }
    devLog.warn(
      `[${context.name}] Loading timeout after ${timeoutMs}ms`,
      context.metadata
    );
  }, timeoutMs);

  return {
    controller,
    cancel: () => {
      if (timeoutHandle || timeout) {
        clearTimeout(timeoutHandle || timeout);
      }
    },
    onTimeout: (callback: () => void) => {
      timeoutCallback = callback;
    },
  };
}

/**
 * Validate required fields and throw if missing
 * H-4 Fix: Prevents operations with incomplete data
 * 
 * @param data - Object to validate
 * @param requiredFields - Array of required field names
 * @param context - Context information for error logging
 * @throws CustomError if required fields are missing
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[],
  context: { name: string; metadata?: Record<string, unknown> } = { name: 'unknown' }
): void {
  const missing = requiredFields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    throw new CustomError(
      'MISSING_REQUIRED_FIELDS',
      `${context.name}: Missing required fields: ${missing.join(', ')}`,
      'error',
      { ...context.metadata, missing, data }
    );
  }
}

/**
 * Format error for user display
 * H-4 Fix: Provides consistent, user-friendly error messages
 */
export function formatErrorForUser(error: unknown, defaultMessage = 'Something went wrong'): string {
  if (error instanceof CustomError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    // Extract relevant parts of error message
    if (error.message.includes('Network')) return 'Network error - check your connection';
    if (error.message.includes('timeout')) return 'Request timed out - please try again';
    return error.message;
  }
  
  return defaultMessage;
}

/**
 * Log error with full context (for debugging)
 * H-4 Fix: Centralized error logging
 */
export function logError(error: unknown, context: Record<string, unknown> = {}): void {
  if (error instanceof CustomError) {
    devLog.error(error.message, {
      code: error.code,
      severity: error.severity,
      context: error.context,
      ...context,
    });
  } else if (error instanceof Error) {
    devLog.error(error.message, {
      stack: error.stack,
      ...context,
    });
  } else {
    devLog.error(String(error), context);
  }
}
