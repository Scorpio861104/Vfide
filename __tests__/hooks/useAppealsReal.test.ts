/**
 * Real appeals hooks tests
 * Verifies fail-closed behavior when SeerSocial is not configured.
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'

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

jest.mock('../../lib/contracts', () => ({
  // CANONICAL_CONTRACTS_MOCK_V2
  CONTRACT_ADDRESSES: contractAddresses,
  CONTRACTS: {},
  getContractAddresses: () => ({}),
  isConfiguredContractAddress: (address?: string | null) =>,
  validateContractAddress: (addr) => addr,
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  CURRENT_CHAIN_ID: 84532,
  SeerSocial: '0x1234567890123456789012345678901234567890',
  getContractConfigurationError: (name: string) => new Error(`[VFIDE] ${name} contract not configured.`),
}))

jest.mock('../../lib/abis', () => ({
  SeerSocialABI: [],
}))

import { useAppealStatus, useFileAppeal } from '../../hooks/useAppeals'
import { CONTRACT_ADDRESSES as mockContractAddresses } from '../../lib/contracts'

describe('useAppealStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockContractAddresses.SeerSocial = '0x1234567890123456789012345678901234567890'
    mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567891' })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })
  })

  it('parses an active appeal tuple', () => {
    mockUseReadContract.mockReturnValue({
      data: ['0x1234567890123456789012345678901234567891', 'review me', 10n, false, false, ''],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })

    const { result } = renderHook(() => useAppealStatus('0x1234567890123456789012345678901234567891'))

    expect(result.current.hasAppeal).toBe(true)
    expect(result.current.reason).toBe('review me')
  })

  it('returns default status when SeerSocial is missing', () => {
    mockContractAddresses.SeerSocial = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useAppealStatus('0x1234567890123456789012345678901234567891'))

    expect(result.current.hasAppeal).toBe(false)
    expect(result.current.error ?? null).toBeNull()
  })
})

describe('useFileAppeal', () => {
  const mockWriteContract = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockContractAddresses.SeerSocial = '0x1234567890123456789012345678901234567890'
    mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567891' })
    mockUseWriteContract.mockReturnValue({
      writeContract: mockWriteContract,
      data: undefined,
      isPending: false,
      error: null,
    })
    mockUseWaitForTransactionReceipt.mockReturnValue({
      isLoading: false,
      isSuccess: false,
    })
  })

  it('calls writeContract for a valid appeal', () => {
    const { result } = renderHook(() => useFileAppeal())

    result.current.fileAppeal('help')

    expect(mockWriteContract).toHaveBeenCalledWith(expect.objectContaining({
      functionName: 'fileAppeal',
      args: ['help'],
    }))
  })

  it('fails closed when SeerSocial is not configured', () => {
    mockContractAddresses.SeerSocial = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useFileAppeal())

    result.current.fileAppeal('help')

    expect(mockWriteContract).not.toHaveBeenCalled()
  })
})
