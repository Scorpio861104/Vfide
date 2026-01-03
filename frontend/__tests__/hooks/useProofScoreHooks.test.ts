import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: '0x1234567890123456789012345678901234567890' })),
  useReadContract: vi.fn(() => ({ data: null, isLoading: false, refetch: vi.fn() })),
  useWriteContract: vi.fn(() => ({ writeContract: vi.fn(), writeContractAsync: vi.fn(), data: null, isPending: false })),
  useWaitForTransactionReceipt: vi.fn(() => ({ isLoading: false, isSuccess: false })),
}))

// Mock React hooks
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...(actual as object),
    useState: vi.fn((init) => [init, vi.fn()]),
  }
})

// Mock contracts
vi.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    Seer: '0x1234567890123456789012345678901234567890',
  },
}))

// Mock ABIs
vi.mock('@/lib/abis', () => ({
  SeerABI: [],
}))

import { useReadContract } from 'wagmi'
import { useProofScore, useScoreBreakdown } from '@/hooks/useProofScoreHooks'

describe('useProofScoreHooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset useReadContract to default
    vi.mocked(useReadContract).mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useReadContract>)
  })

  describe('useProofScore', () => {
    it('returns default neutral score when no data', () => {
      const { score, tier } = useProofScore()
      expect(score).toBe(5000)
      expect(tier).toBe('Neutral')
    })

    it('returns Elite tier for score >= 8000', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 8500n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { score, tier, isElite, canEndorse } = useProofScore()
      expect(score).toBe(8500)
      expect(tier).toBe('Elite')
      expect(isElite).toBe(true)
      expect(canEndorse).toBe(true)
    })

    it('returns High Trust tier for score 7000-7999', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 7500n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { tier, canCouncil, canEndorse } = useProofScore()
      expect(tier).toBe('High Trust')
      expect(canCouncil).toBe(true)
      expect(canEndorse).toBe(false)
    })

    it('returns Low Trust tier for score 3500-4999', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 4000n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { tier, canVote, canMerchant } = useProofScore()
      expect(tier).toBe('Low Trust')
      expect(canVote).toBe(false)
      expect(canMerchant).toBe(false)
    })

    it('returns Risky tier for score < 3500', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 2000n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { tier } = useProofScore()
      expect(tier).toBe('Risky')
    })

    it('calculates correct burn fees for Elite', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 8000n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { burnFee } = useProofScore()
      expect(burnFee).toBe(0.25)
    })

    it('calculates correct burn fees for Risky', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 3000n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { burnFee } = useProofScore()
      expect(burnFee).toBe(5.0)
    })

    it('returns correct colors for each tier', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 8000n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().color).toBe('#00FF88') // Elite green

      vi.mocked(useReadContract).mockReturnValue({
        data: 7000n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().color).toBe('#00F0FF') // High trust cyan

      vi.mocked(useReadContract).mockReturnValue({
        data: 5000n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().color).toBe('#FFD700') // Neutral gold
    })

    it('determines canVote correctly', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 5400n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().canVote).toBe(true)

      vi.mocked(useReadContract).mockReturnValue({
        data: 5399n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().canVote).toBe(false)
    })

    it('determines canMerchant correctly', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 5600n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().canMerchant).toBe(true)

      vi.mocked(useReadContract).mockReturnValue({
        data: 5599n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)
      expect(useProofScore().canMerchant).toBe(false)
    })
  })

  describe('useScoreBreakdown', () => {
    it('calculates breakdown components based on score', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 10000n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { breakdown } = useScoreBreakdown()
      expect(breakdown.totalScore).toBe(10000)
      expect(breakdown.baseScore).toBe(4000) // 40%
      expect(breakdown.vaultBonus).toBe(1500) // 15%
      expect(breakdown.ageBonus).toBe(1000) // 10%
      expect(breakdown.activityPoints).toBe(1500) // 15%
      expect(breakdown.endorsementPoints).toBe(1000) // 10%
      expect(breakdown.badgePoints).toBe(1000) // 10%
      expect(breakdown.hasDiversityBonus).toBe(true)
    })

    it('hasDiversityBonus is false below 7000', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: 6000n as unknown as undefined,
        isLoading: false,
        refetch: vi.fn(),
      } as ReturnType<typeof useReadContract>)

      const { breakdown } = useScoreBreakdown()
      expect(breakdown.hasDiversityBonus).toBe(false)
    })

    it('handles loading state', () => {
      vi.mocked(useReadContract).mockReturnValue({
        data: null,
        isLoading: true,
        refetch: vi.fn(),
      } as unknown as ReturnType<typeof useReadContract>)

      const { isLoading } = useScoreBreakdown()
      expect(isLoading).toBe(true)
    })
  })
})
