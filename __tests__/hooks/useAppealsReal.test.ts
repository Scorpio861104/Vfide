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

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useWriteContract: () => mockUseWriteContract(),
  useWaitForTransactionReceipt: () => mockUseWaitForTransactionReceipt(),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
  useReadContracts: jest.fn(() => ({ data: undefined, isError: false, isLoading: false, isSuccess: false, error: null, refetch: jest.fn() })),
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
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
}))

jest.mock('../../lib/contracts', () => {
  const contractAddresses = {
    SeerSocial: '0x1234567890123456789012345678901234567890',
  }

  return {
    CONTRACT_ADDRESSES: contractAddresses,
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
    isConfiguredContractAddress: (address?: string | null) =>
      typeof address === 'string' &&
      address !== '0x0000000000000000000000000000000000000000' &&
      address.startsWith('0x') &&
      address.length === 42,
    getContractConfigurationError: (name: string) => new Error(`[VFIDE] ${name} contract not configured.`),
    getContractAddresses: () => ({}),
    validateContractAddress: (addr) => addr,
  }
})

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
