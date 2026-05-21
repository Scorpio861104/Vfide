import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock wagmi
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
  useChainId: jest.fn(() => 84532),
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
  http: jest.fn(() => ({})),
}))

// Mock lucide-react
jest.mock('lucide-react', () => (() => { /* LucideProxyFallback */
  const __orig = ({
  Loader2: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'loader-icon' }),
  ExternalLink: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'external-link' }),
  CheckCircle2: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'check-icon' }),
  XCircle: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'x-icon' }),
});
  return new Proxy(__orig, {
    get: (t, prop) => {
      if (prop in t) return (t as any)[prop];
      if (prop === '__esModule') return true;
      if (typeof prop === 'symbol') return undefined;
      const name = String(prop);
      const Icon = ({ className, ...rest }: any) => {
        const React = require('react');
        return React.createElement('span', { 'data-testid': `${name.toLowerCase()}-icon`, className, ...rest });
      };
      Icon.displayName = `LucideMock(${name})`;
      return Icon;
    },
  });
})())

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: React.PropsWithChildren<{ className?: string; onClick?: () => void }>) =>
      React.createElement('div', { className, onClick, ...props }, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

import { TransactionPending } from '@/components/ui/TransactionPending'

describe('TransactionPending', () => {
  it('renders nothing when not open', () => {
    const { container } = render(
      <TransactionPending isOpen={false} status="pending" />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders pending status', () => {
    render(<TransactionPending isOpen={true} status="pending" />)
    expect(screen.getByText('Confirm in Wallet')).toBeInTheDocument()
    expect(screen.getByText('Please confirm the transaction in your wallet...')).toBeInTheDocument()
    expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
  })

  it('renders confirming status', () => {
    render(<TransactionPending isOpen={true} status="confirming" />)
    expect(screen.getByText('Transaction Pending')).toBeInTheDocument()
    expect(screen.getByText('Waiting for blockchain confirmation...')).toBeInTheDocument()
  })

  it('renders success status', () => {
    render(<TransactionPending isOpen={true} status="success" />)
    expect(screen.getByText('Transaction Successful!')).toBeInTheDocument()
    expect(screen.getByTestId('check-icon')).toBeInTheDocument()
  })

  it('renders error status', () => {
    render(<TransactionPending isOpen={true} status="error" />)
    expect(screen.getByText('Transaction Failed')).toBeInTheDocument()
    expect(screen.getByTestId('x-icon')).toBeInTheDocument()
  })

  it('uses custom title and message', () => {
    render(
      <TransactionPending 
        isOpen={true} 
        status="pending" 
        title="Custom Title"
        message="Custom message"
      />
    )
    expect(screen.getByText('Custom Title')).toBeInTheDocument()
    expect(screen.getByText('Custom message')).toBeInTheDocument()
  })

  it('shows transaction hash link', () => {
    render(
      <TransactionPending 
        isOpen={true} 
        status="confirming" 
        hash="0x1234567890abcdef1234567890abcdef12345678"
      />
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://sepolia.basescan.org/tx/0x1234567890abcdef1234567890abcdef12345678')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('truncates transaction hash', () => {
    render(
      <TransactionPending 
        isOpen={true} 
        status="confirming" 
        hash="0x1234567890abcdef1234567890abcdef12345678"
      />
    )
    expect(screen.getByText(/0x12345678.+12345678/)).toBeInTheDocument()
  })

  it('uses correct explorer URL for chain', async () => {
    const { useChainId } = await import('wagmi')
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(8453)
    
    render(
      <TransactionPending 
        isOpen={true} 
        status="confirming" 
        hash="0xabc123"
      />
    )
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://basescan.org/tx/0xabc123')
  })

  it('calls onClose when clicking overlay on success', () => {
    const handleClose = jest.fn()
    render(
      <TransactionPending 
        isOpen={true} 
        status="success" 
        onClose={handleClose}
      />
    )
    // Overlay is the outer div
    const overlay = document.querySelector('.fixed.inset-0')
    if (overlay) {
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    }
    expect(handleClose).toHaveBeenCalled()
  })
})
