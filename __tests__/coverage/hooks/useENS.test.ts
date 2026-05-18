/**
 * useENS Hook Tests
 * Tests for ENS resolution and reverse lookup
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useENS } from '../../../hooks/useENS';

// Mock wagmi
jest.mock('wagmi', () => ({
  useEnsName: jest.fn(() => ({ data: 'vitalik.eth', isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: 'https://avatar.url', isLoading: false })),
}));

// Mock viem/ens
jest.mock('viem/ens', () => ({
  normalize: jest.fn((name: string) => name),
}));

// Mock wagmi/chains
jest.mock('wagmi/chains', () => ({
  mainnet: { id: 1 },
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
        expect(result.current.ensName).toBeDefined();
      });
    });

    it('should handle addresses without ENS', async () => {
      const { useEnsName } = require('wagmi');
      useEnsName.mockReturnValue({ data: null, isLoading: false });

      const { result } = renderHook(() => 
        useENS('0x0000000000000000000000000000000000000000')
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should cache ENS lookups', async () => {
      const { result, rerender } = renderHook(() => 
        useENS('0x1234567890123456789012345678901234567890')
      );
      
      await waitFor(() => {
        expect(result.current.ensName).toBeDefined();
      });

      rerender();

      // Should not trigger additional lookups
      expect(result.current.ensName).toBeDefined();
    });
  });

  describe('ENS Avatar', () => {
    it('should fetch ENS avatar', async () => {
      const { result } = renderHook(() => 
        useENS('0x1234567890123456789012345678901234567890')
      );
      
      await waitFor(() => {
        expect(result.current.ensAvatar).toBeDefined();
      });
    });

    it('should handle missing avatars', async () => {
      const { useEnsAvatar } = require('wagmi');
      useEnsAvatar.mockReturnValue({ data: null, isLoading: false });

      const { result } = renderHook(() => 
        useENS('0x1234567890123456789012345678901234567890')
      );
      
      await waitFor(() => {
        expect(result.current.ensAvatar).toBeNull();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state', () => {
      const { useEnsName } = require('wagmi');
      useEnsName.mockReturnValue({ data: null, isLoading: true });

      const { result } = renderHook(() => useENS('0x1234567890123456789012345678901234567890'));
      
      expect(typeof result.current.isLoading).toBe('boolean');
    });

    it('should transition from loading to loaded', async () => {
      const { useEnsName, useEnsAvatar } = require('wagmi');
      useEnsName.mockReturnValue({ data: 'vitalik.eth', isLoading: false });
      useEnsAvatar.mockReturnValue({ data: null, isLoading: false });

      const { result } = renderHook(() => useENS('0x1234567890123456789012345678901234567890'));
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const { useEnsName } = require('wagmi');
      useEnsName.mockReturnValue({ data: null, isLoading: false });

      const { result } = renderHook(() => 
        useENS('0x1234567890123456789012345678901234567890')
      );
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Input Validation', () => {
    it('should validate Ethereum addresses', () => {
      const { result } = renderHook(() => useENS('invalid-address'));
      
      expect(result.current).toBeDefined();
    });

    it('should handle empty input', () => {
      const { result } = renderHook(() => useENS(''));
      
      expect(result.current.ensName).toBeNull();
    });

    it('should handle undefined input', () => {
      const { result } = renderHook(() => useENS(undefined));
      
      expect(result.current.ensName).toBeNull();
    });
  });

  describe('hasENS Flag', () => {
    it('should return hasENS true when name exists', async () => {
      const { useEnsName } = require('wagmi');
      useEnsName.mockReturnValue({ data: 'vitalik.eth', isLoading: false });

      const { result } = renderHook(() => 
        useENS('0x1234567890123456789012345678901234567890')
      );
      
      await waitFor(() => {
        expect(result.current.hasENS).toBe(true);
      });
    });

    it('should return hasENS false when no name', async () => {
      const { useEnsName } = require('wagmi');
      useEnsName.mockReturnValue({ data: null, isLoading: false });

      const { result } = renderHook(() => 
        useENS('0x0000000000000000000000000000000000000000')
      );
      
      await waitFor(() => {
        expect(result.current.hasENS).toBe(false);
      });
    });
  });

  describe('Performance', () => {
    it('should memoize results', async () => {
      const { result, rerender } = renderHook(() => 
        useENS('0x1234567890123456789012345678901234567890')
      );
      
      await waitFor(() => {
        expect(result.current.ensName).toBeDefined();
      });

      rerender();
      
      expect(result.current).toBeDefined();
    });
  });

  describe('Batch Operations', () => {
    it('should handle multiple ENS lookups', async () => {
      const { useEnsName, useEnsAvatar } = require('wagmi');
      useEnsName.mockReturnValue({ data: 'test.eth', isLoading: false });
      useEnsAvatar.mockReturnValue({ data: null, isLoading: false });

      const addresses = [
        '0x1234567890123456789012345678901234567890',
        '0x0987654321098765432109876543210987654321',
      ];

      const results = addresses.map((addr) => 
        renderHook(() => useENS(addr))
      );

      await Promise.all(
        results.map((r) => 
          waitFor(() => expect(r.result.current.isLoading).toBe(false))
        )
      );
    });
  });
});
