import { describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'

const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
  useChainId: jest.fn(() => 1),
  useSwitchChain: jest.fn(() => ({ switchChain: jest.fn(), switchChainAsync: jest.fn(), chains: [], status: 'idle' })),
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
  WagmiProvider: jest.fn(),
  createConfig: jest.fn(),
  http: jest.fn(),
}))

jest.mock('@/lib/contracts', () => {
  const contractAddresses = {
    Seer: '0x1234567890123456789012345678901234567890',
    BurnRouter: '0x1234567890123456789012345678901234567891',
    SeerABI: [],
    ProofScoreBurnRouterABI: [],
  }

  return {
    CONTRACT_ADDRESSES: contractAddresses,
    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
    SeerABI: [],
    ProofScoreBurnRouterABI: [],
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

import { CONTRACT_ADDRESSES as mockContractAddresses } from '@/lib/contracts'
import { useProofScore, useHasBadge, useSeerThresholds } from '@/hooks/useProofScore'

describe('useProofScore real guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockContractAddresses.Seer = '0x1234567890123456789012345678901234567890'
    mockContractAddresses.ProofScoreBurnRouter = '0x1234567890123456789012345678901234567891'
    mockUseAccount.mockReturnValue({ address: '0x1234567890123456789012345678901234567892' })
    mockUseReadContract.mockReturnValue({
      data: undefined,
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
      error: null,
    })
  })

  it('falls back to defaults when Seer is not configured', () => {
    mockContractAddresses.Seer = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useProofScore())

    expect(result.current.score).toBe(5000)
    expect(result.current.isLoading).toBe(false)
  })

  it('treats score 0n (new user with no on-chain history) as neutral 5000', () => {
    // A new wallet that has never transacted returns 0n from the Seer contract.
    // By design, 0 means "no recorded score yet" — the UI defaults them to neutral
    // (5000) rather than penalising them as Risky. The contract-side fee curve
    // starts accruing properly once the wallet has on-chain activity.
    mockUseReadContract.mockReturnValueOnce({
      data: 0n,
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    })
    // second call is for computeFees (onChainFeeQuote)
    mockUseReadContract.mockReturnValueOnce({
      data: undefined,
      isError: false,
      isLoading: false,
      refetch: jest.fn(),
    })

    const { result } = renderHook(() => useProofScore())

    expect(result.current.score).toBe(5000)
    expect(result.current.tierName).toBe('Neutral')
    expect(result.current.burnFee).toBe(2.5)
  })

  it('returns badge defaults when Seer is not configured', () => {
    mockContractAddresses.Seer = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useHasBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`))

    expect(result.current.hasBadge).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('returns threshold defaults when Seer is not configured', () => {
    mockContractAddresses.Seer = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useSeerThresholds())

    expect(result.current.minForGovernance).toBeGreaterThan(0)
    expect(result.current.minForMerchant).toBeGreaterThan(0)
  })
})
