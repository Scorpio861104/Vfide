import { renderHook } from '@testing-library/react'
import { useProofScore, getScoreTier, useSeerThresholds, useHasBadge } from '../useProofScore'
import * as wagmi from 'wagmi'

jest.mock('wagmi')
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    Seer: '0x1234567890123456789012345678901234567890',
    BurnRouter: '0x0000000000000000000000000000000000000000',
  },
  SeerABI: [],
  ProofScoreBurnRouterABI: [],
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
}))

describe('useProofScore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
    })
  })

  const mockScore = (score: bigint) => {
    ;(wagmi.useReadContract as jest.Mock)
      .mockReturnValueOnce({ data: score, isError: false, isLoading: false, refetch: jest.fn() })
      .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })
  }

  it('returns score data', () => {
    mockScore(BigInt(7500))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.score).toBe(7500)
    expect(result.current.tier).toBeDefined()
    expect(result.current.burnFee).toBeDefined()
    expect(result.current.color).toBeDefined()
  })

  it('calculates elite tier score', () => {
    mockScore(BigInt(8500))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.score).toBe(8500)
    expect(result.current.burnFee).toBe(0.25)
    expect(result.current.color).toBe('#00FF88')
  })

  it('calculates high trust score', () => {
    mockScore(BigInt(7200))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.score).toBe(7200)
    expect(result.current.burnFee).toBe(1.0)
    expect(result.current.color).toBe('#00F0FF')
  })

  it('calculates neutral score', () => {
    mockScore(BigInt(5500))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.score).toBe(5500)
    expect(result.current.burnFee).toBe(2.0)
    expect(result.current.color).toBe('#FFD700')
  })

  it('calculates low score', () => {
    mockScore(BigInt(4200))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.score).toBe(4200)
    expect(result.current.burnFee).toBe(3.5)
  })

  it('calculates risky score', () => {
    mockScore(BigInt(3000))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.score).toBe(3000)
    expect(result.current.burnFee).toBe(5.0)
  })

  it('defaults to neutral score when no data', () => {
    ;(wagmi.useReadContract as jest.Mock)
      .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })
      .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })

    const { result } = renderHook(() => useProofScore())

    expect(result.current.score).toBe(5000)
  })

  it('determines voting eligibility', () => {
    mockScore(BigInt(5500))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.canVote).toBe(true)
  })

  it('denies voting for low scores', () => {
    mockScore(BigInt(5000))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.canVote).toBe(false)
  })

  it('determines merchant eligibility', () => {
    mockScore(BigInt(5800))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.canMerchant).toBe(true)
  })

  it('determines council eligibility', () => {
    mockScore(BigInt(7200))

    const { result } = renderHook(() => useProofScore())

    expect(result.current.canCouncil).toBe(true)
  })

  it('uses custom address when provided', () => {
    mockScore(BigInt(6000))

    const customAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`
    const { result } = renderHook(() => useProofScore(customAddress))

    expect(result.current.score).toBe(6000)
  })

  it('handles loading state', () => {
    ;(wagmi.useReadContract as jest.Mock)
      .mockReturnValueOnce({ data: undefined, isError: false, isLoading: true, refetch: jest.fn() })
      .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })

    const { result } = renderHook(() => useProofScore())

    expect(result.current.isLoading).toBe(true)
  })

  it('handles error state', () => {
    ;(wagmi.useReadContract as jest.Mock)
      .mockReturnValueOnce({ data: undefined, isError: true, isLoading: false, refetch: jest.fn() })
      .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })

    const { result } = renderHook(() => useProofScore())

    expect(result.current.isError).toBe(true)
  })

  it('provides refetch function', () => {
    const mockRefetch = jest.fn()
    ;(wagmi.useReadContract as jest.Mock)
      .mockReturnValueOnce({ data: BigInt(5000), isError: false, isLoading: false, refetch: mockRefetch })
      .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })

    const { result } = renderHook(() => useProofScore())

    expect(result.current.refetch).toBe(mockRefetch)
  })
})
describe('getScoreTier', () => {
  it('returns Elite for scores >= 8000', () => {
    expect(getScoreTier(8000)).toBe('Elite')
    expect(getScoreTier(9500)).toBe('Elite')
    expect(getScoreTier(10000)).toBe('Elite')
  })

  it('returns Council for scores >= 7000', () => {
    expect(getScoreTier(7000)).toBe('Council')
    expect(getScoreTier(7999)).toBe('Council')
  })

  it('returns correct tiers for scores 5000-6999', () => {
    expect(getScoreTier(5000)).toBe('Neutral')
    expect(getScoreTier(5399)).toBe('Neutral')
    expect(getScoreTier(5400)).toBe('Governance')
    expect(getScoreTier(5600)).toBe('Trusted')
    expect(getScoreTier(6999)).toBe('Trusted')
  })

  it('returns Low Trust for scores >= 3500', () => {
    expect(getScoreTier(3500)).toBe('Low Trust')
    expect(getScoreTier(4999)).toBe('Low Trust')
  })

  it('returns Risky for scores < 3500', () => {
    expect(getScoreTier(0)).toBe('Risky')
    expect(getScoreTier(3499)).toBe('Risky')
    expect(getScoreTier(1000)).toBe('Risky')
  })
})

describe('useSeerThresholds', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns default values when no data', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
    })

    const { result } = renderHook(() => useSeerThresholds())

    expect(result.current.minForGovernance).toBe(5400)
    expect(result.current.minForMerchant).toBe(5600)
    expect(result.current.lowTrustThreshold).toBe(3500)
    expect(result.current.highTrustThreshold).toBe(8000)
  })

  it('returns contract values when available', () => {
    ;(wagmi.useReadContract as jest.Mock)
      .mockReturnValueOnce({ data: BigInt(5500) })
      .mockReturnValueOnce({ data: BigInt(5700) })
      .mockReturnValueOnce({ data: BigInt(4100) })
      .mockReturnValueOnce({ data: BigInt(8100) })

    const { result } = renderHook(() => useSeerThresholds())

    expect(result.current.minForGovernance).toBe(5500)
    expect(result.current.minForMerchant).toBe(5700)
    expect(result.current.lowTrustThreshold).toBe(4100)
    expect(result.current.highTrustThreshold).toBe(8100)
  })
})

describe('useHasBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(wagmi.useAccount as jest.Mock).mockReturnValue({
      address: '0x1234567890123456789012345678901234567890',
    })
  })

  it('returns hasBadge true when data is truthy', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: true,
      isLoading: false,
    })

    const { result } = renderHook(() => 
      useHasBadge('0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`)
    )

    expect(result.current.hasBadge).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('returns hasBadge false when data is falsy', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: false,
      isLoading: false,
    })

    const { result } = renderHook(() => 
      useHasBadge('0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`)
    )

    expect(result.current.hasBadge).toBe(false)
  })

  it('returns isLoading state', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: undefined,
      isLoading: true,
    })

    const { result } = renderHook(() => 
      useHasBadge('0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`)
    )

    expect(result.current.isLoading).toBe(true)
    expect(result.current.hasBadge).toBe(false)
  })

  it('uses custom userAddress when provided', () => {
    ;(wagmi.useReadContract as jest.Mock).mockReturnValue({
      data: true,
      isLoading: false,
    })

    const customAddress = '0x0987654321098765432109876543210987654321' as `0x${string}`
    const { result } = renderHook(() => 
      useHasBadge(
        '0x1234567890123456789012345678901234567890123456789012345678901234' as `0x${string}`,
        customAddress
      )
    )

    expect(result.current.hasBadge).toBe(true)
  })
})