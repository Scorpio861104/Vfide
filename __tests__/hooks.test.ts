import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(() => ({
    address: '0x1234567890123456789012345678901234567890' as const,
    isConnected: true,
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
