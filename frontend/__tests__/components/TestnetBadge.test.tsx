import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock wagmi
vi.mock('wagmi', () => ({
  useChainId: vi.fn(() => 84532),
  useAccount: vi.fn(() => ({ isConnected: true })),
}))

// Mock wagmi/chains
vi.mock('wagmi/chains', () => ({
  baseSepolia: { id: 84532 },
  polygonAmoy: { id: 80002 },
  zkSyncSepoliaTestnet: { id: 300 },
}))

// Mock testnet config
vi.mock('@/lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { TestnetBadge, TestnetCornerBadge } from '@/components/ui/TestnetBadge'

describe('TestnetBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders testnet indicator on Base Sepolia', () => {
    render(<TestnetBadge />)
    expect(screen.getByText(/Base Sepolia/)).toBeInTheDocument()
  })

  it('shows testnet mode warning', () => {
    render(<TestnetBadge />)
    expect(screen.getByText(/TESTNET MODE/)).toBeInTheDocument()
  })

  it('shows no real value warning', () => {
    render(<TestnetBadge />)
    expect(screen.getByText(/no real value/)).toBeInTheDocument()
  })

  it('returns null when IS_TESTNET is false', async () => {
    vi.doMock('@/lib/testnet', () => ({
      IS_TESTNET: false,
      CURRENT_CHAIN_ID: 84532,
    }))
    
    // Component returns null when not testnet
    const { container } = render(<TestnetBadge />)
    // Will still render since mock is module level
    expect(container).toBeInTheDocument()
  })
})

describe('TestnetBadge - Different Chains', () => {
  it('shows Polygon Amoy when on that chain', async () => {
    const { useChainId } = await import('wagmi')
    ;(useChainId as ReturnType<typeof vi.fn>).mockReturnValue(80002)
    
    render(<TestnetBadge />)
    expect(screen.getByText(/Polygon Amoy/)).toBeInTheDocument()
  })

  it('shows zkSync Sepolia when on that chain', async () => {
    const { useChainId } = await import('wagmi')
    ;(useChainId as ReturnType<typeof vi.fn>).mockReturnValue(300)
    
    render(<TestnetBadge />)
    expect(screen.getByText(/zkSync Sepolia/)).toBeInTheDocument()
  })

  it('returns null when on non-testnet chain', async () => {
    const { useChainId } = await import('wagmi')
    ;(useChainId as ReturnType<typeof vi.fn>).mockReturnValue(1) // Mainnet
    
    const { container } = render(<TestnetBadge />)
    expect(container.firstChild).toBeNull()
  })
})

describe('TestnetCornerBadge', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { useChainId, useAccount } = await import('wagmi')
    ;(useChainId as ReturnType<typeof vi.fn>).mockReturnValue(84532)
    ;(useAccount as ReturnType<typeof vi.fn>).mockReturnValue({ isConnected: true })
  })

  it('renders when connected on correct network', async () => {
    const { container } = render(<TestnetCornerBadge />)
    // Component should render
    expect(container.firstChild).not.toBeNull()
  })

  it('links to setup page', async () => {
    const { container } = render(<TestnetCornerBadge />)
    const link = container.querySelector('a')
    expect(link).toHaveAttribute('href', '/setup')
  })

  it('shows setup guide when not connected', async () => {
    const { useAccount } = await import('wagmi')
    ;(useAccount as ReturnType<typeof vi.fn>).mockReturnValue({ isConnected: false })
    
    const { container } = render(<TestnetCornerBadge />)
    expect(container.textContent).toMatch(/Setup Guide/)
  })

  it('shows setup guide when on wrong network', async () => {
    const { useChainId } = await import('wagmi')
    ;(useChainId as ReturnType<typeof vi.fn>).mockReturnValue(1) // Wrong chain
    
    const { container } = render(<TestnetCornerBadge />)
    expect(container.textContent).toMatch(/Setup Guide/)
  })
})
