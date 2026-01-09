import { describe, expect, it, vi, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock wagmi
jest.mock('wagmi', () => ({
  useChainId: jest.fn(() => 84532),
}))

// Mock lucide-react
jest.mock('lucide-react', () => ({
  ExternalLink: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'external-link' }),
  Copy: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'copy-icon' }),
  Check: ({ className }: { className?: string }) => 
    React.createElement('svg', { className, 'data-testid': 'check-icon' }),
}))

import { EtherscanLink, ContractLink, getExplorerUrl, getExplorerLink } from '@/components/ui/EtherscanLink'

describe('EtherscanLink', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    })
  })

  it('renders nothing when no value provided', () => {
    const { container } = render(<EtherscanLink />)
    expect(container.firstChild).toBeNull()
  })

  it('renders address link', () => {
    render(<EtherscanLink address="0x1234567890123456789012345678901234567890" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://sepolia.basescan.org/address/0x1234567890123456789012345678901234567890')
  })

  it('renders tx link', () => {
    render(<EtherscanLink txHash="0xabcdef" type="tx" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://sepolia.basescan.org/tx/0xabcdef')
  })

  it('renders token link', () => {
    render(<EtherscanLink address="0x1234567890123456789012345678901234567890" type="token" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', 'https://sepolia.basescan.org/token/0x1234567890123456789012345678901234567890')
  })

  it('displays truncated address', () => {
    render(<EtherscanLink address="0x1234567890123456789012345678901234567890" />)
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument()
  })

  it('displays custom label', () => {
    render(<EtherscanLink address="0x1234567890123456789012345678901234567890" label="My Wallet" />)
    expect(screen.getByText('My Wallet')).toBeInTheDocument()
  })

  it('shows copy button by default', () => {
    render(<EtherscanLink address="0x1234567890123456789012345678901234567890" />)
    expect(screen.getByTestId('copy-icon')).toBeInTheDocument()
  })

  it('hides copy button when showCopy is false', () => {
    render(<EtherscanLink address="0x1234567890123456789012345678901234567890" showCopy={false} />)
    expect(screen.queryByTestId('copy-icon')).not.toBeInTheDocument()
  })

  it('copies to clipboard on click', async () => {
    render(<EtherscanLink address="0x1234567890123456789012345678901234567890" />)
    const copyButton = screen.getByTestId('copy-icon').parentElement!
    
    fireEvent.click(copyButton)
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('0x1234567890123456789012345678901234567890')
  })

  it('opens link in new tab', () => {
    render(<EtherscanLink address="0x1234567890123456789012345678901234567890" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('ContractLink', () => {
  it('renders contract name and address', () => {
    render(<ContractLink address="0x1234567890123456789012345678901234567890" name="VFIDEToken" />)
    expect(screen.getByText('VFIDEToken')).toBeInTheDocument()
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument()
  })

  it('shows verified badge when verified', () => {
    render(<ContractLink address="0x1234" name="Token" verified />)
    expect(screen.getByText('✓ Verified')).toBeInTheDocument()
  })

  it('hides verified badge when not verified', () => {
    render(<ContractLink address="0x1234" name="Token" verified={false} />)
    expect(screen.queryByText('✓ Verified')).not.toBeInTheDocument()
  })
})

describe('getExplorerUrl', () => {
  it('returns correct URL for mainnet', () => {
    expect(getExplorerUrl(1)).toBe('https://etherscan.io')
  })

  it('returns correct URL for Base Sepolia', () => {
    expect(getExplorerUrl(84532)).toBe('https://sepolia.basescan.org')
  })

  it('returns correct URL for Base mainnet', () => {
    expect(getExplorerUrl(8453)).toBe('https://basescan.org')
  })

  it('returns correct URL for zkSync', () => {
    expect(getExplorerUrl(324)).toBe('https://explorer.zksync.io')
  })

  it('returns correct URL for Polygon', () => {
    expect(getExplorerUrl(137)).toBe('https://polygonscan.com')
  })

  it('returns correct URL for Polygon Amoy', () => {
    expect(getExplorerUrl(80002)).toBe('https://amoy.polygonscan.com')
  })

  it('returns Sepolia URL for unknown chains', () => {
    expect(getExplorerUrl(999999)).toBe('https://sepolia.etherscan.io')
  })
})

describe('getExplorerLink', () => {
  it('generates address link', () => {
    const link = getExplorerLink(8453, '0x1234', 'address')
    expect(link).toBe('https://basescan.org/address/0x1234')
  })

  it('generates tx link', () => {
    const link = getExplorerLink(8453, '0xabc', 'tx')
    expect(link).toBe('https://basescan.org/tx/0xabc')
  })

  it('generates token link', () => {
    const link = getExplorerLink(8453, '0x1234', 'token')
    expect(link).toBe('https://basescan.org/token/0x1234')
  })

  it('defaults to address type', () => {
    const link = getExplorerLink(8453, '0x1234')
    expect(link).toBe('https://basescan.org/address/0x1234')
  })
})
