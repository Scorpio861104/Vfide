/**
 * Real Merchant Hooks Tests
 * Tests for actual merchant hook implementations to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi
const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseWaitForTransactionReceipt = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
}))

// Mock viem
jest.mock('viem', () => ({
  parseEther: (value: string) => BigInt(Math.floor(parseFloat(value) * 1e18)),
  parseUnits: (value: string, decimals?: number) => BigInt(Math.floor(parseFloat(value) * Math.pow(10, decimals ?? 18))),
  formatEther: (value: bigint) => (Number(value) / 1e18).toString(),
  formatUnits: (value: bigint, decimals?: number) => (Number(value) / Math.pow(10, decimals ?? 18)).toString(),
  isAddress: (addr: string) => addr && addr.startsWith('0x') && addr.length === 42,
  getAddress: (addr: string) => addr,
}))

// Mock contracts
jest.mock('../../lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    MerchantPortal: '0x1234567890123456789012345678901234567890',
  },
}))

// Mock ABIs
jest.mock('../../lib/abis', () => ({
  MerchantPortalABI: [],
}))

// Import hooks after mocks are set up
import {
  useIsMerchant,
  useRegisterMerchant,
  useProcessPayment,
} from '../../hooks/useMerchantHooks'

describe('useIsMerchant', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0x1234' })
  })

  it('returns merchant status when merchant is registered', () => {
    mockUseReadContract.mockReturnValue({
      data: [true, false, 'Test Business', 'Retail', BigInt(1704067200), BigInt('1000000000000000000000'), BigInt(50)],
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useIsMerchant())
    
    expect(result.current.isMerchant).toBe(true)
    expect(result.current.isSuspended).toBe(false)
    expect(result.current.businessName).toBe('Test Business')
    expect(result.current.category).toBe('Retail')
    expect(result.current.txCount).toBe(50)
  })

  it('returns false for non-merchants', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, false, '', '', BigInt(0), BigInt(0), BigInt(0)],
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useIsMerchant())
    
    expect(result.current.isMerchant).toBe(false)
    expect(result.current.businessName).toBe('')
  })

  it('handles suspended merchants', () => {
    mockUseReadContract.mockReturnValue({
      data: [true, true, 'Suspended Business', 'Retail', BigInt(1704067200), BigInt(0), BigInt(0)],
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useIsMerchant())
    
    expect(result.current.isMerchant).toBe(true)
    expect(result.current.isSuspended).toBe(true)
  })

  it('returns loading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useIsMerchant())
    
    expect(result.current.isLoading).toBe(true)
  })

  it('handles undefined data', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useIsMerchant())
    
    expect(result.current.isMerchant).toBe(false)
    expect(result.current.businessName).toBe('')
    expect(result.current.totalVolume).toBe('0')
    expect(result.current.txCount).toBe(0)
  })

  it('uses provided address over connected address', () => {
    const customAddress = '0xCustomAddress' as `0x${string}`
    mockUseReadContract.mockReturnValue({
      data: [true, false, 'Custom Business', 'Food', BigInt(1704067200), BigInt(0), BigInt(0)],
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useIsMerchant(customAddress))
    
    expect(result.current.businessName).toBe('Custom Business')
  })
})

describe('useRegisterMerchant', () => {
  const mockWriteContractAsync = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      data: undefined,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides registerMerchant function', () => {
    const { result } = renderHook(() => useRegisterMerchant())
    
    expect(typeof result.current.registerMerchant).toBe('function')
  })

  it('returns isRegistering false when not pending', () => {
    const { result } = renderHook(() => useRegisterMerchant())
    
    expect(result.current.isRegistering).toBe(false)
  })

  it('returns isRegistering true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useRegisterMerchant())
    
    expect(result.current.isRegistering).toBe(true)
  })

  it('returns isSuccess when transaction confirmed', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
    })
    
    const { result } = renderHook(() => useRegisterMerchant())
    
    expect(result.current.isSuccess).toBe(true)
  })

  it('calls writeContractAsync with correct args', async () => {
    mockWriteContractAsync.mockResolvedValue({ hash: '0xabc' })
    
    const { result } = renderHook(() => useRegisterMerchant())
    
    await act(async () => {
      await result.current.registerMerchant('My Business', 'Retail')
    })
    
    expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'registerMerchant',
      args: ['My Business', 'Retail'],
    }))
  })

  it('returns error on failure', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('Transaction rejected'))
    
    const { result } = renderHook(() => useRegisterMerchant())
    
    await act(async () => {
      const response = await result.current.registerMerchant('My Business', 'Retail')
      expect(response.success).toBe(false)
      expect(response.error).toContain('Transaction rejected')
    })
    
    expect(result.current.error).toContain('Transaction rejected')
  })
})

describe('useProcessPayment', () => {
  const mockWriteContractAsync = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      data: undefined,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides processPayment function', () => {
    const { result } = renderHook(() => useProcessPayment())
    
    expect(typeof result.current.processPayment).toBe('function')
  })

  it('returns isProcessing false when not pending', () => {
    const { result } = renderHook(() => useProcessPayment())
    
    expect(result.current.isProcessing).toBe(false)
  })

  it('returns isProcessing true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useProcessPayment())
    
    expect(result.current.isProcessing).toBe(true)
  })

  it('calls writeContractAsync with correct args', async () => {
    mockWriteContractAsync.mockResolvedValue({ hash: '0xabc' })
    
    const { result } = renderHook(() => useProcessPayment())
    
    await act(async () => {
      await result.current.processPayment(
        '0xCustomer' as `0x${string}`,
        '0xToken' as `0x${string}`,
        '100',
        'ORDER-123'
      )
    })
    
    expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'processPayment',
      args: ['0xCustomer', '0xToken', expect.any(BigInt), 'ORDER-123'],
    }))
  })

  it('returns success on successful payment', async () => {
    mockWriteContractAsync.mockResolvedValue({ hash: '0xabc' })
    
    const { result } = renderHook(() => useProcessPayment())
    
    await act(async () => {
      const response = await result.current.processPayment(
        '0xCustomer' as `0x${string}`,
        '0xToken' as `0x${string}`,
        '50',
        'ORDER-456'
      )
      expect(response.success).toBe(true)
    })
  })

  it('returns error on failure', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('Insufficient balance'))
    
    const { result } = renderHook(() => useProcessPayment())
    
    await act(async () => {
      const response = await result.current.processPayment(
        '0xCustomer' as `0x${string}`,
        '0xToken' as `0x${string}`,
        '100',
        'ORDER-789'
      )
      expect(response.success).toBe(false)
      expect(response.error).toContain('Insufficient')
    })
  })
})
