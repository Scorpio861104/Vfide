import { describe, expect, it, vi } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock wagmi
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
}))

import { TokenBalance, NavbarBalance } from '@/components/ui/TokenBalance'

describe('TokenBalance', () => {
  it('renders nothing when not connected', async () => {
    const { useAccount } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: undefined, 
      isConnected: false 
    })
    
    const { container } = render(<TokenBalance />)
    expect(container.firstChild).toBeNull()
  })

  it('renders ETH and token balances when connected', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234567890123456789012345678901234567890', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: { value: 1500000000000000000n, decimals: 18 }, 
      isLoading: false 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: 1000000000000000000n, 
      isLoading: false 
    })
    
    render(<TokenBalance />)
    expect(screen.getByText('Ξ')).toBeInTheDocument()
    expect(screen.getByText('1.5000')).toBeInTheDocument()
    expect(screen.getByText('1.00')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: undefined, 
      isLoading: true 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: undefined, 
      isLoading: true 
    })
    
    const { container } = render(<TokenBalance />)
    expect(container.querySelector('.bg-zinc-800')).toBeInTheDocument()
  })

  it('hides native balance when showNative is false', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: { value: 1500000000000000000n, decimals: 18 }, 
      isLoading: false 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: 1000000000000000000n, 
      isLoading: false 
    })
    
    render(<TokenBalance showNative={false} />)
    expect(screen.queryByText('Ξ')).not.toBeInTheDocument()
  })

  it('applies custom className', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: { value: 0n, decimals: 18 }, 
      isLoading: false 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: 0n, 
      isLoading: false 
    })
    
    const { container } = render(<TokenBalance className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})

describe('NavbarBalance', () => {
  it('renders nothing when not connected', async () => {
    const { useAccount } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: undefined, 
      isConnected: false 
    })
    
    const { container } = render(<NavbarBalance />)
    expect(container.firstChild).toBeNull()
  })

  it('renders TokenBalance when connected', async () => {
    const { useAccount, useBalance, useReadContract } = await import('wagmi')
    ;(useAccount as ReturnType<typeof jest.fn>).mockReturnValue({ 
      address: '0x1234', 
      isConnected: true 
    })
    ;(useBalance as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: { value: 100000000000000000n, decimals: 18 }, 
      isLoading: false 
    })
    ;(useReadContract as ReturnType<typeof jest.fn>).mockReturnValue({ 
      data: 0n, 
      isLoading: false 
    })
    
    render(<NavbarBalance />)
    expect(screen.getByText('0.1000')).toBeInTheDocument()
  })
})
