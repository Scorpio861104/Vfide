/**
 * Real ProofScore Hooks Tests
 * Tests for useProofScoreHooks to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'

// Mock wagmi
const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseWaitForTransactionReceipt = jest.fn()
const mockUseChainId = jest.fn()
const mockUsePublicClient = jest.fn()

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => mockUseAccount(),
  useChainId: () => mockUseChainId(),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: (...args) => mockUseWriteContract(...args),
  useWaitForTransactionReceipt: (...args) => mockUseWaitForTransactionReceipt(...args),
  useWatchContractEvent: jest.fn(() => undefined),
  usePublicClient: (...args) => mockUsePublicClient(...args),
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

// Mock contracts
jest.mock('../../lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V4
  CONTRACT_ADDRESSES: { VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' },
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({ VFIDEToken: '0x1111111111111111111111111111111111111101', StablecoinRegistry: '0x1111111111111111111111111111111111111102', MerchantPortal: '0x1111111111111111111111111111111111111103', MerchantRegistry: '0x1111111111111111111111111111111111111104', VaultHub: '0x1111111111111111111111111111111111111105', Seer: '0x1111111111111111111111111111111111111106', SeerView: '0x1111111111111111111111111111111111111107', DAO: '0x1111111111111111111111111111111111111108', DAOTimelock: '0x1111111111111111111111111111111111111109', TrustGateway: '0x111111111111111111111111111111111111110a', GuardianRegistry: '0x111111111111111111111111111111111111110b', GuardianLock: '0x111111111111111111111111111111111111110c', PanicGuard: '0x111111111111111111111111111111111111110d', EmergencyBreaker: '0x111111111111111111111111111111111111110e' })),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr) => addr),
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
}))

// Mock ABIs
jest.mock('../../lib/abis', () => ({
  SeerABI: [],
  SeerSocialABI: [],
}))

// Import hooks after mocks
import {
  useProofScore,
  useEndorse,
  useScoreBreakdown,
} from '../../hooks/useProofScoreHooks'

describe('useProofScore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseChainId.mockReturnValue(84532)
    mockUsePublicClient.mockReturnValue({ waitForTransactionReceipt: jest.fn().mockResolvedValue({}) })
    mockUseAccount.mockReturnValue({ address: '0x1234' })
  })

  it('returns Elite tier for score >= 8000', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(8000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('Elite')
    expect(result.current.burnFee).toBe(0.25)
    expect(result.current.isElite).toBe(true)
  })

  it('returns Council tier for score >= 7000', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(7000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('Council')
    expect(result.current.burnFee).toBe(1.44)
  })

  it('returns Neutral tier for score >= 5000', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(5000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('Neutral')
    expect(result.current.burnFee).toBe(3.82)
  })

  it('returns Low Trust tier for score >= 4000', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(4000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('Low Trust')
    expect(result.current.burnFee).toBe(4.22)
  })

  it('returns Risky tier for score < 4000', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(3000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.tier).toBe('Risky')
    expect(result.current.burnFee).toBe(5.0)
  })

  it('returns correct color for Elite tier', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(9000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.color).toBe('#00FF88')
  })

  it('returns correct color for Neutral tier', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(5200),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.color).toBe('#FFD700')
  })

  it('checks can vote capability', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(5400),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.canVote).toBe(true)
  })

  it('checks can merchant capability', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(5600),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.canMerchant).toBe(true)
  })

  it('checks can council capability', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(7000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.canCouncil).toBe(true)
  })

  it('checks can endorse capability', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(8000),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.canEndorse).toBe(true)
  })

  it('returns default score when no data', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.score).toBe(5000) // Default neutral
    expect(result.current.tier).toBe('Neutral')
  })

  it('accepts custom user address', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(8500),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const customAddress = '0xCustom' as `0x${string}`
    const { result } = renderHook(() => useProofScore(customAddress))
    
    expect(result.current.score).toBe(8500)
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useProofScore())
    
    expect(result.current.isLoading).toBe(true)
  })
})

describe('useEndorse', () => {
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

  it('validates target address is set', () => {
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    expect(result.current.isValid).toBe(true)
  })

  it('returns invalid for zero address', () => {
    const { result } = renderHook(() => useEndorse('0x0000000000000000000000000000000000000000' as `0x${string}`))
    
    expect(result.current.isValid).toBe(false)
  })

  it('returns invalid when no address', () => {
    const { result } = renderHook(() => useEndorse())
    
    expect(result.current.isValid).toBe(false)
  })

  it('returns error when endorsing invalid address', async () => {
    const { result } = renderHook(() => useEndorse())
    
    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.endorse()
    })
    
    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Invalid target address')
  })

  it('calls writeContractAsync when endorsing valid address', async () => {
    mockWriteContractAsync.mockResolvedValue({ hash: '0xabc' })
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    await act(async () => {
      await result.current.endorse()
    })
    
    expect(mockWriteContractAsync).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'endorse',
      args: ['0xTarget', 'endorsement'],
    }))
  })

  it('returns success on successful endorsement', async () => {
    mockWriteContractAsync.mockResolvedValue({ hash: '0xabc' })
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    let response: { success: boolean }
    await act(async () => {
      response = await result.current.endorse()
    })
    
    expect(response!.success).toBe(true)
  })

  it('handles endorsement failure', async () => {
    mockWriteContractAsync.mockRejectedValue(new Error('Already endorsed'))
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    let response: { success: boolean; error?: string }
    await act(async () => {
      response = await result.current.endorse()
    })
    
    expect(response!.success).toBe(false)
    expect(response!.error).toBe('Failed to endorse: Already endorsed')
    expect(result.current.error).toBe('Failed to endorse: Already endorsed')
  })

  it('returns isEndorsing true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContractAsync: mockWriteContractAsync,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    expect(result.current.isEndorsing).toBe(true)
  })

  it('returns isSuccess when confirmed', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
    })
    
    const { result } = renderHook(() => useEndorse('0xTarget' as `0x${string}`))
    
    expect(result.current.isSuccess).toBe(true)
  })
})

describe('useScoreBreakdown', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0x1234' })
  })

  it('returns breakdown based on total score', () => {
    mockUseReadContract.mockReturnValue({
      data: BigInt(7500),
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useScoreBreakdown())
    
    expect(result.current).toBeDefined()
  })

  it('returns default score when no data', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useScoreBreakdown())
    
    // Should use default score of 5000
    expect(result.current).toBeDefined()
  })

  it('returns loading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: jest.fn(),
    })
    
    const { result } = renderHook(() => useScoreBreakdown())
    
    expect(result.current.isLoading).toBe(true)
  })
})
