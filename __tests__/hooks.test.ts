import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890' as const,
    isConnected: true,
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
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
})),
  useReadContract: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    error: null,
    refetch: jest.fn(),
  })),
  useWriteContract: jest.fn(() => ({
    writeContract: jest.fn(),
    writeContractAsync: jest.fn().mockResolvedValue('0xhash'),
    data: undefined,
    isPending: false,
  })),
  useWaitForTransactionReceipt: jest.fn(() => ({
    isLoading: false,
    isSuccess: false,
  })),
  useChainId: jest.fn(() => 84532),
}))

describe('Custom Hooks Template', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('useAccount mock returns expected values', async () => {
    const { useAccount } = await import('wagmi')
    const result = useAccount()
    
    expect(result.address).toBe('0x1234567890123456789012345678901234567890')
    expect(result.isConnected).toBe(true)
  })

  it('useReadContract mock returns expected structure', async () => {
    const { useReadContract } = await import('wagmi')
    const result = useReadContract({
      address: '0x1234567890123456789012345678901234567890',
      abi: [],
      functionName: 'test',
    })
    
    expect(result.data).toBeUndefined()
    expect(result.isLoading).toBe(false)
    expect(result.error).toBeNull()
  })

  it('useWriteContract mock returns expected structure', async () => {
    const { useWriteContract } = await import('wagmi')
    const result = useWriteContract()
    
    expect(typeof result.writeContract).toBe('function')
    expect(typeof result.writeContractAsync).toBe('function')
    expect(result.isPending).toBe(false)
  })

  it('can mock contract read with data', async () => {
    const { useReadContract } = await import('wagmi')
    const mockUseReadContract = useReadContract as ReturnType<typeof jest.fn>
    
    mockUseReadContract.mockReturnValueOnce({
      data: BigInt(1000000000000000000),
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })
    
    const result = useReadContract({
      address: '0x1234567890123456789012345678901234567890',
      abi: [],
      functionName: 'balanceOf',
    })
    
    expect(result.data).toBe(BigInt(1000000000000000000))
  })

  it('can mock loading state', async () => {
    const { useReadContract } = await import('wagmi')
    const mockUseReadContract = useReadContract as ReturnType<typeof jest.fn>
    
    mockUseReadContract.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: jest.fn(),
    })
    
    const result = useReadContract({
      address: '0x1234567890123456789012345678901234567890',
      abi: [],
      functionName: 'balanceOf',
    })
    
    expect(result.isLoading).toBe(true)
  })

  it('can mock error state', async () => {
    const { useReadContract } = await import('wagmi')
    const mockUseReadContract = useReadContract as ReturnType<typeof jest.fn>
    
    mockUseReadContract.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('Contract call failed'),
      refetch: jest.fn(),
    })
    
    const result = useReadContract({
      address: '0x1234567890123456789012345678901234567890',
      abi: [],
      functionName: 'balanceOf',
    })
    
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe('Contract call failed')
  })
})
