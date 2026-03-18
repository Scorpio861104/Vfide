import { renderHook } from '@testing-library/react'
import { jest } from '@jest/globals'
import {
  getScoreTier,
  getScoreTierObject,
  useHasBadge,
  useProofScore,
  useSeerThresholds,
} from './useProofScore'
import { PROOF_SCORE_PERMISSIONS, PROOF_SCORE_TIERS } from '@/lib/constants'
import { useAccount, useReadContract } from 'wagmi'

jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
}))

const mockedUseAccount = jest.mocked(useAccount)
const mockedUseReadContract = jest.mocked(useReadContract)

describe('useProofScore hook', () => {
  beforeEach(() => {
    mockedUseReadContract.mockReset()
    mockedUseAccount.mockReset()
  })

  test('returns defaults when no address or data', () => {
    mockedUseAccount.mockReturnValue({ address: undefined } as any)
    mockedUseReadContract.mockReturnValue({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() } as any)

    const { result } = renderHook(() => useProofScore())
    expect(result.current.score).toBe(5000)
    expect(result.current.tierName).toBe(PROOF_SCORE_TIERS.NEUTRAL.label)
    expect(result.current.burnFee).toBe(2.0)
    expect(result.current.canVote).toBe(false)
    expect(result.current.color).toBe('#FFD700')
  })

  test('uses provided address and returned score', () => {
    mockedUseAccount.mockReturnValue({ address: '0xabc' } as any)
    mockedUseReadContract
      .mockReturnValueOnce({ data: BigInt(9000), isError: false, isLoading: false, refetch: jest.fn() } as any)
      .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() } as any)

    const { result } = renderHook(() => useProofScore('0x1111111111111111111111111111111111111111'))
    expect(result.current.score).toBe(9000)
    expect(result.current.tierName).toBe(PROOF_SCORE_TIERS.ELITE.label)
    expect(result.current.canCouncil).toBe(true)
    expect(result.current.color).toBe('#00FF88')
    expect(result.current.burnFee).toBe(0.25)
  })
})

describe('tier helpers', () => {
  test('getScoreTierObject covers all ranges', () => {
    expect(getScoreTierObject(1000)).toBe(PROOF_SCORE_TIERS.RISKY)
    expect(getScoreTier(3600)).toBe(PROOF_SCORE_TIERS.LOW_TRUST.label)
    expect(getScoreTierObject(5400)).toBe(PROOF_SCORE_TIERS.GOVERNANCE)
    expect(getScoreTier(7500)).toBe(PROOF_SCORE_TIERS.COUNCIL.label)
    expect(getScoreTierObject(9999)).toBe(PROOF_SCORE_TIERS.ELITE)
  })
})

describe('contract helper hooks', () => {
  beforeEach(() => {
    mockedUseReadContract.mockReset()
    mockedUseAccount.mockReset()
  })

  test('useSeerThresholds falls back to defaults when no data', () => {
    mockedUseReadContract.mockReturnValue({ data: undefined } as any)
    const { result } = renderHook(() => useSeerThresholds())
    expect(result.current.minForGovernance).toBe(PROOF_SCORE_PERMISSIONS.MIN_FOR_GOVERNANCE)
    expect(result.current.minForMerchant).toBe(PROOF_SCORE_PERMISSIONS.MIN_FOR_MERCHANT)
    expect(result.current.lowTrustThreshold).toBe(3500)
    expect(result.current.highTrustThreshold).toBe(8000)
  })

  test('useSeerThresholds maps returned values to numbers', () => {
    mockedUseReadContract
      .mockReturnValueOnce({ data: BigInt(6000) } as any)
      .mockReturnValueOnce({ data: BigInt(6500) } as any)
      .mockReturnValueOnce({ data: BigInt(3600) } as any)
      .mockReturnValueOnce({ data: BigInt(8100) } as any)

    const { result } = renderHook(() => useSeerThresholds())
    expect(result.current.minForGovernance).toBe(6000)
    expect(result.current.minForMerchant).toBe(6500)
    expect(result.current.lowTrustThreshold).toBe(3600)
    expect(result.current.highTrustThreshold).toBe(8100)
  })

  test('useHasBadge respects account and badge inputs', () => {
    mockedUseAccount.mockReturnValue({ address: '0xabc' } as any)
    mockedUseReadContract.mockReturnValue({ data: true, isLoading: false } as any)

    const { result } = renderHook(() => useHasBadge('0x123' as `0x${string}`))
    expect(result.current.hasBadge).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  test('useHasBadge covers fallback when address or badgeId missing', () => {
    mockedUseAccount.mockReturnValue({ address: undefined } as any)
    mockedUseReadContract.mockReturnValue({ data: undefined, isLoading: false } as any)

    const { result } = renderHook(() => useHasBadge('0x123' as `0x${string}`, undefined))
    expect(result.current.hasBadge).toBe(false)
  })
})
