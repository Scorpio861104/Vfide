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

  it('reports unavailable when Seer is not configured', () => {
    mockContractAddresses.Seer = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useProofScore())

    expect(result.current.isAvailable).toBe(false)
    expect(result.current.error?.message).toContain('Seer')
  })

  it('reports unavailable when checking badges without Seer', () => {
    mockContractAddresses.Seer = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useHasBadge('0xbadge123456789012345678901234567890123456789012345678901234567890' as `0x${string}`))

    expect(result.current.isAvailable).toBe(false)
    expect(result.current.error?.message).toContain('Seer')
  })

  it('reports unavailable thresholds when Seer is not configured', () => {
    mockContractAddresses.Seer = '0x0000000000000000000000000000000000000000'

    const { result } = renderHook(() => useSeerThresholds())

    expect(result.current.isAvailable).toBe(false)
    expect(result.current.error?.message).toContain('Seer')
  })
})
