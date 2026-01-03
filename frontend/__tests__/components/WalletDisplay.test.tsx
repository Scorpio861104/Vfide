import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Mock wagmi
vi.mock('wagmi', () => ({
  useChainId: vi.fn(() => 84532),
  useAccount: vi.fn(() => ({ address: '0x1234567890abcdef', isConnected: true })),
  useBalance: vi.fn(() => ({ 
    data: { formatted: '1.5', symbol: 'ETH' },
    isLoading: false 
  })),
}))

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Wallet: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'wallet-icon' }),
  ChevronDown: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'chevron-down' }),
  Copy: ({ className, onClick }: { className?: string; onClick?: () => void }) => 
    React.createElement('button', { className, onClick, 'data-testid': 'copy-icon' }),
  ExternalLink: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'external-link' }),
  LogOut: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'logout-icon' }),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, onClick, ...props }: React.PropsWithChildren<{ 
      className?: string; 
      style?: object;
      onClick?: () => void;
    }>) =>
      React.createElement('div', { className, style, onClick, ...props }, children),
    button: ({ children, className, onClick, ...props }: React.PropsWithChildren<{ 
      className?: string;
      onClick?: () => void;
    }>) =>
      React.createElement('button', { className, onClick, ...props }, children),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
}))

// Simple wallet display components for testing
const WalletAddress = ({ 
  address, 
  truncate = true,
  showCopy = true 
}: { 
  address: string; 
  truncate?: boolean;
  showCopy?: boolean;
}) => {
  const displayAddress = truncate 
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address
  
  const handleCopy = () => {
    navigator.clipboard.writeText(address)
  }

  return (
    <div data-testid="wallet-address">
      <span data-testid="address-text">{displayAddress}</span>
      {showCopy && (
        <button onClick={handleCopy} data-testid="copy-button">Copy</button>
      )}
    </div>
  )
}

const WalletButton = ({
  address,
  balance,
  onConnect,
  onDisconnect,
  isConnected = false
}: {
  address?: string
  balance?: string
  onConnect?: () => void
  onDisconnect?: () => void
  isConnected?: boolean
}) => {
  if (!isConnected) {
    return (
      <button onClick={onConnect} data-testid="connect-button">
        Connect Wallet
      </button>
    )
  }

  return (
    <div data-testid="wallet-button">
      <span data-testid="wallet-balance">{balance}</span>
      <span data-testid="wallet-address-short">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
      <button onClick={onDisconnect} data-testid="disconnect-button">Disconnect</button>
    </div>
  )
}

describe('WalletAddress', () => {
  it('renders truncated address by default', () => {
    render(<WalletAddress address="0x1234567890abcdef1234567890abcdef12345678" />)
    expect(screen.getByTestId('address-text')).toHaveTextContent('0x1234...5678')
  })

  it('renders full address when truncate is false', () => {
    const fullAddress = '0x1234567890abcdef1234567890abcdef12345678'
    render(<WalletAddress address={fullAddress} truncate={false} />)
    expect(screen.getByTestId('address-text')).toHaveTextContent(fullAddress)
  })

  it('shows copy button by default', () => {
    render(<WalletAddress address="0x1234567890abcdef" />)
    expect(screen.getByTestId('copy-button')).toBeInTheDocument()
  })

  it('hides copy button when showCopy is false', () => {
    render(<WalletAddress address="0x1234567890abcdef" showCopy={false} />)
    expect(screen.queryByTestId('copy-button')).not.toBeInTheDocument()
  })

  it('copies address to clipboard when copy clicked', async () => {
    const mockClipboard = { writeText: vi.fn() }
    Object.assign(navigator, { clipboard: mockClipboard })
    
    render(<WalletAddress address="0xTestAddress" />)
    fireEvent.click(screen.getByTestId('copy-button'))
    expect(mockClipboard.writeText).toHaveBeenCalledWith('0xTestAddress')
  })
})

describe('WalletButton', () => {
  it('shows connect button when not connected', () => {
    render(<WalletButton isConnected={false} onConnect={() => {}} />)
    expect(screen.getByTestId('connect-button')).toBeInTheDocument()
  })

  it('calls onConnect when connect button clicked', () => {
    const onConnect = vi.fn()
    render(<WalletButton isConnected={false} onConnect={onConnect} />)
    fireEvent.click(screen.getByTestId('connect-button'))
    expect(onConnect).toHaveBeenCalled()
  })

  it('shows wallet info when connected', () => {
    render(
      <WalletButton 
        isConnected={true} 
        address="0x1234567890abcdef1234567890abcdef12345678"
        balance="1.5 ETH"
      />
    )
    expect(screen.getByTestId('wallet-balance')).toHaveTextContent('1.5 ETH')
    expect(screen.getByTestId('wallet-address-short')).toBeInTheDocument()
  })

  it('calls onDisconnect when disconnect clicked', () => {
    const onDisconnect = vi.fn()
    render(
      <WalletButton 
        isConnected={true}
        address="0x1234"
        onDisconnect={onDisconnect}
      />
    )
    fireEvent.click(screen.getByTestId('disconnect-button'))
    expect(onDisconnect).toHaveBeenCalled()
  })
})
