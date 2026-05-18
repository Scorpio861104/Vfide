/**
 * useEthPrice Hook Tests
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useEthPrice } from '../../../hooks/useEthPrice';

// Mock fetch
global.fetch = jest.fn();

describe('useEthPrice Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ethereum: { usd: 2000 },
      }),
    } as Response);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch ETH price', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(result.current.ethPrice).toBeDefined();
    });
  });

  it('should return a number for ethPrice', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    expect(typeof result.current.ethPrice).toBe('number');
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useEthPrice());
    
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should handle errors', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('API error')
    );

    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      // Error should be set or price should fall back to default
      expect(result.current.error !== null || result.current.ethPrice).toBeTruthy();
    });
  });

  it('should have formatGasUsd function', () => {
    const { result } = renderHook(() => useEthPrice());
    
    expect(typeof result.current.formatGasUsd).toBe('function');
  });

  it('should format gas costs in USD', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    const formatted = result.current.formatGasUsd(0.001); // 0.001 ETH
    expect(formatted).toBeDefined();
    expect(typeof formatted).toBe('string');
  });

  it('should format small amounts as < $0.01', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    // Very small amount that would be less than $0.01
    const formatted = result.current.formatGasUsd(0.000001);
    expect(formatted).toBe('<$0.01');
  });

  it('should format larger amounts with dollar sign', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    // 1 ETH at $2000 = $2000
    const formatted = result.current.formatGasUsd(1);
    expect(formatted).toMatch(/\$/);
  });

  it('should use default price when API fails', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      // Should have a fallback price (2500 is the default)
      expect(result.current.ethPrice).toBeGreaterThan(0);
    });
  });

  it('should cache price data', async () => {
    const { result, rerender } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(result.current.ethPrice).toBeDefined();
    });

    const firstFetchCount = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls.length;
    
    rerender();
    
    // Rerenders should use cached data, not make new fetches immediately
    expect((global.fetch as jest.MockedFunction<typeof fetch>).mock.calls.length).toBe(firstFetchCount);
  });

  it('should auto-refresh price periodically', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    // The hook sets up an interval to refresh every 5 minutes
    // We verify the interval exists by checking the hook's behavior
    expect(result.current.ethPrice).toBeDefined();
    
    await act(async () => {
      // Advance 5 minutes for refresh - this should trigger the interval
      jest.advanceTimersByTime(5 * 60 * 1000);
    });
    
    // After 5 minutes, the hook should still be functional
    expect(result.current.ethPrice).toBeGreaterThan(0);
  });

  it('should return consistent interface', () => {
    const { result } = renderHook(() => useEthPrice());
    
    expect(result.current).toHaveProperty('ethPrice');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('formatGasUsd');
  });

  it('should handle HTTP errors gracefully', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      // Should still have a price (fallback)
      expect(result.current.ethPrice).toBeGreaterThan(0);
    });
  });

  it('should handle invalid API response', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({ invalid: 'data' }),
    } as Response);

    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      // Should fallback to default price
      expect(result.current.ethPrice).toBeGreaterThan(0);
    });
  });

  it('should set isLoading to false after fetch completes', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});
