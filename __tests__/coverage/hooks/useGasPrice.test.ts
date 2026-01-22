/**
 * useGasPrice Hook Tests
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useGasPrice } from '../../../hooks/useGasPrice';

// Mock wagmi
jest.mock('wagmi', () => ({
  useGasPrice: jest.fn(() => ({
    data: BigInt('20000000000'),
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useChainId: jest.fn(() => 1),
}));

describe('useGasPrice Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch current gas price', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await waitFor(() => {
      expect(result.current.gasPrice).toBeDefined();
    });
  });

  it('should format gas price in gwei', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await waitFor(() => {
      expect(result.current.gasPriceGwei).toBeDefined();
    });
  });

  it('should calculate priority fees', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await waitFor(() => {
      expect(result.current.priorityFee).toBeDefined();
    });
  });

  it('should handle loading state', () => {
    const { useGasPrice: mockUseGasPrice } = require('wagmi');
    mockUseGasPrice.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useGasPrice());
    
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle errors', async () => {
    const { useGasPrice: mockUseGasPrice } = require('wagmi');
    mockUseGasPrice.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network error'),
    });

    const { result } = renderHook(() => useGasPrice());
    
    expect(result.current.error).toBeTruthy();
  });

  it('should support auto-refresh', async () => {
    jest.useFakeTimers();
    
    const { result } = renderHook(() => 
      useGasPrice({ refreshInterval: 10000 })
    );
    
    jest.advanceTimersByTime(10000);
    
    await waitFor(() => {
      expect(result.current.gasPrice).toBeDefined();
    });

    jest.useRealTimers();
  });

  it('should allow manual refresh', async () => {
    const mockRefetch = jest.fn();
    const { useGasPrice: mockUseGasPrice } = require('wagmi');
    mockUseGasPrice.mockReturnValue({
      data: BigInt('20000000000'),
      isLoading: false,
      error: null,
      refetch: mockRefetch,
    });

    const { result } = renderHook(() => useGasPrice());
    
    if (result.current.refetch) {
      result.current.refetch();
    }

    expect(mockRefetch).toHaveBeenCalled();
  });

  it('should categorize gas prices', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await waitFor(() => {
      expect(result.current.priceLevel).toMatch(/low|medium|high/i);
    });
  });

  it('should handle different chains', async () => {
    const { useChainId } = require('wagmi');
    useChainId.mockReturnValue(8453); // Base

    const { result } = renderHook(() => useGasPrice());
    
    await waitFor(() => {
      expect(result.current.gasPrice).toBeDefined();
    });
  });

  it('should estimate transaction costs', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    const cost = result.current.estimateCost?.(21000);
    expect(cost).toBeDefined();
  });

  it('should provide gas recommendations', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await waitFor(() => {
      expect(result.current.recommendations).toBeDefined();
    });
  });

  it('should handle EIP-1559 transactions', async () => {
    const { result } = renderHook(() => useGasPrice());
    
    await waitFor(() => {
      expect(result.current.maxFeePerGas).toBeDefined();
      expect(result.current.maxPriorityFeePerGas).toBeDefined();
    });
  });
});
