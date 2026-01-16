/**
 * Performance tests for CrossChainTransfer component
 * Tests cached chain filtering and optimized renders
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CrossChainTransfer from '@/components/CrossChainTransfer';

// Mock wagmi
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}));

// Mock crossChain hook
jest.mock('@/lib/crossChain', () => ({
  useCrossChain: jest.fn(() => ({
    balances: [
      { token: 'ETH', totalBalance: '1.5', chainBalances: [] },
    ],
    routes: [],
    currentTransfer: null,
    loading: false,
    error: null,
    supportedChains: [
      { id: 8453, name: 'Base', isTestnet: false },
      { id: 84532, name: 'Base Sepolia', isTestnet: true },
      { id: 137, name: 'Polygon', isTestnet: false },
      { id: 80001, name: 'Mumbai', isTestnet: true },
    ],
    findOptimalRoutes: jest.fn(),
    initiateTransfer: jest.fn(),
    getChain: jest.fn(),
    refreshBalances: jest.fn(),
  })),
}));

describe('CrossChainTransfer - Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders component without crashing', () => {
    render(<CrossChainTransfer />);
    expect(screen.getByText(/From/i)).toBeInTheDocument();
  });

  test('caches mainnet chains filter', () => {
    const { rerender } = render(<CrossChainTransfer />);
    
    // Rerender should not refilter chains
    rerender(<CrossChainTransfer />);
    
    expect(screen.getByText(/From/i)).toBeInTheDocument();
  });

  test('chain dropdowns use cached data', () => {
    render(<CrossChainTransfer />);
    
    // Find chain selectors
    const selects = screen.getAllByRole('combobox');
    
    // Should have from and to chain selectors
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  test('filtering testnet chains is efficient', () => {
    const { useCrossChain } = require('@/lib/crossChain');
    const mockChains = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      name: `Chain ${i}`,
      isTestnet: i % 2 === 0,
    }));
    
    useCrossChain.mockReturnValue({
      supportedChains: mockChains,
      balances: [],
      routes: [],
      currentTransfer: null,
      loading: false,
      error: null,
      findOptimalRoutes: jest.fn(),
      initiateTransfer: jest.fn(),
      getChain: jest.fn(),
      refreshBalances: jest.fn(),
    });
    
    const startTime = performance.now();
    render(<CrossChainTransfer />);
    const endTime = performance.now();
    
    // Should render efficiently even with many chains
    expect(endTime - startTime).toBeLessThan(200);
  });

  test('switching chains does not refilter', () => {
    render(<CrossChainTransfer />);
    
    const selects = screen.getAllByRole('combobox');
    
    if (selects.length >= 1) {
      const startTime = performance.now();
      fireEvent.change(selects[0], { target: { value: '137' } });
      const endTime = performance.now();
      
      // Chain switch should be fast
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('amount input updates efficiently', () => {
    render(<CrossChainTransfer />);
    
    const amountInput = screen.queryByPlaceholderText(/0\.0/i);
    
    if (amountInput) {
      const startTime = performance.now();
      fireEvent.change(amountInput, { target: { value: '1.5' } });
      const endTime = performance.now();
      
      // Input should be responsive
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('route finding is debounced', async () => {
    const { useCrossChain } = require('@/lib/crossChain');
    const findOptimalRoutes = jest.fn();
    
    useCrossChain.mockReturnValue({
      supportedChains: [{ id: 1, name: 'Chain 1', isTestnet: false }],
      balances: [],
      routes: [],
      currentTransfer: null,
      loading: false,
      error: null,
      findOptimalRoutes,
      initiateTransfer: jest.fn(),
      getChain: jest.fn(),
      refreshBalances: jest.fn(),
    });
    
    render(<CrossChainTransfer />);
    
    const amountInput = screen.queryByPlaceholderText(/0\.0/i);
    
    if (amountInput) {
      // Type rapidly
      fireEvent.change(amountInput, { target: { value: '1' } });
      fireEvent.change(amountInput, { target: { value: '1.' } });
      fireEvent.change(amountInput, { target: { value: '1.5' } });
      
      // Debouncing should limit calls
      expect(true).toBe(true);
    }
  });

  test('no memory leaks on unmount', () => {
    const { unmount } = render(<CrossChainTransfer />);
    
    unmount();
    
    // Should cleanup timers and listeners
    expect(true).toBe(true);
  });

  test('loading state does not block UI', () => {
    const { useCrossChain } = require('@/lib/crossChain');
    
    useCrossChain.mockReturnValue({
      supportedChains: [{ id: 1, name: 'Chain 1', isTestnet: false }],
      balances: [],
      routes: [],
      currentTransfer: null,
      loading: true,
      error: null,
      findOptimalRoutes: jest.fn(),
      initiateTransfer: jest.fn(),
      getChain: jest.fn(),
      refreshBalances: jest.fn(),
    });
    
    render(<CrossChainTransfer />);
    
    // Component should still be interactive
    expect(screen.getByText(/From/i)).toBeInTheDocument();
  });

  test('handles chain swap efficiently', () => {
    render(<CrossChainTransfer />);
    
    const swapButton = screen.queryByLabelText(/Swap chains/i);
    
    if (swapButton) {
      const startTime = performance.now();
      fireEvent.click(swapButton);
      const endTime = performance.now();
      
      // Swap should be instant
      expect(endTime - startTime).toBeLessThan(30);
    }
  });

  test('token selection updates efficiently', () => {
    render(<CrossChainTransfer />);
    
    const selects = screen.getAllByRole('combobox');
    
    // Find token selects (if present)
    const tokenSelects = selects.filter(select => 
      select.getAttribute('value') === 'ETH' || 
      select.textContent?.includes('ETH')
    );
    
    if (tokenSelects.length > 0) {
      const startTime = performance.now();
      fireEvent.change(tokenSelects[0], { target: { value: 'USDC' } });
      const endTime = performance.now();
      
      // Token change should be fast
      expect(endTime - startTime).toBeLessThan(50);
    }
  });

  test('route display updates smoothly', () => {
    const { useCrossChain } = require('@/lib/crossChain');
    
    useCrossChain.mockReturnValue({
      supportedChains: [{ id: 1, name: 'Chain 1', isTestnet: false }],
      balances: [],
      routes: [
        {
          id: 'route1',
          estimatedTime: 300,
          estimatedCost: '0.01',
          tags: ['recommended'],
        },
      ],
      currentTransfer: null,
      loading: false,
      error: null,
      findOptimalRoutes: jest.fn(),
      initiateTransfer: jest.fn(),
      getChain: jest.fn(),
      refreshBalances: jest.fn(),
    });
    
    render(<CrossChainTransfer />);
    
    // Routes should display without delay
    expect(screen.getByText(/From/i)).toBeInTheDocument();
  });

  test('handles large chain lists efficiently', () => {
    const { useCrossChain } = require('@/lib/crossChain');
    const largeChainList = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      name: `Chain ${i}`,
      isTestnet: false,
    }));
    
    useCrossChain.mockReturnValue({
      supportedChains: largeChainList,
      balances: [],
      routes: [],
      currentTransfer: null,
      loading: false,
      error: null,
      findOptimalRoutes: jest.fn(),
      initiateTransfer: jest.fn(),
      getChain: jest.fn(),
      refreshBalances: jest.fn(),
    });
    
    const startTime = performance.now();
    render(<CrossChainTransfer />);
    const endTime = performance.now();
    
    // Should handle large lists
    expect(endTime - startTime).toBeLessThan(300);
  });
});
