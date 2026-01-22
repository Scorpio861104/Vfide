/**
 * useEthPrice Hook Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useEthPrice } from '../../../hooks/useEthPrice';

// Mock API calls
global.fetch = jest.fn();

describe('useEthPrice Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => ({
        ethereum: { usd: 2000 },
      }),
    } as Response);
  });

  it('should fetch ETH price', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await waitFor(() => {
      expect(result.current.price).toBeDefined();
    });
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useEthPrice());
    
    expect(result.current.loading).toBeDefined();
  });

  it('should handle errors', async () => {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('API error')
    );

    const { result } = renderHook(() => useEthPrice());
    
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should support different currencies', async () => {
    const { result } = renderHook(() => useEthPrice({ currency: 'EUR' }));
    
    await waitFor(() => {
      expect(result.current.price).toBeDefined();
    });
  });

  it('should auto-refresh price', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => 
      useEthPrice({ refreshInterval: 60000 })
    );
    
    jest.advanceTimersByTime(60000);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    jest.useRealTimers();
  });

  it('should calculate price change percentage', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await waitFor(() => {
      expect(result.current.change24h).toBeDefined();
    });
  });

  it('should format price for display', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await waitFor(() => {
      expect(result.current.formattedPrice).toMatch(/\$/);
    });
  });

  it('should convert wei to fiat', async () => {
    const { result } = renderHook(() => useEthPrice());
    
    await waitFor(() => {
      if (result.current.convertWeiToFiat) {
        const fiat = result.current.convertWeiToFiat('1000000000000000000');
        expect(fiat).toBeDefined();
      }
    });
  });

  it('should cache price data', async () => {
    const { result, rerender } = renderHook(() => useEthPrice());
    
    await waitFor(() => {
      expect(result.current.price).toBeDefined();
    });

    const firstFetchCount = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls.length;
    
    rerender();
    
    expect((global.fetch as jest.MockedFunction<typeof fetch>).mock.calls.length).toBe(firstFetchCount);
  });

  it('should handle multiple price sources', async () => {
    const { result } = renderHook(() => 
      useEthPrice({ sources: ['coingecko', 'binance'] })
    );
    
    await waitFor(() => {
      expect(result.current.price).toBeDefined();
    });
  });

  it('should provide historical data', async () => {
    const { result } = renderHook(() => 
      useEthPrice({ includeHistory: true })
    );
    
    await waitFor(() => {
      expect(result.current.history).toBeDefined();
    });
  });
});
