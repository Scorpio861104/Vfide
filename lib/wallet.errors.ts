/**
 * Wallet Error Types
 * 
 * Specific error classes for wallet operations
 * Enables better error handling and user messaging
 */

/**
 * Base class for all wallet-related errors
 */
export class WalletError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'WalletError';
    Object.setPrototypeOf(this, WalletError.prototype);
  }

  getUserMessage(): string {
    return this.userMessage || this.message;
  }
}

/**
 * Connection-related errors
 */
export class WalletConnectionError extends WalletError {
  constructor(message: string, userMessage?: string) {
    super(message, 'WALLET_CONNECTION_ERROR', userMessage);
    this.name = 'WalletConnectionError';
    Object.setPrototypeOf(this, WalletConnectionError.prototype);
  }
}

/**
 * Network/chain-related errors
 */
export class WalletNetworkError extends WalletError {
  constructor(
    message: string,
    public expectedChainId?: number,
    public actualChainId?: number,
    userMessage?: string
  ) {
    super(message, 'WALLET_NETWORK_ERROR', userMessage);
    this.name = 'WalletNetworkError';
    Object.setPrototypeOf(this, WalletNetworkError.prototype);
  }
}

/**
 * Transaction-related errors
 */
export class WalletTransactionError extends WalletError {
  constructor(
    message: string,
    public txHash?: string,
    public reason?: string,
    userMessage?: string
  ) {
    super(message, 'WALLET_TRANSACTION_ERROR', userMessage);
    this.name = 'WalletTransactionError';
    Object.setPrototypeOf(this, WalletTransactionError.prototype);
  }
}

/**
 * Balance/funds-related errors
 */
export class WalletBalanceError extends WalletError {
  constructor(
    message: string,
    public required?: string,
    public available?: string,
    userMessage?: string
  ) {
    super(message, 'WALLET_BALANCE_ERROR', userMessage);
    this.name = 'WalletBalanceError';
    Object.setPrototypeOf(this, WalletBalanceError.prototype);
  }
}

/**
 * Storage/persistence errors
 */
export class WalletStorageError extends WalletError {
  constructor(message: string, public operation?: 'read' | 'write' | 'delete', userMessage?: string) {
    super(message, 'WALLET_STORAGE_ERROR', userMessage);
    this.name = 'WalletStorageError';
    Object.setPrototypeOf(this, WalletStorageError.prototype);
  }
}

/**
 * User rejection errors (user cancelled)
 */
export class WalletUserRejectionError extends WalletError {
  constructor(message: string = 'User rejected the request', userMessage?: string) {
    super(message, 'WALLET_USER_REJECTION', userMessage);
    this.name = 'WalletUserRejectionError';
    Object.setPrototypeOf(this, WalletUserRejectionError.prototype);
  }
}

/**
 * Provider not found errors
 */
export class WalletProviderError extends WalletError {
  constructor(message: string = 'Ethereum provider not found', userMessage?: string) {
    super(message, 'WALLET_PROVIDER_ERROR', userMessage);
    this.name = 'WalletProviderError';
    Object.setPrototypeOf(this, WalletProviderError.prototype);
  }
}

/**
 * Type guard to check if error is a WalletError
 */
export function isWalletError(error: unknown): error is WalletError {
  return error instanceof WalletError;
}

/**
 * Type guard for connection errors
 */
export function isConnectionError(error: unknown): error is WalletConnectionError {
  return error instanceof WalletConnectionError;
}

/**
 * Type guard for network errors
 */
export function isNetworkError(error: unknown): error is WalletNetworkError {
  return error instanceof WalletNetworkError;
}

/**
 * Type guard for transaction errors
 */
export function isTransactionError(error: unknown): error is WalletTransactionError {
  return error instanceof WalletTransactionError;
}

/**
 * Type guard for user rejection
 */
export function isUserRejection(error: unknown): error is WalletUserRejectionError {
  return error instanceof WalletUserRejectionError;
}

/**
 * Get user-friendly error message from any error
 */
export function getWalletErrorMessage(error: unknown): string {
  if (isWalletError(error)) {
    return error.getUserMessage();
  }

  if (error instanceof Error) {
    // Check for common error patterns
    if (error.message.includes('user rejected') || error.message.includes('User denied')) {
      return 'You cancelled the request';
    }
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds to complete this transaction';
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection and try again';
    }
    
    return error.message;
  }

  return 'An unknown error occurred';
}

/**
 * Create appropriate WalletError from generic error
 */
export function toWalletError(error: unknown): WalletError {
  if (isWalletError(error)) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('user rejected') || message.includes('user denied')) {
      return new WalletUserRejectionError(error.message, 'You cancelled the request');
    }

    if (message.includes('insufficient funds')) {
      return new WalletBalanceError(error.message, undefined, undefined, 'Insufficient funds');
    }

    if (message.includes('network') || message.includes('chain')) {
      return new WalletNetworkError(error.message, undefined, undefined, 'Network connection issue');
    }

    if (message.includes('transaction') || message.includes('tx')) {
      return new WalletTransactionError(error.message, undefined, undefined, 'Transaction failed');
    }

    return new WalletError(error.message, 'UNKNOWN_ERROR', 'An error occurred');
  }

  return new WalletError('Unknown error', 'UNKNOWN_ERROR', 'An unexpected error occurred');
}
