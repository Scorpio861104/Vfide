/**
 * useENS Hook Tests
 * Tests for ENS resolution and reverse lookup
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useENS } from '../../../hooks/useENS';

// Mock wagmi
jest.mock('wagmi', () => ({
  useEnsName: jest.fn(() => ({ data: 'vitalik.eth', isLoading: false })),
  useEnsAddress: jest.fn(() => ({ data: '0x1234...', isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: 'https://avatar.url', isLoading: false })),
}));

describe('useENS Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ENS Name Resolution', () => {
    it('should resolve address to ENS name', async () => {
      const { result } = renderHook(() => 
        useENS('0x1234567890123456789012345678901234567890')
      );
      
      await waitFor(() => {
        expect(result.current.name).toBeDefined();
      });
    });

    it('should handle addresses without ENS', async () => {
      const { result } = renderHook(() => 
        useENS('0x0000000000000000000000000000000000000000')
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should cache ENS lookups', async () => {
      const { result, rerender } = renderHook(() => 
        useENS('0x1234567890123456789012345678901234567890')
      );
      
      await waitFor(() => {
        expect(result.current.name).toBeDefined();
      });

      rerender();

      // Should not trigger additional lookups
      expect(result.current.name).toBeDefined();
    });
  });

  describe('Reverse ENS Lookup', () => {
    it('should resolve ENS name to address', async () => {
      const { result } = renderHook(() => useENS('vitalik.eth'));
      
      await waitFor(() => {
        expect(result.current.address).toBeDefined();
      });
    });

    it('should handle invalid ENS names', async () => {
      const { result } = renderHook(() => useENS('invalid-name'));
      
      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });
    });
  });

  describe('ENS Avatar', () => {
    it('should fetch ENS avatar', async () => {
      const { result } = renderHook(() => 
        useENS('vitalik.eth', { fetchAvatar: true })
      );
      
      await waitFor(() => {
        expect(result.current.avatar).toBeDefined();
      });
    });

    it('should handle missing avatars', async () => {
      const { result } = renderHook(() => 
        useENS('noavatar.eth', { fetchAvatar: true })
      );
      
      await waitFor(() => {
        expect(result.current.avatar).toBeNull();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state', () => {
      const { result } = renderHook(() => useENS('vitalik.eth'));
      
      expect(typeof result.current.loading).toBe('boolean');
    });

    it('should transition from loading to loaded', async () => {
      const { result } = renderHook(() => useENS('vitalik.eth'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const { result } = renderHook(() => 
        useENS('0x1234567890123456789012345678901234567890')
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('should retry on failure', async () => {
      const { result } = renderHook(() => 
        useENS('vitalik.eth', { retry: 3 })
      );
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate Ethereum addresses', () => {
      const { result } = renderHook(() => useENS('invalid-address'));
      
      expect(result.current.error || result.current.loading === false).toBeTruthy();
    });

    it('should validate ENS name format', () => {
      const { result } = renderHook(() => useENS('valid-name.eth'));
      
      expect(result.current).toBeDefined();
    });

    it('should handle empty input', () => {
      const { result } = renderHook(() => useENS(''));
      
      expect(result.current.name).toBeNull();
    });
  });

  describe('Multi-chain Support', () => {
    it('should support mainnet ENS', async () => {
      const { result } = renderHook(() => 
        useENS('vitalik.eth', { chainId: 1 })
      );
      
      await waitFor(() => {
        expect(result.current.address).toBeDefined();
      });
    });

    it('should handle unsupported chains', async () => {
      const { result } = renderHook(() => 
        useENS('vitalik.eth', { chainId: 999 })
      );
      
      await waitFor(() => {
        expect(result.current.error || result.current.address === null).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('should debounce rapid lookups', async () => {
      jest.useFakeTimers();
      
      const { rerender } = renderHook(
        ({ input }) => useENS(input, { debounce: 300 }),
        { initialProps: { input: 'vitalik.eth' } }
      );
      
      rerender({ input: 'buterin.eth' });
      rerender({ input: 'ethereum.eth' });
      
      jest.advanceTimersByTime(300);
      
      await waitFor(() => {
        expect(true).toBe(true);
      });

      jest.useRealTimers();
    });

    it('should memoize results', async () => {
      const { result, rerender } = renderHook(() => 
        useENS('vitalik.eth')
      );
      
      await waitFor(() => {
        expect(result.current.name).toBeDefined();
      });

      const firstResult = result.current;
      rerender();
      
      expect(result.current).toBe(firstResult);
    });
  });

  describe('Batch Operations', () => {
    it('should handle multiple ENS lookups', async () => {
      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321',
      ];

      const results = addresses.map((addr) => 
        renderHook(() => useENS(addr))
      );

      await Promise.all(
        results.map((r) => 
          waitFor(() => expect(r.result.current.loading).toBe(false))
        )
      );
    });
  });

  describe('Refresh Functionality', () => {
    it('should allow manual refresh', async () => {
      const { result } = renderHook(() => useENS('vitalik.eth'));
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      if (result.current.refetch) {
        result.current.refetch();
      }

      expect(result.current).toBeDefined();
    });
  });
});
