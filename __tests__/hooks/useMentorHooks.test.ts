/**
 * Tests for useMentorHooks
 * Mentor system hooks for helping new users succeed
 */
import { describe, expect, it, beforeEach } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'

// Mock wagmi
jest.mock('wagmi', () => ({
  useReadContract: jest.fn(),
  useWriteContract: jest.fn(),
  useAccount: jest.fn(),
  useWaitForTransactionReceipt: jest.fn(),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    Seer: '0x1234567890123456789012345678901234567890',
  },
}))

// Mock abis
jest.mock('@/lib/abis', () => ({
  SeerABI: [],
}))

describe('useMentorHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('useIsMentor', () => {
    it('should return false when not a mentor', async () => {
      const { useReadContract, useAccount } = await import('wagmi')
      jest.mocked(useAccount).mockReturnValue({
        address: '0xabc123',
        isConnecting: false,
        isDisconnected: false,
        isConnected: true,
        isReconnecting: false,
        status: 'connected',
        addresses: ['0xabc123' as `0x${string}`],
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      })
      jest.mocked(useReadContract).mockReturnValue({
        data: false,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        status: 'success',
        isFetching: false,
        isFetched: true,
        isPending: false,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useIsMentor } = await import('@/hooks/useMentorHooks')
      const { result } = renderHook(() => useIsMentor())

      expect(result.current.isMentor).toBe(false)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return true when user is a mentor', async () => {
      const { useReadContract, useAccount } = await import('wagmi')
      jest.mocked(useAccount).mockReturnValue({
        address: '0xmentor123',
        isConnecting: false,
        isDisconnected: false,
        isConnected: true,
        isReconnecting: false,
        status: 'connected',
        addresses: ['0xmentor123' as `0x${string}`],
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      })
      jest.mocked(useReadContract).mockReturnValue({
        data: true,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        status: 'success',
        isFetching: false,
        isFetched: true,
        isPending: false,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useIsMentor } = await import('@/hooks/useMentorHooks')
      const { result } = renderHook(() => useIsMentor())

      expect(result.current.isMentor).toBe(true)
    })

    it('should handle loading state', async () => {
      const { useReadContract, useAccount } = await import('wagmi')
      jest.mocked(useAccount).mockReturnValue({
        address: '0xuser',
        isConnecting: false,
        isDisconnected: false,
        isConnected: true,
        isReconnecting: false,
        status: 'connected',
        addresses: ['0xuser' as `0x${string}`],
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      })
      jest.mocked(useReadContract).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isSuccess: false,
        status: 'pending',
        isFetching: true,
        isFetched: false,
        isPending: true,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        fetchStatus: 'fetching',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useIsMentor } = await import('@/hooks/useMentorHooks')
      const { result } = renderHook(() => useIsMentor())

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isMentor).toBe(false)
    })

    it('should use provided address instead of connected address', async () => {
      const { useReadContract, useAccount } = await import('wagmi')
      jest.mocked(useAccount).mockReturnValue({
        address: '0xconnected',
        isConnecting: false,
        isDisconnected: false,
        isConnected: true,
        isReconnecting: false,
        status: 'connected',
        addresses: ['0xconnected' as `0x${string}`],
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      })
      jest.mocked(useReadContract).mockReturnValue({
        data: true,
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        status: 'success',
        isFetching: false,
        isFetched: true,
        isPending: false,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useIsMentor } = await import('@/hooks/useMentorHooks')
      const customAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
      const { result } = renderHook(() => useIsMentor(customAddress))

      expect(result.current.isMentor).toBe(true)
      expect(useReadContract).toHaveBeenCalled()
    })
  })

  describe('useBecomeMentor', () => {
    it('should provide becomeMentor function', async () => {
      const mockWriteContract = jest.fn()
      const { useWriteContract, useWaitForTransactionReceipt } = await import('wagmi')
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        isSuccess: false,
        isIdle: true,
        error: null,
        reset: jest.fn(),
        writeContractAsync: jest.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        status: 'idle',
        submittedAt: 0,
        variables: undefined,
      })
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        isError: false,
        data: undefined,
        error: null,
        status: 'pending',
        isFetching: false,
        isFetched: false,
        isPending: true,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useBecomeMentor } = await import('@/hooks/useMentorHooks')
      const { result } = renderHook(() => useBecomeMentor())

      expect(result.current.becomeMentor).toBeDefined()
      expect(typeof result.current.becomeMentor).toBe('function')
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isSuccess).toBe(false)
    })

    it('should call writeContract when becomeMentor is invoked', async () => {
      const mockWriteContract = jest.fn()
      const { useWriteContract, useWaitForTransactionReceipt } = await import('wagmi')
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        isSuccess: false,
        isIdle: true,
        error: null,
        reset: jest.fn(),
        writeContractAsync: jest.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        status: 'idle',
        submittedAt: 0,
        variables: undefined,
      })
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        isError: false,
        data: undefined,
        error: null,
        status: 'pending',
        isFetching: false,
        isFetched: false,
        isPending: true,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useBecomeMentor } = await import('@/hooks/useMentorHooks')
      const { result } = renderHook(() => useBecomeMentor())

      result.current.becomeMentor()
      expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'becomeMentor',
      }))
    })

    it('should show loading state during transaction', async () => {
      const { useWriteContract, useWaitForTransactionReceipt } = await import('wagmi')
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: jest.fn(),
        data: '0xtxhash' as `0x${string}`,
        isPending: true,
        isError: false,
        isSuccess: false,
        isIdle: false,
        error: null,
        reset: jest.fn(),
        writeContractAsync: jest.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        status: 'pending',
        submittedAt: Date.now(),
        variables: undefined,
      })
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        isError: false,
        data: undefined,
        error: null,
        status: 'pending',
        isFetching: false,
        isFetched: false,
        isPending: true,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useBecomeMentor } = await import('@/hooks/useMentorHooks')
      const { result } = renderHook(() => useBecomeMentor())

      expect(result.current.isLoading).toBe(true)
    })

    it('should show success state after transaction confirms', async () => {
      const { useWriteContract, useWaitForTransactionReceipt } = await import('wagmi')
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: jest.fn(),
        data: '0xtxhash' as `0x${string}`,
        isPending: false,
        isError: false,
        isSuccess: true,
        isIdle: false,
        error: null,
        reset: jest.fn(),
        writeContractAsync: jest.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        status: 'success',
        submittedAt: Date.now(),
        variables: undefined,
      })
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: true,
        isError: false,
        data: {} as any,
        error: null,
        status: 'success',
        isFetching: false,
        isFetched: true,
        isPending: false,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useBecomeMentor } = await import('@/hooks/useMentorHooks')
      const { result } = renderHook(() => useBecomeMentor())

      expect(result.current.isSuccess).toBe(true)
    })
  })

  describe('useSponsorMentee', () => {
    it('should provide sponsorMentee function', async () => {
      const mockWriteContract = jest.fn()
      const { useWriteContract, useWaitForTransactionReceipt } = await import('wagmi')
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        isSuccess: false,
        isIdle: true,
        error: null,
        reset: jest.fn(),
        writeContractAsync: jest.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        status: 'idle',
        submittedAt: 0,
        variables: undefined,
      })
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        isError: false,
        data: undefined,
        error: null,
        status: 'pending',
        isFetching: false,
        isFetched: false,
        isPending: true,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useSponsorMentee } = await import('@/hooks/useMentorHooks')
      const menteeAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
      const { result } = renderHook(() => useSponsorMentee(menteeAddress))

      expect(result.current.sponsorMentee).toBeDefined()
      expect(typeof result.current.sponsorMentee).toBe('function')
    })

    it('should call writeContract with mentee address', async () => {
      const mockWriteContract = jest.fn()
      const { useWriteContract, useWaitForTransactionReceipt } = await import('wagmi')
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: mockWriteContract,
        data: undefined,
        isPending: false,
        isError: false,
        isSuccess: false,
        isIdle: true,
        error: null,
        reset: jest.fn(),
        writeContractAsync: jest.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        status: 'idle',
        submittedAt: 0,
        variables: undefined,
      })
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: false,
        isSuccess: false,
        isError: false,
        data: undefined,
        error: null,
        status: 'pending',
        isFetching: false,
        isFetched: false,
        isPending: true,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useSponsorMentee } = await import('@/hooks/useMentorHooks')
      const menteeAddress = '0xmentee123456789012345678901234567890abc' as `0x${string}`
      const { result } = renderHook(() => useSponsorMentee(menteeAddress))

      result.current.sponsorMentee()
      expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
        functionName: 'sponsorMentee',
        args: [menteeAddress],
      }))
    })

    it('should track isSponsoring state', async () => {
      const { useWriteContract, useWaitForTransactionReceipt } = await import('wagmi')
      jest.mocked(useWriteContract).mockReturnValue({
        writeContract: jest.fn(),
        data: '0xtxhash' as `0x${string}`,
        isPending: true,
        isError: false,
        isSuccess: false,
        isIdle: false,
        error: null,
        reset: jest.fn(),
        writeContractAsync: jest.fn(),
        context: undefined,
        failureCount: 0,
        failureReason: null,
        status: 'pending',
        submittedAt: Date.now(),
        variables: undefined,
      })
      jest.mocked(useWaitForTransactionReceipt).mockReturnValue({
        isLoading: true,
        isSuccess: false,
        isError: false,
        data: undefined,
        error: null,
        status: 'pending',
        isFetching: true,
        isFetched: false,
        isPending: true,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: 0,
        errorUpdatedAt: 0,
        fetchStatus: 'fetching',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useSponsorMentee } = await import('@/hooks/useMentorHooks')
      const menteeAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
      const { result } = renderHook(() => useSponsorMentee(menteeAddress))

      expect(result.current.isSponsoring).toBe(true)
    })
  })

  describe('useMentorInfo', () => {
    it('should return mentor info for a user', async () => {
      const { useReadContract, useAccount } = await import('wagmi')
      jest.mocked(useAccount).mockReturnValue({
        address: '0xuser123',
        isConnecting: false,
        isDisconnected: false,
        isConnected: true,
        isReconnecting: false,
        status: 'connected',
        addresses: ['0xuser123' as `0x${string}`],
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      })
      jest.mocked(useReadContract).mockReturnValue({
        data: '0xmentor456',
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        status: 'success',
        isFetching: false,
        isFetched: true,
        isPending: false,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useMentorInfo } = await import('@/hooks/useMentorHooks')
      const { result } = renderHook(() => useMentorInfo())

      expect(useReadContract).toHaveBeenCalled()
    })

    it('should accept custom address', async () => {
      const { useReadContract, useAccount } = await import('wagmi')
      jest.mocked(useAccount).mockReturnValue({
        address: '0xconnected',
        isConnecting: false,
        isDisconnected: false,
        isConnected: true,
        isReconnecting: false,
        status: 'connected',
        addresses: ['0xconnected' as `0x${string}`],
        chain: undefined,
        chainId: undefined,
        connector: undefined,
      })
      jest.mocked(useReadContract).mockReturnValue({
        data: '0xmentor789',
        isLoading: false,
        isError: false,
        error: null,
        isSuccess: true,
        status: 'success',
        isFetching: false,
        isFetched: true,
        isPending: false,
        failureCount: 0,
        failureReason: null,
        isRefetching: false,
        refetch: jest.fn(),
        dataUpdatedAt: Date.now(),
        errorUpdatedAt: 0,
        fetchStatus: 'idle',
        isStale: false,
        isPlaceholderData: false,
        queryKey: [],
      })

      const { useMentorInfo } = await import('@/hooks/useMentorHooks')
      const customAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
      const { result } = renderHook(() => useMentorInfo(customAddress))

      expect(useReadContract).toHaveBeenCalled()
    })
  })
})
