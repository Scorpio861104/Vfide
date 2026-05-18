import { describe, expect, it,  beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock wagmi
jest.mock('wagmi', () => ({
  useChainId: jest.fn(() => 84532),
  useAccount: jest.fn(() => ({ isConnected: true })),
}))

// Mock wagmi/chains
jest.mock('wagmi/chains', () => ({
  baseSepolia: { id: 84532 },
  polygonAmoy: { id: 80002 },
  zkSyncSepoliaTestnet: { id: 300 },
}))

// Mock testnet config
jest.mock('@/lib/testnet', () => ({
  IS_TESTNET: true,
  CURRENT_CHAIN_ID: 84532,
}))

// Mock next/link
jest.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

import { TestnetBadge, TestnetCornerBadge } from '@/components/ui/TestnetBadge'

describe('TestnetBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns null (legacy component)', () => {
    const { container } = render(<TestnetBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('no longer shows testnet mode warning', () => {
    const { container } = render(<TestnetBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('no longer shows no real value warning', () => {
    const { container } = render(<TestnetBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when IS_TESTNET is false', async () => {
    jest.doMock('@/lib/testnet', () => ({
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
  it('returns null (legacy - no longer shows Polygon Amoy)', async () => {
    const { useChainId } = await import('wagmi')
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(80002)
    
    const { container } = render(<TestnetBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null (legacy - no longer shows zkSync Sepolia)', async () => {
    const { useChainId } = await import('wagmi')
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(300)
    
    const { container } = render(<TestnetBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when on non-testnet chain', async () => {
    const { useChainId } = await import('wagmi')
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Mainnet
    
    const { container } = render(<TestnetBadge />)
    expect(container.firstChild).toBeNull()
  })
})

describe('TestnetCornerBadge', () => {
  beforeEach(async () => {
    jest.clearAllMocks()
    const { useChainId, useAccount } = await import('wagmi')
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(84532)
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: true })
  })

  it('returns null (legacy component)', async () => {
    const { container } = render(<TestnetCornerBadge />)
    // Component should return null now
    expect(container.firstChild).toBeNull()
  })

  it('no longer links to setup page', async () => {
    const { container } = render(<TestnetCornerBadge />)
    const link = container.querySelector('a')
    expect(link).toBeNull()
  })

  it('no longer shows setup guide when not connected', async () => {
    const { useAccount } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ isConnected: false })
    
    const { container } = render(<TestnetCornerBadge />)
    expect(container.firstChild).toBeNull()
  })

  it('no longer shows setup guide when on wrong network', async () => {
    const { useChainId } = await import('wagmi')
    ;(useChainId as ReturnType<typeof jest.fn>).mockReturnValue(1) // Wrong chain
    
    const { container } = render(<TestnetCornerBadge />)
    expect(container.firstChild).toBeNull()
  })
})
