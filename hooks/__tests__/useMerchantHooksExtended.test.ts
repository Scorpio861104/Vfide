// Extended tests for useMerchantHooks.ts - covering all remaining functions
import { describe, it, expect, vi, beforeEach, Mock } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi before importing hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
  useChainId: jest.fn(),
  usePublicClient: jest.fn(),
}))

// Mock viem
jest.mock('viem', () => ({
  parseEther: (val: string) => BigInt(parseFloat(val) * 1e18),
  formatEther: (val) => (Number(val) / 1e18).toString(),
  formatUnits: (val, decimals) => (Number(val) / Math.pow(10, decimals !== undefined ? decimals : 18)).toString(),
  parseUnits: (val, decimals) => BigInt(Math.floor(parseFloat(val) * Math.pow(10, decimals !== undefined ? decimals : 18))),
  isAddress: (addr) => addr && addr.startsWith('0x') && addr.length === 42,
  getAddress: (addr) => addr,
}))

// Mock abis
jest.mock('@/lib/abis', () => ({
  MerchantPortalABI: [],
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    MerchantPortal: '0x1234567890123456789012345678901234567890',
  },
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
}))

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi'
import {
  useIsMerchant,
  useRegisterMerchant,
  useProcessPayment,
  useSetMerchantPullPermit,
  usePayMerchant,
  useCustomerTrustScore,
  useSetAutoConvert,
  useSetPayoutAddress,
} from '../useMerchantHooks'

describe('useMerchantHooks - Extended Tests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockMerchantAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`
  const mockCustomerAddress = '0x9876543210987654321098765432109876543210' as `0x${string}`
  const mockTokenAddress = '0x5555555555555555555555555555555555555555' as `0x${string}`
  const mockTxHash = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
    ;(useChainId as Mock).mockReturnValue(84532)
    ;(usePublicClient as Mock).mockReturnValue({
      waitForTransactionReceipt: jest.fn().mockResolvedValue({}),
    })
    ;(useWriteContract as Mock).mockReturnValue({
      writeContractAsync: jest.fn().mockResolvedValue(mockTxHash),
      writeContract: jest.fn(),
      data: undefined,
      isPending: false,
    })
    ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
      isSuccess: false,
      isLoading: false,
    })
  })

  describe('useSetMerchantPullPermit', () => {
    it('should set merchant pull permit successfully', async () => {
      const mockWriteAsync = jest.fn().mockResolvedValue(mockTxHash)
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: mockTxHash,
        isPending: false,
      })

      const { result } = renderHook(() => useSetMerchantPullPermit())

      await act(async () => {
        const response = await result.current.setMerchantPullPermit(
          mockMerchantAddress,
          '125.5',
          1_900_000_000
        )
        expect(response.success).toBe(true)
      })

      expect(mockWriteAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'setMerchantPullPermit',
          args: [mockMerchantAddress, expect.any(BigInt), 1900000000n],
        })
      )
    })

    it('should handle permit errors', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('permit expired'))
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useSetMerchantPullPermit())

      await act(async () => {
        const response = await result.current.setMerchantPullPermit(
          mockMerchantAddress,
          '10',
          0
        )
        expect(response.success).toBe(false)
        expect(response.error).toContain('permit expired')
      })
    })

    it('should track permit transaction state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: jest.fn(),
        data: mockTxHash,
        isPending: true,
      })

      const { result } = renderHook(() => useSetMerchantPullPermit())

      expect(result.current.isSetting).toBe(true)
    })
  })

  // ==================== useProcessPayment ====================
  describe('useProcessPayment', () => {
    it('should process payment successfully', async () => {
      const mockWriteAsync = jest.fn().mockResolvedValue(mockTxHash)
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: mockTxHash,
        isPending: false,
      })

      const { result } = renderHook(() => useProcessPayment())

      await act(async () => {
        const response = await result.current.processPayment(
          mockCustomerAddress,
          mockTokenAddress,
          '100.5',
          'ORDER-123'
        )
        expect(response.success).toBe(true)
      })

      expect(mockWriteAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'processPayment',
        })
      )
    })

    it('should handle process payment error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('Not registered merchant'))
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useProcessPayment())

      await act(async () => {
        const response = await result.current.processPayment(
          mockCustomerAddress,
          mockTokenAddress,
          '100',
          'ORDER-456'
        )
        expect(response.success).toBe(false)
        expect(response.error).toContain('Not registered merchant')
      })
    })

    it('should track processing state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: jest.fn(),
        data: mockTxHash,
        isPending: true,
      })

      const { result } = renderHook(() => useProcessPayment())

      expect(result.current.isProcessing).toBe(true)
    })

    it('should track success state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: jest.fn(),
        data: mockTxHash,
        isPending: false,
      })
      ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      })

      const { result } = renderHook(() => useProcessPayment())

      expect(result.current.isSuccess).toBe(true)
    })

    it('should handle non-Error object rejection', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue('string error')
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useProcessPayment())

      await act(async () => {
        const response = await result.current.processPayment(
          mockCustomerAddress,
          mockTokenAddress,
          '50',
          'ORDER-789'
        )
        expect(response.success).toBe(false)
        expect(response.error).toContain('Transaction failed')
      })
    })
  })

  // ==================== usePayMerchant ====================
  describe('usePayMerchant', () => {
    it('should pay merchant successfully', async () => {
      const mockWriteAsync = jest.fn().mockResolvedValue(mockTxHash)
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: mockTxHash,
        isPending: false,
      })

      const { result } = renderHook(() => usePayMerchant())

      await act(async () => {
        const response = await result.current.payMerchant(
          mockMerchantAddress,
          mockTokenAddress,
          '25.75',
          'ORDER-PAY-123'
        )
        expect(response.success).toBe(true)
      })

      expect(mockWriteAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'pay',
        })
      )
    })

    it('should handle payment error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('Merchant suspended'))
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => usePayMerchant())

      await act(async () => {
        const response = await result.current.payMerchant(
          mockMerchantAddress,
          mockTokenAddress,
          '100',
          'ORDER-PAY-456'
        )
        expect(response.success).toBe(false)
        expect(response.error).toContain('Merchant suspended')
      })
    })

    it('should track paying state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: jest.fn(),
        data: mockTxHash,
        isPending: true,
      })

      const { result } = renderHook(() => usePayMerchant())

      expect(result.current.isPaying).toBe(true)
    })

    it('should track success and txHash', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: jest.fn(),
        data: mockTxHash,
        isPending: false,
      })
      ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      })

      const { result } = renderHook(() => usePayMerchant())

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.txHash).toBe(mockTxHash)
    })

    it('should handle non-Error object rejection', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(null)
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => usePayMerchant())

      await act(async () => {
        const response = await result.current.payMerchant(
          mockMerchantAddress,
          mockTokenAddress,
          '10',
          'ORDER-X'
        )
        expect(response.success).toBe(false)
        expect(response.error).toContain('Transaction failed')
      })
    })
  })

  // ==================== useCustomerTrustScore ====================
  describe('useCustomerTrustScore', () => {
    it('should return customer trust score data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: [BigInt(7500), true, false, true] as const,
        isLoading: false,
      })

      const { result } = renderHook(() => useCustomerTrustScore(mockCustomerAddress))

      expect(result.current.score).toBeGreaterThan(7000)
      expect(result.current.highTrust).toBe(true)
      expect(result.current.lowTrust).toBe(false)
      expect(result.current.eligible).toBe(true)
    })

    it('should return low trust customer data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: [BigInt(3000), false, true, false] as const,
        isLoading: false,
      })

      const { result } = renderHook(() => useCustomerTrustScore(mockCustomerAddress))

      expect(result.current.score).toBeLessThan(4000)
      expect(result.current.highTrust).toBe(false)
      expect(result.current.lowTrust).toBe(true)
      expect(result.current.eligible).toBe(false)
    })

    it('should return defaults when no data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
      })

      const { result } = renderHook(() => useCustomerTrustScore(undefined))

      expect(result.current.score).toBe(5000)
      expect(result.current.highTrust).toBe(false)
      expect(result.current.lowTrust).toBe(false)
      expect(result.current.eligible).toBe(false)
    })

    it('should handle loading state', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      const { result } = renderHook(() => useCustomerTrustScore(mockCustomerAddress))

      expect(result.current.isLoading).toBe(true)
    })
  })

  // ==================== useSetAutoConvert ====================
  describe('useSetAutoConvert', () => {
    it('should enable auto-convert', () => {
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useSetAutoConvert())

      act(() => {
        result.current.setAutoConvert(true)
      })

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'setAutoConvert',
          args: [true],
        })
      )
    })

    it('should disable auto-convert', () => {
      const mockWriteContract = jest.fn()
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useSetAutoConvert())

      act(() => {
        result.current.setAutoConvert(false)
      })

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'setAutoConvert',
          args: [false],
        })
      )
    })

    it('should track setting state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: true,
      })

      const { result } = renderHook(() => useSetAutoConvert())

      expect(result.current.isSetting).toBe(true)
    })

    it('should track success state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: false,
      })
      ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      })

      const { result } = renderHook(() => useSetAutoConvert())

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.txHash).toBe(mockTxHash)
    })
  })

  // ==================== useSetPayoutAddress ====================
  describe('useSetPayoutAddress', () => {
    it('should set payout address', () => {
      const mockWriteContract = jest.fn()
      const payoutAddress = '0x7777777777777777777777777777777777777777' as `0x${string}`
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useSetPayoutAddress())

      act(() => {
        result.current.setPayoutAddress(payoutAddress)
      })

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'setPayoutAddress',
          args: [payoutAddress],
        })
      )
    })

    it('should track setting state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: true,
      })

      const { result } = renderHook(() => useSetPayoutAddress())

      expect(result.current.isSetting).toBe(true)
    })

    it('should track success state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContract: jest.fn(),
        data: mockTxHash,
        isPending: false,
      })
      ;(useWaitForTransactionReceipt as Mock).mockReturnValue({
        isLoading: false,
        isSuccess: true,
      })

      const { result } = renderHook(() => useSetPayoutAddress())

      expect(result.current.isSuccess).toBe(true)
      expect(result.current.txHash).toBe(mockTxHash)
    })
  })

  // ==================== useIsMerchant - Extended ====================
  describe('useIsMerchant - Extended', () => {
    it('should return full merchant info', () => {
      const mockMerchantInfo = [
        true, // registered
        false, // suspended
        'Test Business', // businessName
        'Retail', // category
        BigInt(1700000000), // registeredAt
        BigInt('5000000000000000000000'), // totalVolume (5000 ETH)
        BigInt(100), // txCount
      ] as const
      ;(useReadContract as Mock).mockReturnValue({
        data: mockMerchantInfo,
        isLoading: false,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useIsMerchant())

      expect(result.current.isMerchant).toBe(true)
      expect(result.current.isSuspended).toBe(false)
      expect(result.current.businessName).toBe('Test Business')
      expect(result.current.category).toBe('Retail')
      expect(result.current.registeredAt).toBe(1700000000)
      expect(result.current.totalVolume).toBe('5000')
      expect(result.current.txCount).toBe(100)
    })

    it('should return suspended merchant info', () => {
      const mockMerchantInfo = [
        true, // registered
        true, // suspended
        'Suspended Business',
        'Services',
        BigInt(1600000000),
        BigInt('1000000000000000000000'),
        BigInt(50),
      ] as const
      ;(useReadContract as Mock).mockReturnValue({
        data: mockMerchantInfo,
        isLoading: false,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useIsMerchant())

      expect(result.current.isMerchant).toBe(true)
      expect(result.current.isSuspended).toBe(true)
    })

    it('should use provided address', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        refetch: jest.fn(),
      })

      renderHook(() => useIsMerchant(mockMerchantAddress))

      expect(useReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [mockMerchantAddress],
        })
      )
    })

    it('should handle loading state', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        refetch: jest.fn(),
      })

      const { result } = renderHook(() => useIsMerchant())

      expect(result.current.isLoading).toBe(true)
    })
  })

  // ==================== useRegisterMerchant - Extended ====================
  describe('useRegisterMerchant - Extended', () => {
    it('should register merchant with business info', async () => {
      const mockWriteAsync = jest.fn().mockResolvedValue(mockTxHash)
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: mockTxHash,
        isPending: false,
      })

      const { result } = renderHook(() => useRegisterMerchant())

      await act(async () => {
        const response = await result.current.registerMerchant('My Business', 'Electronics')
        expect(response.success).toBe(true)
      })

      expect(mockWriteAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'registerMerchant',
          args: ['My Business', 'Electronics'],
        })
      )
    })

    it('should handle registration error', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue(new Error('Already registered'))
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useRegisterMerchant())

      await act(async () => {
        const response = await result.current.registerMerchant('My Business', 'Food')
        expect(response.success).toBe(false)
        expect(response.error).toContain('Already registered')
      })
    })

    it('should track registering state', () => {
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: jest.fn(),
        data: mockTxHash,
        isPending: true,
      })

      const { result } = renderHook(() => useRegisterMerchant())

      expect(result.current.isRegistering).toBe(true)
    })

    it('should handle non-Error object rejection', async () => {
      const mockWriteAsync = jest.fn().mockRejectedValue({ code: 'UNKNOWN' })
      ;(useWriteContract as Mock).mockReturnValue({
        writeContractAsync: mockWriteAsync,
        data: undefined,
        isPending: false,
      })

      const { result } = renderHook(() => useRegisterMerchant())

      await act(async () => {
        const response = await result.current.registerMerchant('Test', 'Test')
        expect(response.success).toBe(false)
        expect(response.error).toContain('Transaction failed')
      })
    })
  })
})
