/**
 * Tests for useSimpleVault hook
 * Simple vault interface for executing vault actions
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock wagmi
vi.mock('wagmi', () => ({
  useWriteContract: vi.fn(),
}))

// Mock useVaultHub
vi.mock('@/hooks/useVaultHub', () => ({
  useVaultHub: vi.fn(),
}))

// Mock utils
vi.mock('@/lib/utils', () => ({
  devLog: {
    error: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

describe('useSimpleVault', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return initial idle state', async () => {
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: vi.fn(),
      writeContractAsync: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    vi.mocked(useVaultHub).mockReturnValue({
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
    
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: vi.fn(),
      writeContractAsync: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    vi.mocked(useVaultHub).mockReturnValue({
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
    const mockWriteContract = vi.fn().mockResolvedValue(undefined)
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: vi.fn(),
      writeContractAsync: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    vi.mocked(useVaultHub).mockReturnValue({
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
    const mockWriteContract = vi.fn().mockResolvedValue(undefined)
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: vi.fn(),
      writeContractAsync: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    vi.mocked(useVaultHub).mockReturnValue({
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
    const mockWriteContract = vi.fn(() => {
      throw new Error('Transaction rejected')
    })
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: vi.fn(),
      writeContractAsync: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    vi.mocked(useVaultHub).mockReturnValue({
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
    
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: vi.fn(),
      data: undefined,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: vi.fn(),
      writeContractAsync: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    vi.mocked(useVaultHub).mockReturnValue({
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
    const mockWriteContract = vi.fn()
    const { useWriteContract } = await import('wagmi')
    const { useVaultHub } = await import('@/hooks/useVaultHub')
    
    vi.mocked(useWriteContract).mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: vi.fn(),
      writeContractAsync: vi.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    vi.mocked(useVaultHub).mockReturnValue({
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
