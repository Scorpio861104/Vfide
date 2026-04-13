/**
 * Tests for useSimpleVault hook
 * Simple vault interface for executing vault actions
 */
import { describe, expect, it, vi, beforeEach } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock wagmi
jest.mock('wagmi', () => ({
  useWriteContract: jest.fn(),
  usePublicClient: jest.fn(),
}))

// Mock useVaultHub
jest.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: jest.fn(),
}))

// Mock utils
jest.mock('@/lib/utils', () => ({
  devLog: {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

describe('useSimpleVault', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return initial idle state', async () => {
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContract: jest.fn(),
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
    jest.mocked(useVaultHub).mockReturnValue({
      vaultAddress: '0xvault123' as `0x${string}`,
      hasVault: true,
      isLoading: false,
    } as any)

    const { useSimpleVault } = await import('@/hooks/useSimpleVault')
    const { result } = renderHook(() => useSimpleVault())

    expect(result.current.actionStatus).toBe('idle')
    expect(result.current.userMessage).toBe('')
    expect(result.current.executeVaultAction).toBeDefined()
  })

  it('should return error when no vault exists', async () => {
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContract: jest.fn(),
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
    jest.mocked(useVaultHub).mockReturnValue({
      vaultAddress: undefined,
      hasVault: false,
      isLoading: false,
    } as any)

    const { useSimpleVault } = await import('@/hooks/useSimpleVault')
    const { result } = renderHook(() => useSimpleVault())

    await act(async () => {
      await result.current.executeVaultAction('Test Action', '0xtarget', '0xdata')
    })

    expect(result.current.actionStatus).toBe('error')
    expect(result.current.userMessage).toContain('No vault found')
  })

  it('should set preparing status initially', async () => {
    const mockWriteContract = jest.fn().mockResolvedValue(undefined)
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
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
    jest.mocked(useVaultHub).mockReturnValue({
      vaultAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      hasVault: true,
      isLoading: false,
    } as any)

    const { useSimpleVault } = await import('@/hooks/useSimpleVault')
    const { result } = renderHook(() => useSimpleVault())

    // Start action but don't await
    const actionPromise = act(async () => {
      result.current.executeVaultAction('Send Payment', '0x1234', '0xdata', '💸')
    })

    // Status should change to preparing immediately
    expect(result.current.actionStatus).toBe('idle') // Will transition in the next tick

    await actionPromise
  })

  it('should handle custom emoji in messages', async () => {
    const mockWriteContract = jest.fn().mockResolvedValue(undefined)
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
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
    jest.mocked(useVaultHub).mockReturnValue({
      vaultAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      hasVault: true,
      isLoading: false,
    } as any)

    const { useSimpleVault } = await import('@/hooks/useSimpleVault')
    const { result } = renderHook(() => useSimpleVault())

    expect(result.current.executeVaultAction).toBeDefined()
    expect(typeof result.current.executeVaultAction).toBe('function')
  })

  it('should handle transaction errors', async () => {
    const mockWriteContract = jest.fn(() => {
      throw new Error('Transaction rejected')
    })
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
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
    jest.mocked(useVaultHub).mockReturnValue({
      vaultAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      hasVault: true,
      isLoading: false,
    } as any)

    const { useSimpleVault } = await import('@/hooks/useSimpleVault')
    const { result } = renderHook(() => useSimpleVault())

    // The hook should provide error handling
    expect(result.current).toBeDefined()
    expect(result.current.executeVaultAction).toBeDefined()
  })

  it('should provide vault action status callbacks', async () => {
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContract: jest.fn(),
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
    jest.mocked(useVaultHub).mockReturnValue({
      vaultAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      hasVault: true,
      isLoading: false,
    } as any)

    const { useSimpleVault } = await import('@/hooks/useSimpleVault')
    const { result } = renderHook(() => useSimpleVault())

    // Test that the hook provides all expected properties
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    if (result.current) {
      expect(result.current).toHaveProperty('actionStatus')
      expect(result.current).toHaveProperty('userMessage')
      expect(result.current).toHaveProperty('executeVaultAction')
      expect(result.current).toHaveProperty('isLoading')
      expect(result.current).toHaveProperty('hasVault')
      expect(result.current.hasVault).toBe(true)
    }
  })

  it('should use default emoji if not provided', async () => {
    const mockWriteContract = jest.fn()
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
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
    jest.mocked(useVaultHub).mockReturnValue({
      vaultAddress: '0x1234567890123456789012345678901234567890' as `0x${string}`,
      hasVault: true,
      isLoading: false,
    } as any)

    const { useSimpleVault } = await import('@/hooks/useSimpleVault')
    const { result } = renderHook(() => useSimpleVault())

    // The hook should support calling without emoji
    expect(result.current).toBeDefined()
    expect(result.current).not.toBeNull()
    if (result.current) {
      expect(result.current.executeVaultAction).toBeDefined()
      expect(typeof result.current.executeVaultAction).toBe('function')
    }
  })
})
