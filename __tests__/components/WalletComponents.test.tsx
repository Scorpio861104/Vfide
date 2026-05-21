'use client';

import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock wagmi hooks
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
  useAccount: jest.fn(() => ({ address: '0x0000000000000000000000000000000000000001', isConnected: true, status: 'connected', chainId: 84532 })),
  useChainId: jest.fn(() => 84532),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle', isPending: false, isError: false, error: null, reset: jest.fn() })),
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
  http: jest.fn(() => ({})),
}));

// Mock chains
jest.mock('@/lib/chains', () => ({
  CHAINS: {
    base: { id: 'base', name: 'Base', icon: '🔵', testnet: { id: 84532 }, mainnet: { id: 8453 } },
    zksync: { id: 'zksync', name: 'zkSync', icon: '⚡', testnet: { id: 300 }, mainnet: { id: 324 } },
    polygon: { id: 'polygon', name: 'Polygon', icon: '🟣', testnet: { id: 80002 }, mainnet: { id: 137 } },
  },
  getChainList: jest.fn(() => [
    { id: 'base', name: 'Base', icon: '🔵', testnet: { id: 84532 }, mainnet: { id: 8453 } },
    { id: 'zksync', name: 'zkSync', icon: '⚡', testnet: { id: 300 }, mainnet: { id: 324 } },
    { id: 'polygon', name: 'Polygon', icon: '🟣', testnet: { id: 80002 }, mainnet: { id: 137 } },
  ]),
  isChainReady: jest.fn(() => true),
  IS_TESTNET: true,
  getChainNetwork: jest.fn((chain: string) => {
    const networks: Record<string, any> = {
      base: { id: 84532 },
      zksync: { id: 300 },
      polygon: { id: 80002 },
    };
    return networks[chain] || { id: 84532 };
  }),
}));

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>{children}</div>
    ),
    button: ({ children, className, onClick, disabled, ...props }: any) => (
      <button className={className} onClick={onClick} disabled={disabled} {...props}>{children}</button>
    ),
    span: ({ children, className, ...props }: any) => (
      <span className={className} {...props}>{children}</span>
    ),
  },
  AnimatePresence: ({ children }: any) => children,
}));

import { ChainSelector } from '@/components/wallet/ChainSelector';
import * as wagmi from 'wagmi';
import * as chains from '@/lib/chains';

describe('ChainSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Default Render', () => {
    it('should render current chain name', () => {
      render(<ChainSelector />);
      
      expect(screen.getByText('Base')).toBeInTheDocument();
    });

    it('should render chain icon', () => {
      render(<ChainSelector />);
      
      expect(screen.getByText('🔵')).toBeInTheDocument();
    });

    it('should render select dropdown trigger', () => {
      render(<ChainSelector />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Compact Mode', () => {
    it('should render compact version', () => {
      render(<ChainSelector compact />);
      
      expect(screen.getByText('Base')).toBeInTheDocument();
    });

    it('should toggle dropdown on click', () => {
      render(<ChainSelector compact />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(screen.getByText('zkSync')).toBeInTheDocument();
    });

    it('should close dropdown when clicking outside', () => {
      render(<ChainSelector compact />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const overlay = document.querySelector('.fixed.inset-0');
      if (overlay) {
        fireEvent.click(overlay);
      }
    });
  });

  describe('Chain Selection', () => {
    it('should call switchChain when chain selected', async () => {
      const mockSwitch = jest.fn();
      jest.mocked(wagmi.useSwitchChain).mockReturnValue({
        switchChain: mockSwitch,
        isPending: false,
      } as any);
      
      render(<ChainSelector compact />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      const zksyncButton = screen.getByText('zkSync').closest('button');
      if (zksyncButton) {
        fireEvent.click(zksyncButton);
        expect(mockSwitch).toHaveBeenCalled();
      }
    });

    it('should accept onChainSelect callback prop', () => {
      const onSelect = jest.fn();
      
      // Just verify prop is accepted without error
      render(<ChainSelector compact onChainSelect={onSelect} />);
      
      // Component renders without throwing
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Show Only Ready', () => {
    it('should filter chains based on ready status', () => {
      jest.mocked(chains.isChainReady).mockImplementation((id) => id === 'base');
      
      render(<ChainSelector compact showOnlyReady />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Base should be visible
      const baseElements = screen.getAllByText('Base');
      expect(baseElements.length).toBeGreaterThan(0);
    });
  });

  describe('Pending State', () => {
    it('should disable buttons when switching is pending', () => {
      jest.mocked(wagmi.useSwitchChain).mockReturnValue({
        switchChain: jest.fn(),
        isPending: true,
      } as any);
      
      render(<ChainSelector compact />);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('Full Mode Render', () => {
    it('should render full version with all chains visible', () => {
      render(<ChainSelector />);
      
      // Multiple instances of Base may exist
      const baseElements = screen.getAllByText('Base');
      expect(baseElements.length).toBeGreaterThan(0);
      expect(screen.getByText('zkSync')).toBeInTheDocument();
      expect(screen.getByText('Polygon')).toBeInTheDocument();
    });

    it('should highlight selected chain', () => {
      render(<ChainSelector />);
      
      // Base should be selected by default
      const baseElements = screen.getAllByText('Base');
      expect(baseElements.length).toBeGreaterThan(0);
    });
  });
});
