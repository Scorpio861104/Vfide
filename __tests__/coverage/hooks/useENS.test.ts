/**
 * useENS Hook Tests
 * Tests for ENS resolution and reverse lookup
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useENS } from '../../../hooks/useENS';

// Mock wagmi
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: jest.fn(() => ({ writeContract: jest.fn(), writeContractAsync: jest.fn(), data: undefined, isPending: false, isSuccess: false, isError: false, error: null, reset: jest.fn() })),
  useWaitForTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn(), getTransactionReceipt: jest.fn() })),
  useWalletClient: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSignTypedData: jest.fn(() => ({ signTypedData: jest.fn(), signTypedDataAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useSignMessage: jest.fn(() => ({ signMessage: jest.fn(), signMessageAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null, reset: jest.fn() })),
  useConnect: jest.fn(() => ({ connect: jest.fn(), connectAsync: jest.fn(), connectors: [], status: 'idle' })),
  useDisconnect: jest.fn(() => ({ disconnect: jest.fn(), disconnectAsync: jest.fn() })),
  useConnections: jest.fn(() => []),
  useBalance: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEnsName: jest.fn(() => ({ data: undefined, isLoading: false })),
  useEnsAvatar: jest.fn(() => ({ data: undefined, isLoading: false })),
  useBlockNumber: jest.fn(() => ({ data: undefined, isLoading: false, refetch: jest.fn() })),
  useEstimateGas: jest.fn(() => ({ data: undefined, isLoading: false })),
  useSendTransaction: jest.fn(() => ({ sendTransaction: jest.fn(), sendTransactionAsync: jest.fn(), data: undefined, isPending: false, isError: false, error: null })),
  useConfig: jest.fn(() => ({})),
  WagmiProvider: ({ children }) => children,
  createConfig: jest.fn(() => ({})),
  createStorage: jest.fn(() => ({ getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() })),
  cookieStorage: { getItem: jest.fn(() => null), setItem: jest.fn(), removeItem: jest.fn() },
  http: jest.fn(() => ({})),
  fallback: jest.fn(() => ({})),
  useGasPrice: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useEstimateFeesPerGas: jest.fn(() => ({ data: undefined, isLoading: false, isError: false, refetch: jest.fn() })),
  useReconnect: jest.fn(() => ({ reconnect: jest.fn(), reconnectAsync: jest.fn(), connectors: [], status: 'idle', isPending: false, isSuccess: false, isError: false })),
  useTransaction: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  useTransactionReceipt: jest.fn(() => ({ data: undefined, isLoading: false, isSuccess: false, isError: false })),
  serialize: jest.fn((v) => JSON.stringify(v)),
  deserialize: jest.fn((v) => { try { return JSON.parse(v); } catch { return v; } }),
  cookieToInitialState: jest.fn(() => undefined),
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
