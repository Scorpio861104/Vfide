/**
 * Real Mentor Hooks Tests
 * Tests for useMentorHooks to increase coverage
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'

// Mock wagmi
const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()
const mockUseWriteContract = jest.fn()
const mockUseWaitForTransactionReceipt = jest.fn()

jest.mock('wagmi', () => ({ /* CANONICAL_WAGMI_MOCK_V2 */
  useAccount: () => mockUseAccount(),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
  useWriteContract: (...args) => mockUseWriteContract(...args),
  useWaitForTransactionReceipt: (...args) => mockUseWaitForTransactionReceipt(...args),
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
  SeerViewABI: [],
  SeerSocialABI: [],
}))

// Import hooks after mocks
import {
  useIsMentor,
  useBecomeMentor,
  useSponsorMentee,
  useMentorInfo,
} from '../../hooks/useMentorHooks'

describe('useIsMentor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0xuser' })
  })

  it('returns isMentor true when data is true', () => {
    // getMentorInfo returns tuple: [isMentor, mentor, menteeCount, hasMentor, canBecomeMentor, minScoreToMentor, currentScore]
    mockUseReadContract.mockReturnValue({
      data: [true, '0xmentor', BigInt(5), true, false, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useIsMentor())
    
    expect(result.current.isMentor).toBe(true)
  })

  it('returns isMentor false when data is false', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000', BigInt(0), false, false, BigInt(7000), BigInt(5000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useIsMentor())
    
    expect(result.current.isMentor).toBe(false)
  })

  it('returns isMentor false when data is undefined', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
    })
    
    const { result } = renderHook(() => useIsMentor())
    
    expect(result.current.isMentor).toBe(false)
  })

  it('returns isLoading state', () => {
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: true,
    })
    
    const { result } = renderHook(() => useIsMentor())
    
    expect(result.current.isLoading).toBe(true)
  })

  it('uses connected address when no address provided', () => {
    mockUseAccount.mockReturnValue({ address: '0xconnected' })
    mockUseReadContract.mockReturnValue({ data: [true, '0xmentor', BigInt(0), false, false, BigInt(0), BigInt(0)], isLoading: false })
    
    renderHook(() => useIsMentor('0xconnected'))
    
    expect(mockUseReadContract).toHaveBeenCalledWith(expect.objectContaining({
      args: ['0xconnected'],
    }))
  })

  it('uses provided address when given', () => {
    mockUseAccount.mockReturnValue({ address: '0xconnected' })
    mockUseReadContract.mockReturnValue({ data: true, isLoading: false })
    
    renderHook(() => useIsMentor('0xprovided'))
    
    expect(mockUseReadContract).toHaveBeenCalledWith(expect.objectContaining({
      args: ['0xprovided'],
    }))
  })
})

describe('useBecomeMentor', () => {
  const mockWriteContract = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides becomeMentor function', () => {
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(typeof result.current.becomeMentor).toBe('function')
  })

  it('returns isLoading false when not pending', () => {
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(result.current.isLoading).toBe(false)
  })

  it('returns isLoading true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(result.current.isLoading).toBe(true)
  })

  it('returns isLoading true when confirming', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: true,
      isSuccess: false,
    })
    
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(result.current.isLoading).toBe(true)
  })

  it('returns isSuccess when confirmed', () => {
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: true,
    })
    
    const { result } = renderHook(() => useBecomeMentor())
    
    expect(result.current.isSuccess).toBe(true)
  })

  it('calls writeContract when becomeMentor is called', () => {
    const { result } = renderHook(() => useBecomeMentor())
    
    result.current.becomeMentor()
    
    expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'becomeMentor',
    }))
  })
})

describe('useSponsorMentee', () => {
  const mockWriteContract = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('provides sponsorMentee function', () => {
    const { result } = renderHook(() => useSponsorMentee('0xmentee'))
    
    expect(typeof result.current.sponsorMentee).toBe('function')
  })

  it('returns isSponsoring false when not pending', () => {
    const { result } = renderHook(() => useSponsorMentee('0xmentee'))
    
    expect(result.current.isSponsoring).toBe(false)
  })

  it('returns isSponsoring true when pending', () => {
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: true,
    })
    
    const { result } = renderHook(() => useSponsorMentee('0xmentee'))
    
    expect(result.current.isSponsoring).toBe(true)
  })

  it('calls writeContract with mentee address', () => {
    const { result } = renderHook(() => useSponsorMentee('0xmentee123'))
    
    result.current.sponsorMentee()
    
    expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'sponsorMentee',
      args: ['0xmentee123'],
    }))
  })
})

describe('useMentorInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAccount.mockReturnValue({ address: '0xuser' })
  })

  // Hook returns tuple: [isMentor, mentor, menteeCount, hasMentor, canBecomeMentor, minScoreToMentor, currentScore]
  it('returns mentor address when available', () => {
    mockUseReadContract.mockReturnValue({
      data: [true, '0xmentor' as `0x${string}`, BigInt(5), true, false, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.mentor).toBe('0xmentor')
  })

  it('returns hasMentor true when mentor is set', () => {
    mockUseReadContract.mockReturnValue({
      data: [true, '0xmentor' as `0x${string}`, BigInt(5), true, false, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.hasMentor).toBe(true)
  })

  it('returns hasMentor false when mentor is zero address', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000' as `0x${string}`, BigInt(0), false, false, BigInt(7000), BigInt(5000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.hasMentor).toBeFalsy()
  })

  it('returns menteeCount', () => {
    mockUseReadContract.mockReturnValue({
      data: [true, '0xmentor' as `0x${string}`, BigInt(10), true, false, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.menteeCount).toBe(10)
  })

  it('returns menteeCount 0 when undefined', () => {
    mockUseReadContract.mockReturnValue({ data: undefined, isLoading: false })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.menteeCount).toBe(0)
  })

  it('returns canBecomeMentor true when flag is true', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000' as `0x${string}`, BigInt(0), false, true, BigInt(7000), BigInt(8000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.canBecomeMentor).toBeTruthy()
  })

  it('returns minScoreToMentor', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000' as `0x${string}`, BigInt(0), false, false, BigInt(7000), BigInt(5000)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.minScoreToMentor).toBe(7000)
  })

  it('returns currentScore', () => {
    mockUseReadContract.mockReturnValue({
      data: [false, '0x0000000000000000000000000000000000000000' as `0x${string}`, BigInt(0), false, false, BigInt(7000), BigInt(8500)],
      isLoading: false,
    })
    
    const { result } = renderHook(() => useMentorInfo('0xuser'))
    
    expect(result.current.currentScore).toBe(8500)
  })
})
