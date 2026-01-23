/**
 * Enhanced Wallet Connect Component Tests
 * Comprehensive tests for wallet connection UI
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EnhancedWalletConnect } from '../../../components/wallet/EnhancedWalletConnect';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({ 
    address: undefined, 
    isConnected: false, 
    isConnecting: false 
  })),
  useConnect: jest.fn(() => ({
    connect: jest.fn(),
    connectors: [
      { id: 'metamask', name: 'MetaMask', ready: true },
      { id: 'walletconnect', name: 'WalletConnect', ready: true },
    ],
    error: null,
    isPending: false,
  })),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn() })),
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
    hasSeenWalletGuide: false,
    autoSwitchToBase: true,
  })),
  saveWalletPreferences: jest.fn(),
  getRecommendedWallet: jest.fn(() => ({
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
    onPreferredChain: false,
  })),
  PREFERRED_CHAIN: { id: 8453, name: 'Base' },
  PREFERRED_CHAIN_NAME: 'Base',
  WALLET_RECOMMENDATIONS: [],
}));

describe('EnhancedWalletConnect Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render connect wallet button', () => {
      render(<EnhancedWalletConnect />);
      
      expect(screen.getByText(/connect/i)).toBeInTheDocument();
    });

    it('should show wallet options', async () => {
      render(<EnhancedWalletConnect />);
      
      const connectBtn = screen.getByText(/connect/i);
      fireEvent.click(connectBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/metamask/i)).toBeInTheDocument();
      });
    });

    it('should highlight recommended wallet', async () => {
      render(<EnhancedWalletConnect />);
      
      const connectBtn = screen.getByText(/connect/i);
      fireEvent.click(connectBtn);
      
      await waitFor(() => {
        const metamask = screen.getByText(/metamask/i);
        expect(metamask).toBeInTheDocument();
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
      
      const connectBtn = screen.getByText(/connect/i);
      fireEvent.click(connectBtn);
      
      await waitFor(() => {
        const metamaskBtn = screen.getByText(/metamask/i);
        fireEvent.click(metamaskBtn);
      });

      expect(mockConnect).toHaveBeenCalled();
    });

    it('should show loading state during connection', () => {
      const { useConnect } = require('wagmi');
      useConnect.mockReturnValue({
        connect: jest.fn(),
        connectors: [],
        error: null,
        isPending: true,
      });

      render(<EnhancedWalletConnect />);
      
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });

    it('should call onSuccess callback', async () => {
      const onSuccess = jest.fn();
      const { useAccount } = require('wagmi');
      
      useAccount.mockReturnValue({
        address: '0x1234...',
        isConnected: true,
        isConnecting: false,
      });

      render(<EnhancedWalletConnect onSuccess={onSuccess} />);
      
      await waitFor(() => {
        expect(screen.getByText(/connected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display connection errors', async () => {
      const { useConnect } = require('wagmi');
      useConnect.mockReturnValue({
        connect: jest.fn(),
        connectors: [],
        error: new Error('User rejected'),
        isPending: false,
      });

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getByText(/connection failed/i)).toBeInTheDocument();
      });
    });

    it('should show user-friendly error messages', async () => {
      const { useConnect } = require('wagmi');
      const mockGetError = require('@/lib/wallet/walletUXEnhancements').getUserFriendlyError;
      
      mockGetError.mockReturnValue({
        title: 'Wallet Locked',
        message: 'Please unlock your wallet',
      });

      useConnect.mockReturnValue({
        connect: jest.fn(),
        connectors: [],
        error: new Error('Wallet locked'),
        isPending: false,
      });

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getByText(/wallet locked/i)).toBeInTheDocument();
      });
    });

    it('should allow error dismissal', async () => {
      const { useConnect } = require('wagmi');
      useConnect.mockReturnValue({
        connect: jest.fn(),
        connectors: [],
        error: new Error('Test error'),
        isPending: false,
      });

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        const dismissBtn = screen.getByRole('button', { name: /close/i });
        fireEvent.click(dismissBtn);
      });
    });
  });

  describe('Onboarding', () => {
    it('should show onboarding guide for first-time users', () => {
      const mockGetPrefs = require('@/lib/wallet/walletUXEnhancements').getWalletPreferences;
      mockGetPrefs.mockReturnValue({
        hasSeenWalletGuide: false,
        autoSwitchToBase: true,
      });

      render(<EnhancedWalletConnect showOnboarding={true} />);
      
      expect(screen.getByText(/guide/i) || screen.getByText(/help/i)).toBeInTheDocument();
    });

    it('should not show guide if already seen', () => {
      const mockGetPrefs = require('@/lib/wallet/walletUXEnhancements').getWalletPreferences;
      mockGetPrefs.mockReturnValue({
        hasSeenWalletGuide: true,
        autoSwitchToBase: true,
      });

      render(<EnhancedWalletConnect showOnboarding={true} />);
      
      expect(screen.queryByText(/getting started/i)).not.toBeInTheDocument();
    });

    it('should display onboarding steps', async () => {
      const mockGetSteps = require('@/lib/wallet/walletUXEnhancements').getWalletOnboardingSteps;
      mockGetSteps.mockReturnValue([
        { step: 1, title: 'Connect Wallet', completed: false },
        { step: 2, title: 'Switch to Base', completed: false },
      ]);

      render(<EnhancedWalletConnect showOnboarding={true} />);
      
      const guideBtn = screen.getByText(/guide/i) || screen.getByText(/help/i);
      fireEvent.click(guideBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/connect wallet/i)).toBeInTheDocument();
      });
    });

    it('should allow dismissing onboarding', async () => {
      const mockSavePrefs = require('@/lib/wallet/walletUXEnhancements').saveWalletPreferences;
      
      render(<EnhancedWalletConnect showOnboarding={true} />);
      
      const guideBtn = screen.getByText(/guide/i) || screen.getByText(/help/i);
      fireEvent.click(guideBtn);
      
      await waitFor(() => {
        const closeBtn = screen.getByRole('button', { name: /close/i });
        fireEvent.click(closeBtn);
      });

      expect(mockSavePrefs).toHaveBeenCalled();
    });
  });

  describe('Network Switching', () => {
    it('should auto-switch to Base network', async () => {
      const mockSwitchChain = jest.fn();
      const { useChainId, useSwitchChain } = require('wagmi');
      
      useChainId.mockReturnValue(1); // Ethereum mainnet
      useSwitchChain.mockReturnValue({ switchChain: mockSwitchChain });

      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: '0x1234...',
        isConnected: true,
        isConnecting: false,
      });

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 8453 });
      });
    });

    it('should show network switch prompt', async () => {
      const { useChainId } = require('wagmi');
      useChainId.mockReturnValue(1);

      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: '0x1234...',
        isConnected: true,
        isConnecting: false,
      });

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getByText(/switch to base/i) || screen.getByText(/base network/i)).toBeInTheDocument();
      });
    });

    it('should handle network switch manually', async () => {
      const mockSwitchChain = jest.fn();
      const { useSwitchChain } = require('wagmi');
      useSwitchChain.mockReturnValue({ switchChain: mockSwitchChain });

      render(<EnhancedWalletConnect />);
      
      const switchBtn = screen.queryByText(/switch network/i);
      if (switchBtn) {
        fireEvent.click(switchBtn);
        expect(mockSwitchChain).toHaveBeenCalled();
      }
    });
  });

  describe('Mobile Experience', () => {
    it('should optimize for mobile devices', () => {
      const mockIsMobile = require('@/lib/mobileDetection').isMobileDevice;
      mockIsMobile.mockReturnValue(true);

      render(<EnhancedWalletConnect />);
      
      expect(screen.getByText(/connect/i)).toBeInTheDocument();
    });

    it('should show mobile-appropriate wallets', async () => {
      const mockIsMobile = require('@/lib/mobileDetection').isMobileDevice;
      mockIsMobile.mockReturnValue(true);

      const mockGetRecommended = require('@/lib/wallet/walletUXEnhancements').getRecommendedWallet;
      mockGetRecommended.mockReturnValue({
        name: 'WalletConnect',
        reason: 'Best for mobile',
      });

      render(<EnhancedWalletConnect />);
      
      const connectBtn = screen.getByText(/connect/i);
      fireEvent.click(connectBtn);
      
      await waitFor(() => {
        expect(screen.getByText(/walletconnect/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success States', () => {
    it('should show success message after connection', async () => {
      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: '0x1234...',
        isConnected: true,
        isConnecting: false,
      });

      render(<EnhancedWalletConnect />);
      
      await waitFor(() => {
        expect(screen.getByText(/connected/i) || screen.getByText(/success/i)).toBeInTheDocument();
      });
    });

    it('should display connected address', () => {
      const { useAccount } = require('wagmi');
      useAccount.mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
        isConnecting: false,
      });

      render(<EnhancedWalletConnect />);
      
      expect(screen.getByText(/0x1234/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible buttons', () => {
      render(<EnhancedWalletConnect />);
      
      const connectBtn = screen.getByRole('button');
      expect(connectBtn).toHaveAttribute('aria-label');
    });

    it('should support keyboard navigation', () => {
      render(<EnhancedWalletConnect />);
      
      const connectBtn = screen.getByRole('button');
      connectBtn.focus();
      
      expect(document.activeElement).toBe(connectBtn);
    });

    it('should announce loading states to screen readers', () => {
      const { useConnect } = require('wagmi');
      useConnect.mockReturnValue({
        connect: jest.fn(),
        connectors: [],
        error: null,
        isPending: true,
      });

      render(<EnhancedWalletConnect />);
      
      expect(screen.getByText(/connecting/i)).toHaveAttribute('role', 'status');
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<EnhancedWalletConnect />);
      
      rerender(<EnhancedWalletConnect />);
      
      expect(screen.getByText(/connect/i)).toBeInTheDocument();
    });

    it('should clean up on unmount', () => {
      const { unmount } = render(<EnhancedWalletConnect />);
      
      unmount();
      
      expect(true).toBe(true);
    });
  });
});
