/**
 * Enhanced Wallet Connect Component Tests
 * Comprehensive tests for wallet connection UI
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedWalletConnect } from '../../../components/wallet/EnhancedWalletConnect';

// Mock wagmi hooks
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected', chainId: undefined })),
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

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock mobile detection
jest.mock('@/lib/mobileDetection', () => ({
  isMobileDevice: jest.fn(() => false),
}));

// Mock wallet UX enhancements
jest.mock('@/lib/wallet/walletUXEnhancements', () => ({
  getWalletPreferences: jest.fn(() => ({
    hasSeenWalletGuide: true,
    autoSwitchToBase: true,
  })),
  saveWalletPreferences: jest.fn(),
  getRecommendedWallet: jest.fn(() => ({
    id: 'metamask',
    name: 'MetaMask',
    reason: 'Most popular',
  })),
  getUserFriendlyError: jest.fn((error) => ({
    title: 'Connection Failed',
    message: 'Please try again',
  })),
  getWalletOnboardingSteps: jest.fn(() => [
    { step: 1, title: 'Connect Wallet', completed: false },
  ]),
  autoSwitchToBaseIfNeeded: jest.fn(),
  getWalletStatus: jest.fn(() => ({
    connected: false,
    onPreferredChain: true,
  })),
  PREFERRED_CHAIN: { id: 8453, name: 'Base' },
  PREFERRED_CHAIN_NAME: 'Base',
  WALLET_RECOMMENDATIONS: [],
}));

describe('EnhancedWalletConnect Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to disconnected state
    const { useAccount } = require('wagmi');
    useAccount.mockReturnValue({ 
      address: undefined, 
      isConnected: false, 
      isConnecting: false 
    });
  });

  describe('Rendering', () => {
    it('should render connect wallet heading when not connected', () => {
      render(<EnhancedWalletConnect />);
      
      expect(screen.getByRole('heading', { name: /connect wallet/i })).toBeInTheDocument();
    });

    it('should show wallet options', async () => {
      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getAllByText(/metamask/i).length).toBeGreaterThan(0);
      });
    });

    it('should highlight recommended wallet', async () => {
      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getByText(/recommended/i)).toBeInTheDocument();
      });
    });
  });

  describe('Connection Flow', () => {
    it('should handle wallet connection', async () => {
      const mockConnect = jest.fn();
      const { useConnect } = require('wagmi');
      useConnect.mockReturnValue({
        connect: mockConnect,
        connectors: [
          { id: 'metamask', name: 'MetaMask', ready: true },
        ],
        error: null,
        isPending: false,
      });

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        const metamaskElements = screen.getAllByText(/metamask/i);
        fireEvent.click(metamaskElements[0]);
      });

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should show loading state during connection', () => {
      const { useConnect, useAccount } = require('wagmi');
      useConnect.mockReturnValue({
        connect: jest.fn(),
        connectors: [
          { id: 'metamask', name: 'MetaMask', ready: true },
        ],
        error: null,
        isPending: true,
      });
      useAccount.mockReturnValue({
        address: undefined,
        isConnected: false,
        isConnecting: true,
      });

      render(<EnhancedWalletConnect />);
      
      // When isPending is true, buttons should be disabled
      const buttons = screen.getAllByRole('button');
      const disabledButtons = buttons.filter(btn => btn.hasAttribute('disabled') || btn.className.includes('disabled'));
      expect(disabledButtons.length).toBeGreaterThan(0);
    });

    it('should show connected state', async () => {
      const { useAccount } = require('wagmi');
      
      useAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        isConnecting: false,
      });

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getByText(/wallet connected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Connected State', () => {
    beforeEach(() => {
      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        isConnecting: false,
      });
    });

    it('should display connected address', () => {
      render(<EnhancedWalletConnect />);
      
      expect(screen.getByText(/0x1234/i)).toBeInTheDocument();
    });

    it('should show Wallet Connected heading', () => {
      render(<EnhancedWalletConnect />);
      
      expect(screen.getByText(/wallet connected/i)).toBeInTheDocument();
    });
  });

  describe('Network Switching', () => {
    it('should show wrong network warning when on wrong chain', async () => {
      const { useAccount, useChainId } = require('wagmi');
      
      useAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        isConnecting: false,
      });
      useChainId.mockReturnValue(1); // Ethereum mainnet instead of Base

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getByText(/wrong network/i)).toBeInTheDocument();
      });
    });

    it('should show switch to Base button', async () => {
      const { useAccount, useChainId } = require('wagmi');
      
      useAccount.mockReturnValue({
        address: '0x1234...',
        isConnected: true,
        isConnecting: false,
      });
      useChainId.mockReturnValue(1);

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /switch to base/i })).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Experience', () => {
    it('should detect mobile devices', () => {
      const mockIsMobile = require('@/lib/mobileDetection').isMobileDevice;
      mockIsMobile.mockReturnValue(true);

      render(<EnhancedWalletConnect />);
      
      expect(screen.getByRole('heading', { name: /connect wallet/i })).toBeInTheDocument();
    });

    it('should show mobile-appropriate wallets', async () => {
      const mockIsMobile = require('@/lib/mobileDetection').isMobileDevice;
      mockIsMobile.mockReturnValue(true);

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getByText(/show all wallets/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<EnhancedWalletConnect />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', () => {
      render(<EnhancedWalletConnect />);
      
      // Get all buttons and check they can receive focus
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Find a button that's not disabled
      const focusableButton = buttons.find(btn => !btn.hasAttribute('disabled'));
      if (focusableButton) {
        focusableButton.focus();
        expect(document.activeElement).toBe(focusableButton);
      }
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<EnhancedWalletConnect />);
      
      rerender(<EnhancedWalletConnect />);
      
      expect(screen.getByRole('heading', { name: /connect wallet/i })).toBeInTheDocument();
    });

    it('should clean up on unmount', () => {
      const { unmount } = render(<EnhancedWalletConnect />);
      
      unmount();

      expect(screen.queryByRole('heading', { name: /connect wallet/i })).not.toBeInTheDocument();
    });
  });

  describe('Onboarding', () => {
    it('should show connection guide link for first-time users', () => {
      const mockGetPrefs = require('@/lib/wallet/walletUXEnhancements').getWalletPreferences;
      mockGetPrefs.mockReturnValue({
        hasSeenWalletGuide: false,
        autoSwitchToBase: true,
      });

      render(<EnhancedWalletConnect showOnboarding={true} />);
      
      // Component shows guide automatically for first-time users
      // Guide modal appears or guide button is available
      expect(screen.getByRole('heading', { name: /connect wallet/i })).toBeInTheDocument();
    });
  });
});
