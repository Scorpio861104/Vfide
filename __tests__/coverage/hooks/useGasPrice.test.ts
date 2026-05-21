/**
 * useGasPrice Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGasPrice } from '../../../hooks/useGasPrice';

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

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true });

// Mock window.ethereum
const mockEthereumRequest = jest.fn();

describe('useGasPrice Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockLocalStorage.clear();
    
    // Setup ethereum mock before each test
    (window as any).ethereum = {
      request: mockEthereumRequest,
    };
    
    // Default mock for gas price (20 gwei in hex)
    mockEthereumRequest.mockResolvedValue('0x4a817c800'); // 20 gwei in wei
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should fetch current gas price', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(result.current.gasPrice).toBeDefined();
    });
  });

  it('should return gas price object with tiers', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      if (result.current.gasPrice) {
        expect(result.current.gasPrice).toHaveProperty('low');
        expect(result.current.gasPrice).toHaveProperty('standard');
        expect(result.current.gasPrice).toHaveProperty('fast');
        expect(result.current.gasPrice).toHaveProperty('instant');
      }
    });
  });

  it('should handle loading state', () => {
    const { result } = renderHook(() => useGasPrice());
    
    expect(typeof result.current.isLoading).toBe('boolean');
  });

  it('should handle errors', async () => {
    mockEthereumRequest.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useGasPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });

  it('should have history array', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    expect(result.current.history).toBeDefined();
    expect(Array.isArray(result.current.history)).toBe(true);
  });

  it('should support alert configuration', () => {
    const { result } = renderHook(() => useGasPrice());
    
    expect(result.current.alert).toBeDefined();
    expect(result.current.alert).toHaveProperty('enabled');
    expect(result.current.alert).toHaveProperty('threshold');
  });

  it('should allow enabling alerts', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    act(() => {
      result.current.setAlertEnabled(true);
    });
    
    expect(result.current.alert.enabled).toBe(true);
  });

  it('should allow setting alert threshold', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    act(() => {
      result.current.setAlertThreshold(15);
    });
    
    expect(result.current.alert.threshold).toBe(15);
  });

  it('should provide trend information', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    expect(result.current.trend).toMatch(/up|down|stable/);
  });

  it('should have formatGwei function', () => {
    const { result } = renderHook(() => useGasPrice());
    
    expect(typeof result.current.formatGwei).toBe('function');
  });

  it('should format gwei correctly', () => {
    const { result } = renderHook(() => useGasPrice());
    
    expect(result.current.formatGwei(0.001)).toBe('< 0.01');
    expect(result.current.formatGwei(0.5)).toBe('0.500');
    expect(result.current.formatGwei(5)).toBe('5.00');
    expect(result.current.formatGwei(25)).toBe('25.0');
  });

  it('should have estimateCost function', () => {
    const { result } = renderHook(() => useGasPrice());
    
    expect(typeof result.current.estimateCost).toBe('function');
  });

  it('should estimate transaction costs', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    await waitFor(() => {
      if (result.current.gasPrice) {
        const cost = result.current.estimateCost(21000);
        expect(cost).toBeDefined();
        if (cost) {
          expect(cost).toHaveProperty('low');
          expect(cost).toHaveProperty('standard');
          expect(cost).toHaveProperty('fast');
        }
      }
    });
  });

  it('should have refresh function', () => {
    const { result } = renderHook(() => useGasPrice());
    
    expect(typeof result.current.refresh).toBe('function');
  });

  it('should allow manual refresh', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await act(async () => {
      await result.current.refresh();
    });
    
    expect(mockEthereumRequest).toHaveBeenCalledWith({
      method: 'eth_gasPrice',
      params: [],
    });
  });

  it('should handle missing wallet', async () => {
    (window as any).ethereum = undefined;

    const { result } = renderHook(() => useGasPrice());
    
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    
    expect(result.current.error).toBeTruthy();
  });

  it('should poll for updates', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await act(async () => {
      // Initial fetch + one poll interval (15 seconds)
      jest.advanceTimersByTime(16000);
    });
    
    // Should have called at least twice (initial + one poll)
    expect(mockEthereumRequest).toHaveBeenCalledTimes(2);
  });

  it('should persist alert settings in localStorage', () => {
    const { result } = renderHook(() => useGasPrice());
    
    act(() => {
      result.current.setAlertEnabled(true);
      result.current.setAlertThreshold(25);
    });
    
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });
});
