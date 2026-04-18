import { describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'

const mockUseAccount = jest.fn()
const mockUseReadContract = jest.fn()

jest.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useReadContract: (args: unknown) => mockUseReadContract(args),
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
  }
})

import { CONTRACT_ADDRESSES as mockContractAddresses } from '@/lib/contracts'
import { useProofScore, useHasBadge, useSeerThresholds } from '@/hooks/useProofScore'

describe('useProofScore real guards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockContractAddresses.Seer = '0x1234567890123456789012345678901234567890'
    mockContractAddresses.BurnRouter = '0x1234567890123456789012345678901234567891'
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
    expect(result.current.burnFee).toBe(2.0)
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
