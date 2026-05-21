/**
 * Real Simple Vault Hooks Tests
 * Tests for useSimpleVault to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock useVaultHub first (before other imports)
const mockVaultAddress = jest.fn()

jest.mock('../../hooks/useVaultHub', () => ({
  useVaultHub: () => ({
    vaultAddress: mockVaultAddress(),
  }),
}))

// Mock wagmi
const mockWriteContract = jest.fn()
const mockPublicClient = { waitForTransactionReceipt: jest.fn().mockResolvedValue({}) }

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

// Mock utils
jest.mock('../../lib/utils', () => ({
  devLog: {
    error: jest.fn(),
    log: jest.fn(),
    warn: jest.fn(),
  },
}))

// Mock contracts - disable CardBound mode so generic execute() tests work
jest.mock('@/lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V2
  CONTRACT_ADDRESSES: {},
  CONTRACTS: {},
  getContractAddresses: () => ({}),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr: any) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
  isCardBoundVaultMode: () => false,
}))

// Import hooks after mocks
import {
  useSimpleVault,
  useVaultBalanceSimple,
  useProofScoreSimple,
} from '../../hooks/useSimpleVault'

describe('useSimpleVault', () => {
  const testVaultAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const targetContract = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers({ shouldAdvanceTime: true })
    mockVaultAddress.mockReturnValue(testVaultAddress)
    mockWriteContract.mockResolvedValue('0xtxhash')
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns executeVaultAction function', () => {
    const { result } = renderHook(() => useSimpleVault())
    
    expect(typeof result.current.executeVaultAction).toBe('function')
  })

  it('returns initial actionStatus as idle', () => {
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.actionStatus).toBe('idle')
  })

  it('returns initial userMessage as empty', () => {
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.userMessage).toBe('')
  })

  it('returns isLoading false initially', () => {
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.isLoading).toBe(false)
  })

  it('returns hasVault true when vault address exists', () => {
    mockVaultAddress.mockReturnValue(testVaultAddress)
    
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.hasVault).toBe(true)
  })

  it('returns hasVault false when no vault address', () => {
    mockVaultAddress.mockReturnValue(undefined)
    
    const { result } = renderHook(() => useSimpleVault())
    
    expect(result.current.hasVault).toBe(false)
  })

  it('sets error status when no vault', async () => {
    mockVaultAddress.mockReturnValue(undefined)
    
    const { result } = renderHook(() => useSimpleVault())
    
    await act(async () => {
      await result.current.executeVaultAction('Test', targetContract, '0xdata')
    })
    
    expect(result.current.actionStatus).toBe('error')
    expect(result.current.userMessage).toContain('No vault found')
  })

  it('progresses through status states', async () => {
    const { result } = renderHook(() => useSimpleVault())
    
    // Start the action
    act(() => {
      result.current.executeVaultAction('Send Payment', targetContract, '0xdata', '💸')
    })
    
    // Should be preparing
    await waitFor(() => {
      expect(result.current.actionStatus).toBe('preparing')
    })
  })

  it('uses custom emoji in message', async () => {
    const { result } = renderHook(() => useSimpleVault())
    
    act(() => {
      result.current.executeVaultAction('Stake', targetContract, '0xdata', '🔒')
    })
    
    await waitFor(() => {
      expect(result.current.userMessage).toContain('🔒')
    })
  })
})

describe('useVaultBalanceSimple', () => {
  it('returns balance as BigInt(0)', () => {
    const { result } = renderHook(() => useVaultBalanceSimple())
    
    expect(result.current.balance).toBe(BigInt(0))
  })

  it('returns formatted as "0.00"', () => {
    const { result } = renderHook(() => useVaultBalanceSimple())
    
    expect(result.current.formatted).toBe('0.00')
  })

  it('returns loading as false', () => {
    const { result } = renderHook(() => useVaultBalanceSimple())
    
    expect(result.current.loading).toBe(false)
  })
})

describe('useProofScoreSimple', () => {
  it('returns default score of 5000', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    
    expect(result.current.score).toBe(5000)
  })

  it('returns NEUTRAL tier for default score', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    
    expect(result.current.tier).toBe('NEUTRAL')
  })

  it('returns gold color for NEUTRAL tier', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    
    expect(result.current.tierColor).toBe('#FFD700')
  })

  it('returns loading as false', () => {
    const { result } = renderHook(() => useProofScoreSimple())
    
    expect(result.current.loading).toBe(false)
  })
})
