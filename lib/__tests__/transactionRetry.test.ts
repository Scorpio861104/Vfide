/**
 * @jest-environment node
 */
import {
  retryTransaction,
  retryRead,
  isUserRejection,
  isNetworkError,
  isGasError,
} from '../transactionRetry';

// Mock the logger
jest.mock('../logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('transactionRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isUserRejection', () => {
    it('returns true for user rejected errors', () => {
      expect(isUserRejection(new Error('User rejected the request'))).toBe(true);
      expect(isUserRejection(new Error('user denied transaction'))).toBe(true);
      expect(isUserRejection(new Error('User cancelled'))).toBe(true);
      expect(isUserRejection(new Error('Rejected by user'))).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isUserRejection(new Error('Network error'))).toBe(false);
      expect(isUserRejection(new Error('Gas estimation failed'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isUserRejection('string error')).toBe(false);
      expect(isUserRejection(null)).toBe(false);
      expect(isUserRejection(undefined)).toBe(false);
      expect(isUserRejection(42)).toBe(false);
    });
  });

  describe('isNetworkError', () => {
    it('returns true for network errors', () => {
      expect(isNetworkError(new Error('Network error occurred'))).toBe(true);
      expect(isNetworkError(new Error('Request timeout'))).toBe(true);
      expect(isNetworkError(new Error('Fetch failed'))).toBe(true);
      expect(isNetworkError(new Error('RPC error'))).toBe(true);
      expect(isNetworkError(new Error('Connection failed'))).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isNetworkError(new Error('User rejected'))).toBe(false);
      expect(isNetworkError(new Error('Out of gas'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isNetworkError('string error')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('isGasError', () => {
    it('returns true for gas errors', () => {
      expect(isGasError(new Error('Gas estimation failed'))).toBe(true);
      expect(isGasError(new Error('Out of gas'))).toBe(true);
      expect(isGasError(new Error('Insufficient funds for gas'))).toBe(true);
    });

    it('returns false for other errors', () => {
      expect(isGasError(new Error('User rejected'))).toBe(false);
      expect(isGasError(new Error('Network error'))).toBe(false);
    });

    it('returns false for non-Error values', () => {
      expect(isGasError('string error')).toBe(false);
      expect(isGasError(null)).toBe(false);
    });
  });

  describe('retryTransaction', () => {
    it('returns result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryTransaction(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on failure and succeeds', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const result = await retryTransaction(operation, {
        initialDelay: 1, // Use minimal delay for tests
      });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('throws after max attempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        retryTransaction(operation, { maxAttempts: 2, initialDelay: 1 })
      ).rejects.toThrow('Network error');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('does not retry user rejections', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('User rejected the request'));

      await expect(retryTransaction(operation)).rejects.toThrow('User rejected the request');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('respects custom shouldRetry function', async () => {
      const shouldRetry = jest.fn().mockReturnValue(false);
      const operation = jest.fn().mockRejectedValue(new Error('Custom error'));

      await expect(
        retryTransaction(operation, { shouldRetry })
      ).rejects.toThrow('Custom error');
      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalled();
    });
  });

  describe('retryRead', () => {
    it('returns result on first success', async () => {
      const operation = jest.fn().mockResolvedValue('data');

      const result = await retryRead(operation);

      expect(result).toBe('data');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('retries on failure with more aggressive settings', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('data');

      const result = await retryRead(operation, { initialDelay: 1 });

      expect(result).toBe('data');
      expect(operation).toHaveBeenCalledTimes(2);
    });
  });
});
