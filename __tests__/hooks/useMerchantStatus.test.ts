import { describe, it, expect, vi, beforeEach } from '@jest/globals'

// Mock wagmi hooks
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

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {},
  CONTRACTS: {},
  getContractAddresses: jest.fn(() => ({})),
  isConfiguredContractAddress: jest.fn(() => true),
  validateContractAddress: jest.fn((addr) => addr),
}))

import { useReadContract } from 'wagmi'
import { useMerchantStatus } from '@/hooks/useMerchantStatus'

describe('useMerchantStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns isMerchant false when no data', () => {
    const { isMerchant, isLoading, isError } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isMerchant).toBe(false)
    expect(isLoading).toBe(false)
    expect(isError).toBe(false)
  })

  it('returns isMerchant true when user is merchant', () => {
    // merchants() returns: (registered, suspended, businessName, category, registeredAt, totalVolume, txCount, payoutAddress)
    jest.mocked(useReadContract).mockReturnValue({
      data: [true, false, 'Test Business', 'retail', 1000n, 5000n, 10n] as unknown as undefined,
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useReadContract>)

    const { isMerchant } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isMerchant).toBe(true)
  })

  it('returns isMerchant false when user is not merchant', () => {
    // merchants() returns: (registered, suspended, businessName, category, registeredAt, totalVolume, txCount, payoutAddress)
    jest.mocked(useReadContract).mockReturnValue({
      data: [false, false, '', '', 0n, 0n, 0n] as unknown as undefined,
      isError: false,
      isLoading: false,
    } as ReturnType<typeof useReadContract>)

    const { isMerchant } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isMerchant).toBe(false)
  })

  it('handles loading state', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: null,
      isError: false,
      isLoading: true,
    } as unknown as ReturnType<typeof useReadContract>)

    const { isLoading } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isLoading).toBe(true)
  })

  it('handles error state', () => {
    jest.mocked(useReadContract).mockReturnValue({
      data: null,
      isError: true,
      isLoading: false,
    } as unknown as ReturnType<typeof useReadContract>)

    const { isError } = useMerchantStatus('0x1234567890123456789012345678901234567890' as `0x${string}`)
    expect(isError).toBe(true)
  })

  it('handles undefined address', () => {
    const { isMerchant } = useMerchantStatus(undefined)
    expect(isMerchant).toBe(false)
  })
})
