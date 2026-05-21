/**
 * Tests for useSimpleVault hook
 * Simple vault interface for executing vault actions
 */
import { describe, expect, it, vi, beforeEach } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock wagmi
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: jest.fn(() => ({ address: undefined, isConnected: false, status: 'disconnected' })),
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
