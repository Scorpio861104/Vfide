/**
 * Tests for useVaultRecovery hook
 * Vault recovery functionality including guardians and next of kin
 */
import { describe, expect, it, vi, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi
jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK */
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
  http: jest.fn(() => ({})),
}))

// Mock viem
jest.mock('viem', () => ({
  parseAbi: jest.fn(() => []),
  isAddress: jest.fn((addr: string) => typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42),
  parseAbiItem: jest.fn((sig: any) => ({ name: typeof sig === 'string' ? sig.split(' ')[1]?.split('(')[0] : '', type: 'function' })),
  formatUnits: jest.fn((v: any) => String(v)),
  parseUnits: jest.fn((v: any) => BigInt(v || 0)),
  formatEther: jest.fn((v: any) => String(v)),
  parseEther: jest.fn((v: any) => BigInt(v || 0)),
  getAddress: jest.fn((a: string) => a),
  encodeFunctionData: jest.fn(() => '0x'),
  decodeFunctionResult: jest.fn(() => undefined),
  encodeAbiParameters: jest.fn(() => '0x'),
  decodeAbiParameters: jest.fn(() => []),
  keccak256: jest.fn(() => '0x' + '0'.repeat(64)),
  toBytes: jest.fn(() => new Uint8Array()),
  toHex: jest.fn((v: any) => '0x' + (v ?? '').toString(16)),
  hexToString: jest.fn((h: any) => String(h)),
  padHex: jest.fn((h: any) => h),
  zeroAddress: '0x0000000000000000000000000000000000000000',
  stringToHex: jest.fn((s: any) => '0x' + Buffer.from(String(s)).toString('hex')),
  createPublicClient: jest.fn(() => ({ readContract: jest.fn(), getBlockNumber: jest.fn() })),
  createWalletClient: jest.fn(() => ({ writeContract: jest.fn() })),
  http: jest.fn(() => ({})),
  custom: jest.fn(() => ({})),
  erc20Abi: [],
  erc721Abi: [],
}))

describe('useVaultRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return initial recovery status', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent, useChainId, usePublicClient } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xuser123' as `0x${string}`,
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
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})
    jest.mocked(useChainId).mockReturnValue(84532)
    jest.mocked(usePublicClient).mockReturnValue({ waitForTransactionReceipt: jest.fn().mockResolvedValue({}) } as any)

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.recoveryStatus).toBeDefined()
    expect(result.current.recoveryStatus.isActive).toBe(false)
    expect(result.current.recoveryStatus.proposedOwner).toBeNull()
  })

  it('should return vault owner', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xuser123' as `0x${string}`,
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
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: '0xowner456' as `0x${string}`,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.vaultOwner).toBeDefined()
  })

  it('should return guardian count', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xuser123' as `0x${string}`,
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
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.guardianCount).toBeDefined()
  })

  it('should check if user is guardian', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xguardian123' as `0x${string}`,
      isConnecting: false,
      isDisconnected: false,
      isConnected: true,
      isReconnecting: false,
      status: 'connected',
      addresses: ['0xguardian123' as `0x${string}`],
      chain: undefined,
      chainId: undefined,
      connector: undefined,
    })
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.isUserGuardian).toBeDefined()
  })

  it('should provide setNextOfKin function', async () => {
    const mockWriteContractAsync = jest.fn()
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xowner' as `0x${string}`,
      isConnecting: false,
      isDisconnected: false,
      isConnected: true,
      isReconnecting: false,
      status: 'connected',
      addresses: ['0xowner' as `0x${string}`],
      chain: undefined,
      chainId: undefined,
      connector: undefined,
    })
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.setNextOfKinAddress).toBeDefined()
    expect(typeof result.current.setNextOfKinAddress).toBe('function')
  })

  it('should provide setGuardian function', async () => {
    const mockWriteContractAsync = jest.fn()
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xowner' as `0x${string}`,
      isConnecting: false,
      isDisconnected: false,
      isConnected: true,
      isReconnecting: false,
      status: 'connected',
      addresses: ['0xowner' as `0x${string}`],
      chain: undefined,
      chainId: undefined,
      connector: undefined,
    })
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.addGuardian).toBeDefined()
    expect(typeof result.current.addGuardian).toBe('function')
    expect(result.current.removeGuardian).toBeDefined()
    expect(typeof result.current.removeGuardian).toBe('function')
  })

  it('should provide requestRecovery function', async () => {
    const mockWriteContractAsync = jest.fn()
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xguardian' as `0x${string}`,
      isConnecting: false,
      isDisconnected: false,
      isConnected: true,
      isReconnecting: false,
      status: 'connected',
      addresses: ['0xguardian' as `0x${string}`],
      chain: undefined,
      chainId: undefined,
      connector: undefined,
    })
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.requestRecovery).toBeDefined()
    expect(typeof result.current.requestRecovery).toBe('function')
  })

  it('should provide approveRecovery function', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xguardian' as `0x${string}`,
      isConnecting: false,
      isDisconnected: false,
      isConnected: true,
      isReconnecting: false,
      status: 'connected',
      addresses: ['0xguardian' as `0x${string}`],
      chain: undefined,
      chainId: undefined,
      connector: undefined,
    })
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.approveRecovery).toBeDefined()
    expect(typeof result.current.approveRecovery).toBe('function')
  })

  it('should provide cancelRecovery function', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xowner' as `0x${string}`,
      isConnecting: false,
      isDisconnected: false,
      isConnected: true,
      isReconnecting: false,
      status: 'connected',
      addresses: ['0xowner' as `0x${string}`],
      chain: undefined,
      chainId: undefined,
      connector: undefined,
    })
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.cancelRecovery).toBeDefined()
    expect(typeof result.current.cancelRecovery).toBe('function')
  })

  it('should provide finalizeRecovery function', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xproposed' as `0x${string}`,
      isConnecting: false,
      isDisconnected: false,
      isConnected: true,
      isReconnecting: false,
      status: 'connected',
      addresses: ['0xproposed' as `0x${string}`],
      chain: undefined,
      chainId: undefined,
      connector: undefined,
    })
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.finalizeRecovery).toBeDefined()
    expect(typeof result.current.finalizeRecovery).toBe('function')
  })

  it('should return isWritePending status', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xuser' as `0x${string}`,
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
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: true,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: false,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'pending',
      submittedAt: Date.now(),
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    expect(result.current.isWritePending).toBe(true)
  })

  it('should handle undefined vault address', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xuser' as `0x${string}`,
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
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: undefined,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const { result } = renderHook(() => useVaultRecovery(undefined))

    expect(result.current.recoveryStatus).toBeDefined()
  })

  it('should return nextOfKin', async () => {
    const { useAccount, useWriteContract, useReadContract, useWatchContractEvent } = await import('wagmi')
    
    jest.mocked(useAccount).mockReturnValue({
      address: '0xuser' as `0x${string}`,
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
    
    jest.mocked(useWriteContract).mockReturnValue({
      writeContractAsync: jest.fn(),
      isPending: false,
      writeContract: jest.fn(),
      data: undefined,
      isError: false,
      isSuccess: false,
      isIdle: true,
      error: null,
      reset: jest.fn(),
      context: undefined,
      failureCount: 0,
      failureReason: null,
      status: 'idle',
      submittedAt: 0,
      variables: undefined,
    })
    
    jest.mocked(useReadContract).mockReturnValue({
      data: '0xnextofkin' as `0x${string}`,
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
    
    jest.mocked(useWatchContractEvent).mockImplementation(() => {})

    const { useVaultRecovery } = await import('@/hooks/useVaultRecovery')
    const vaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
    const { result } = renderHook(() => useVaultRecovery(vaultAddress))

    // In CardBound mode (the default), inheritance is not supported so nextOfKin is undefined.
    // The property should still exist on the return object.
    expect(result.current).toHaveProperty('nextOfKin')
  })
})
