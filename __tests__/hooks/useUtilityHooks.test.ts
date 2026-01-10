/**
 * Tests for useUtilityHooks
 * System stats, fee calculator, and activity feed
 */
import { describe, expect, it, vi, beforeEach, afterEach } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock useProofScore
jest.mock('@/hooks/useProofScoreHooks', () => ({
  useProofScore: jest.fn(() => ({
    burnFee: 0.3,
    proofScore: 50,
    level: 2,
    isLoading: false,
    maxProofScore: 100,
    tier: 'Explorer',
    feeReduction: 0.1,
    endorsements: 5,
  })),
}))

describe('useUtilityHooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('useSystemStats', () => {
    it('should return initial stats', async () => {
      const { useSystemStats } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useSystemStats())

      expect(result.current).toHaveProperty('tvl')
      expect(result.current).toHaveProperty('vaults')
      expect(result.current).toHaveProperty('merchants')
      expect(result.current).toHaveProperty('transactions24h')
      expect(result.current.tvl).toBe(0)
      expect(result.current.vaults).toBe(0)
    })

    it('should update stats over time', async () => {
      const { useSystemStats } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useSystemStats())

      const initialTvl = result.current.tvl

      // Advance time by 5 seconds
      await act(async () => {
        jest.advanceTimersByTime(5000)
      })

      // Stats should have updated
      expect(result.current.tvl).toBeGreaterThanOrEqual(initialTvl)
    })

    it('should clean up interval on unmount', async () => {
      const { useSystemStats } = await import('@/hooks/useUtilityHooks')
      const { unmount } = renderHook(() => useSystemStats())

      // Unmount should not throw
      unmount()

      // Advance time - should not cause errors
      await act(async () => {
        jest.advanceTimersByTime(5000)
      })
    })

    it('should accumulate stats over multiple intervals', async () => {
      const { useSystemStats } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useSystemStats())

      // Advance through multiple intervals
      await act(async () => {
        jest.advanceTimersByTime(5000)
      })
      await act(async () => {
        jest.advanceTimersByTime(5000)
      })
      await act(async () => {
        jest.advanceTimersByTime(5000)
      })

      // Stats should have accumulated
      expect(result.current.tvl).toBeGreaterThan(0)
    })
  })

  describe('useFeeCalculator', () => {
    it('should calculate fees for a given amount', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator('100'))

      expect(result.current.vfideFee).toBeDefined()
      expect(result.current.vfideNet).toBeDefined()
      expect(result.current.stripeFee).toBeDefined()
      expect(result.current.stripeNet).toBeDefined()
      expect(result.current.savings).toBeDefined()
    })

    it('should calculate correct VFIDE fee', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator('100'))

      // With 0.3% burn fee, $100 should have $0.30 fee
      expect(parseFloat(result.current.vfideFee)).toBeCloseTo(0.3, 1)
      expect(parseFloat(result.current.vfideNet)).toBeCloseTo(99.7, 1)
    })

    it('should calculate Stripe fees correctly', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator('100'))

      // Stripe: 2.9% + $0.30 = $2.90 + $0.30 = $3.20
      expect(parseFloat(result.current.stripeFee)).toBeCloseTo(3.2, 1)
      expect(parseFloat(result.current.stripeNet)).toBeCloseTo(96.8, 1)
    })

    it('should calculate savings correctly', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator('100'))

      // Savings: $3.20 - $0.30 = $2.90
      expect(parseFloat(result.current.savings)).toBeCloseTo(2.9, 1)
    })

    it('should handle zero amount', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator('0'))

      expect(parseFloat(result.current.vfideFee)).toBe(0)
      expect(parseFloat(result.current.vfideNet)).toBe(0)
    })

    it('should handle empty string amount', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator(''))

      expect(parseFloat(result.current.vfideFee)).toBe(0)
    })

    it('should handle invalid amount', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator('abc'))

      expect(parseFloat(result.current.vfideFee)).toBe(0)
    })

    it('should return burnFee from proof score', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator('100'))

      expect(result.current.burnFee).toBe(0.3)
    })

    it('should handle large amounts', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator('10000'))

      // VFIDE: 0.3% of $10,000 = $30
      expect(parseFloat(result.current.vfideFee)).toBeCloseTo(30, 0)
      // Stripe: 2.9% + $0.30 = $290.30
      expect(parseFloat(result.current.stripeFee)).toBeCloseTo(290.3, 1)
    })

    it('should include savings percentage', async () => {
      const { useFeeCalculator } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useFeeCalculator('100'))

      expect(result.current.savingsPercent).toBeDefined()
      expect(parseFloat(result.current.savingsPercent)).toBeGreaterThan(0)
    })
  })

  describe('useActivityFeed', () => {
    it('should return empty activities initially', async () => {
      const { useActivityFeed } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useActivityFeed())

      expect(result.current.activities).toEqual([])
    })

    it('should add activities over time', async () => {
      const { useActivityFeed } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useActivityFeed())

      // Advance time by 3 seconds
      await act(async () => {
        jest.advanceTimersByTime(3000)
      })

      expect(result.current.activities.length).toBe(1)
    })

    it('should create activities with required fields', async () => {
      const { useActivityFeed } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useActivityFeed())

      await act(async () => {
        jest.advanceTimersByTime(3000)
      })

      const activity = result.current.activities[0]
      expect(activity).toHaveProperty('id')
      expect(activity).toHaveProperty('type')
      expect(activity).toHaveProperty('timestamp')
      expect(activity).toHaveProperty('txHash')
    })

    it('should limit activities to 20', async () => {
      const { useActivityFeed } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useActivityFeed())

      // Add 25 activities
      await act(async () => {
        jest.advanceTimersByTime(3000 * 25)
      })

      expect(result.current.activities.length).toBeLessThanOrEqual(20)
    })

    it('should add new activities to the front', async () => {
      const { useActivityFeed } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useActivityFeed())

      await act(async () => {
        jest.advanceTimersByTime(3000)
      })

      const firstActivity = result.current.activities[0]

      await act(async () => {
        jest.advanceTimersByTime(3000)
      })

      // New activity should be at index 0
      expect(result.current.activities[0].id).not.toBe(firstActivity.id)
      expect(result.current.activities[1].id).toBe(firstActivity.id)
    })

    it('should clean up on unmount', async () => {
      const { useActivityFeed } = await import('@/hooks/useUtilityHooks')
      const { unmount } = renderHook(() => useActivityFeed())

      unmount()

      // Should not throw
      await act(async () => {
        jest.advanceTimersByTime(3000)
      })
    })

    it('should create activities with valid types', async () => {
      const { useActivityFeed } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useActivityFeed())

      // Generate multiple activities
      await act(async () => {
        jest.advanceTimersByTime(3000 * 10)
      })

      const validTypes = ['transfer', 'merchant_payment', 'endorsement', 'vault_created', 'proposal_voted']
      result.current.activities.forEach(activity => {
        expect(validTypes).toContain(activity.type)
      })
    })

    it('should generate from addresses', async () => {
      const { useActivityFeed } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useActivityFeed())

      await act(async () => {
        jest.advanceTimersByTime(3000)
      })

      const activity = result.current.activities[0]
      expect(activity.from).toMatch(/^0x[a-f0-9]+$/i)
    })

    it('should generate txHash for activities', async () => {
      const { useActivityFeed } = await import('@/hooks/useUtilityHooks')
      const { result } = renderHook(() => useActivityFeed())

      await act(async () => {
        jest.advanceTimersByTime(3000)
      })

      const activity = result.current.activities[0]
      expect(activity.txHash).toMatch(/^0x[a-f0-9]+$/i)
    })
  })
})
