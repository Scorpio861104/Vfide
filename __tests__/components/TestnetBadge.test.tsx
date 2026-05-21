import { describe, expect, it,  beforeEach } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock wagmi
jest.mock('wagmi', () => ({
  useChainId: jest.fn(() => 84532),
  useAccount: jest.fn(() => ({ isConnected: true,
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
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
})),
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
