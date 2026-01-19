/**
 * Tests for transaction retry logic
 */

import { 
  retryTransaction, 
  retryRead,
  isNetworkError,
  isGasError,
  isUserRejection 
} from '../transactionRetry';

describe('transactionRetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('retryTransaction', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await retryTransaction(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const promise = retryTransaction(operation, { initialDelay: 100 });
      
      // Fast-forward through delays
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect maxAttempts', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Always fails'));

      const promise = retryTransaction(operation, { 
        maxAttempts: 3,
        initialDelay: 100 
      });

      await jest.runAllTimersAsync();
      await expect(promise).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on user rejection', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('User rejected transaction'));

      await expect(retryTransaction(operation)).rejects.toThrow('User rejected');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));
      const delays: number[] = [];

      // Mock setTimeout to capture delays
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((cb, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(cb, 0);
      }) as any;

      const promise = retryTransaction(operation, {
        maxAttempts: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
      });

      await jest.runAllTimersAsync();
      await promise.catch(() => {});

      // First retry: 1000ms, Second retry: 2000ms
      expect(delays).toEqual([1000, 2000]);

      global.setTimeout = originalSetTimeout;
    });

    it('should respect maxDelay', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Fail'));
      const delays: number[] = [];

      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((cb, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(cb, 0);
      }) as any;

      const promise = retryTransaction(operation, {
        maxAttempts: 4,
        initialDelay: 1000,
        backoffMultiplier: 3,
        maxDelay: 5000,
      });

      await jest.runAllTimersAsync();
      await promise.catch(() => {});

      // Delays should be capped at maxDelay
      // 1000, 3000, 5000 (capped from 9000)
      expect(delays).toEqual([1000, 3000, 5000]);

      global.setTimeout = originalSetTimeout;
    });

    it('should use custom shouldRetry function', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Custom error'));
      
      const shouldRetry = jest.fn().mockReturnValue(false);

      await expect(
        retryTransaction(operation, { shouldRetry })
      ).rejects.toThrow('Custom error');

      expect(operation).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('retryRead', () => {
    it('should use more aggressive retry settings', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('success');

      const promise = retryRead(operation);
      await jest.runAllTimersAsync();
      const result = await promise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(4);
    });
  });

  describe('error detection utilities', () => {
    describe('isNetworkError', () => {
      it('should detect network errors', () => {
        expect(isNetworkError(new Error('Network request failed'))).toBe(true);
        expect(isNetworkError(new Error('Connection timeout'))).toBe(true);
        expect(isNetworkError(new Error('RPC error'))).toBe(true);
        expect(isNetworkError(new Error('fetch failed'))).toBe(true);
      });

      it('should return false for non-network errors', () => {
        expect(isNetworkError(new Error('User rejected'))).toBe(false);
        expect(isNetworkError(new Error('Invalid input'))).toBe(false);
        expect(isNetworkError('not an error object')).toBe(false);
      });
    });

    describe('isGasError', () => {
      it('should detect gas-related errors', () => {
        expect(isGasError(new Error('Insufficient gas'))).toBe(true);
        expect(isGasError(new Error('Out of gas'))).toBe(true);
        expect(isGasError(new Error('Insufficient funds for gas'))).toBe(true);
      });

      it('should return false for non-gas errors', () => {
        expect(isGasError(new Error('User rejected'))).toBe(false);
        expect(isGasError(new Error('Network error'))).toBe(false);
      });
    });

    describe('isUserRejection', () => {
      it('should detect user rejection errors', () => {
        expect(isUserRejection(new Error('User rejected transaction'))).toBe(true);
        expect(isUserRejection(new Error('User denied transaction'))).toBe(true);
        expect(isUserRejection(new Error('Transaction cancelled by user'))).toBe(true);
        expect(isUserRejection(new Error('Rejected by user'))).toBe(true);
      });

      it('should return false for non-rejection errors', () => {
        expect(isUserRejection(new Error('Network error'))).toBe(false);
        expect(isUserRejection(new Error('Gas error'))).toBe(false);
      });
    });
  });
});
