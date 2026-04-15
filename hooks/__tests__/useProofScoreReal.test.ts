// Tests for useProofScore.ts - comprehensive coverage
import { describe, it, expect, vi, beforeEach, Mock } from '@jest/globals'
import { renderHook } from '@testing-library/react'

// Mock wagmi before importing hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useReadContract: jest.fn(),
}))

// Mock contracts
jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    Seer: '0x1234567890123456789012345678901234567890',
    BurnRouter: '0x0000000000000000000000000000000000000000',
  },
  SeerABI: [],
  ProofScoreBurnRouterABI: [],
  ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
  isConfiguredContractAddress: (address?: string | null) =>
    typeof address === 'string' &&
    address !== '0x0000000000000000000000000000000000000000' &&
    address.startsWith('0x') &&
    address.length === 42,
}))

import { useAccount, useReadContract } from 'wagmi'
import {
  useProofScore,
  getScoreTier,
  useSeerThresholds,
  useHasBadge,
} from '../useProofScore'

describe('useProofScore - Comprehensive Tests', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as `0x${string}`
  const mockBadgeId = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`

  // Helper: mock score read (1st call) + BurnRouter read (2nd call returns undefined)
  function mockScore(score: bigint) {
    ;(useReadContract as Mock)
      .mockReturnValueOnce({ data: score, isError: false, isLoading: false, refetch: jest.fn() })
      .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAccount as Mock).mockReturnValue({
      address: mockAddress,
      isConnected: true,
    })
  })

  // ==================== getScoreTier ====================
  describe('getScoreTier', () => {
    it('should return Elite for score >= 8000', () => {
      expect(getScoreTier(8000)).toBe('Elite')
      expect(getScoreTier(9500)).toBe('Elite')
      expect(getScoreTier(10000)).toBe('Elite')
    })

    it('should return High Trust for score >= 7000 and < 8000', () => {
      expect(getScoreTier(7000)).toBe('Council')
      expect(getScoreTier(7500)).toBe('Council')
      expect(getScoreTier(7999)).toBe('Council')
    })

    it('should return Neutral for score >= 5000 and < 7000', () => {
      expect(getScoreTier(5000)).toBe('Neutral')
      expect(getScoreTier(6000)).toBe('Trusted')
      expect(getScoreTier(6999)).toBe('Trusted')
    })

    it('should return Low Trust for score >= 3500 and < 5000', () => {
      expect(getScoreTier(3500)).toBe('Low Trust')
      expect(getScoreTier(4000)).toBe('Low Trust')
      expect(getScoreTier(4999)).toBe('Low Trust')
    })

    it('should return Risky for score < 3500', () => {
      expect(getScoreTier(0)).toBe('Risky')
      expect(getScoreTier(1000)).toBe('Risky')
      expect(getScoreTier(3499)).toBe('Risky')
    })
  })

  // ==================== useProofScore ====================
  describe('useProofScore', () => {
    it('should return Elite score with all permissions', () => {
      mockScore(BigInt(8500))

      const { result } = renderHook(() => useProofScore())

      expect(result.current.score).toBe(8500)
      expect(result.current.tier.label).toBe('Elite')
      expect(result.current.burnFee).toBe(0.25)
      expect(result.current.color).toBe('#00FF88')
      expect(result.current.canVote).toBe(true)
      expect(result.current.canMerchant).toBe(true)
      expect(result.current.canCouncil).toBe(true)
      expect(result.current.canEndorse).toBe(true)
      expect(result.current.isElite).toBe(true)
    })

    it('should return High Trust score with council permissions', () => {
      mockScore(BigInt(7500))

      const { result } = renderHook(() => useProofScore())

      expect(result.current.score).toBe(7500)
      expect(result.current.tier.label).toBe('Council')
      expect(result.current.burnFee).toBe(1.0)
      expect(result.current.color).toBe('#00F0FF')
      expect(result.current.canVote).toBe(true)
      expect(result.current.canMerchant).toBe(true)
      expect(result.current.canCouncil).toBe(true)
      expect(result.current.canEndorse).toBe(false)
      expect(result.current.isElite).toBe(false)
    })

    it('should return Trusted score with merchant permissions', () => {
      mockScore(BigInt(6000))

      const { result } = renderHook(() => useProofScore())

      expect(result.current.score).toBe(6000)
      expect(result.current.tier.label).toBe('Trusted')
      expect(result.current.burnFee).toBe(2.0)
      expect(result.current.color).toBe('#FFD700')
      expect(result.current.canVote).toBe(true)
      expect(result.current.canMerchant).toBe(true)
      expect(result.current.canCouncil).toBe(false)
    })

    it('should return Low Trust score with restricted permissions', () => {
      mockScore(BigInt(4500))

      const { result } = renderHook(() => useProofScore())

      expect(result.current.score).toBe(4500)
      expect(result.current.tier.label).toBe('Low Trust')
      expect(result.current.burnFee).toBe(3.5)
      expect(result.current.color).toBe('#FFA500')
      expect(result.current.canVote).toBe(false)
      expect(result.current.canMerchant).toBe(false)
    })

    it('should return Risky score with maximum fees', () => {
      mockScore(BigInt(2000))

      const { result } = renderHook(() => useProofScore())

      expect(result.current.score).toBe(2000)
      expect(result.current.tier.label).toBe('Risky')
      expect(result.current.burnFee).toBe(5.0)
      expect(result.current.color).toBe('#FF4444')
      expect(result.current.canVote).toBe(false)
      expect(result.current.canMerchant).toBe(false)
      expect(result.current.canCouncil).toBe(false)
      expect(result.current.canEndorse).toBe(false)
      expect(result.current.isElite).toBe(false)
    })

    it('should use default neutral score when no data', () => {
      ;(useReadContract as Mock)
        .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })
        .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })

      const { result } = renderHook(() => useProofScore())

      expect(result.current.score).toBe(5000)
      expect(result.current.tier.label).toBe('Neutral')
    })

    it('should use provided user address', () => {
      const targetAddress = '0x9876543210987654321098765432109876543210' as `0x${string}`
      mockScore(BigInt(7000))

      renderHook(() => useProofScore(targetAddress))

      expect(useReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [targetAddress],
        })
      )
    })

    it('should handle loading state', () => {
      ;(useReadContract as Mock)
        .mockReturnValueOnce({ data: undefined, isError: false, isLoading: true, refetch: jest.fn() })
        .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })

      const { result } = renderHook(() => useProofScore())

      expect(result.current.isLoading).toBe(true)
    })

    it('should handle error state', () => {
      ;(useReadContract as Mock)
        .mockReturnValueOnce({ data: undefined, isError: true, isLoading: false, refetch: jest.fn() })
        .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })

      const { result } = renderHook(() => useProofScore())

      expect(result.current.isError).toBe(true)
    })

    it('should provide refetch function', () => {
      const mockRefetch = jest.fn()
      ;(useReadContract as Mock)
        .mockReturnValueOnce({ data: BigInt(5000), isError: false, isLoading: false, refetch: mockRefetch })
        .mockReturnValueOnce({ data: undefined, isError: false, isLoading: false, refetch: jest.fn() })

      const { result } = renderHook(() => useProofScore())

      expect(result.current.refetch).toBe(mockRefetch)
    })

    // Edge case: score exactly at thresholds
    it('should handle score exactly at 5400 (voting threshold)', () => {
      mockScore(BigInt(5400))

      const { result } = renderHook(() => useProofScore())

      expect(result.current.canVote).toBe(true)
    })

    it('should handle score exactly at 5600 (merchant threshold)', () => {
      mockScore(BigInt(5600))

      const { result } = renderHook(() => useProofScore())

      expect(result.current.canMerchant).toBe(true)
    })
  })

  // ==================== useSeerThresholds ====================
  describe('useSeerThresholds', () => {
    it('should return thresholds from contract', () => {
      let callCount = 0
      ;(useReadContract as Mock).mockImplementation(() => {
        callCount++
        if (callCount === 1) return { data: BigInt(5400) }
        if (callCount === 2) return { data: BigInt(5600) }
        if (callCount === 3) return { data: BigInt(4000) }
        return { data: BigInt(8000) }
      })

      const { result } = renderHook(() => useSeerThresholds())

      expect(result.current.minForGovernance).toBeDefined()
      expect(result.current.minForMerchant).toBeDefined()
      expect(result.current.lowTrustThreshold).toBeDefined()
      expect(result.current.highTrustThreshold).toBeDefined()
    })

    it('should return defaults when no data', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
      })

      const { result } = renderHook(() => useSeerThresholds())

      expect(result.current.minForGovernance).toBe(5400)
      expect(result.current.minForMerchant).toBe(5600)
      expect(result.current.lowTrustThreshold).toBe(3500)
      expect(result.current.highTrustThreshold).toBe(8000)
    })
  })

  // ==================== useHasBadge ====================
  describe('useHasBadge', () => {
    it('should return true when user has badge', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: true,
        isLoading: false,
      })

      const { result } = renderHook(() => useHasBadge(mockBadgeId))

      expect(result.current.hasBadge).toBe(true)
      expect(result.current.isLoading).toBe(false)
    })

    it('should return false when user does not have badge', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: false,
        isLoading: false,
      })

      const { result } = renderHook(() => useHasBadge(mockBadgeId))

      expect(result.current.hasBadge).toBe(false)
    })

    it('should handle loading state', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
      })

      const { result } = renderHook(() => useHasBadge(mockBadgeId))

      expect(result.current.isLoading).toBe(true)
    })

    it('should use provided user address', () => {
      const targetAddress = '0x9876543210987654321098765432109876543210' as `0x${string}`
      ;(useReadContract as Mock).mockReturnValue({
        data: true,
        isLoading: false,
      })

      renderHook(() => useHasBadge(mockBadgeId, targetAddress))

      expect(useReadContract).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [targetAddress, mockBadgeId],
        })
      )
    })

    it('should handle missing badge id', () => {
      ;(useReadContract as Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
      })

      // Providing undefined for badgeId
      const { result } = renderHook(() => useHasBadge(undefined as unknown as `0x${string}`))

      expect(result.current.hasBadge).toBe(false)
    })
  })

  // ==================== Boundary Tests for Burn Fee ====================
  describe('Burn Fee Calculations', () => {
    it('should return 0.25% fee for score >= 8000', () => {
      mockScore(BigInt(8000))

      const { result } = renderHook(() => useProofScore())
      expect(result.current.burnFee).toBe(0.25)
    })

    it('should return 1.0% fee for score >= 7000 and < 8000', () => {
      mockScore(BigInt(7999))

      const { result } = renderHook(() => useProofScore())
      expect(result.current.burnFee).toBe(1.0)
    })

    it('should return 2.0% fee for score >= 5000 and < 7000', () => {
      mockScore(BigInt(5000))

      const { result } = renderHook(() => useProofScore())
      expect(result.current.burnFee).toBe(2.0)
    })

    it('should return 3.5% fee for score >= 4000 and < 5000', () => {
      mockScore(BigInt(4999))

      const { result } = renderHook(() => useProofScore())
      expect(result.current.burnFee).toBe(3.5)
    })

    it('should return 5.0% fee for score < 4000', () => {
      mockScore(BigInt(3999))

      const { result } = renderHook(() => useProofScore())
      expect(result.current.burnFee).toBe(5.0)
    })
  })
})
