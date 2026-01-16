/**
 * Real Utility Hooks Tests
 * Tests for useUtilityHooks to increase coverage
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'

// Mock the useProofScore hook
jest.mock('../../hooks/useProofScoreHooks', () => ({
  useProofScore: jest.fn().mockReturnValue({
    burnFee: 0.5,
    score: 50,
    isLoading: false,
  }),
}))

// Import hooks after mocks
import {
  useSystemStats,
  useFeeCalculator,
  useActivityFeed,
} from '../../hooks/useUtilityHooks'

describe('useSystemStats', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns initial stats', () => {
    const { result } = renderHook(() => useSystemStats())
    
    expect(result.current).toHaveProperty('tvl')
    expect(result.current).toHaveProperty('vaults')
    expect(result.current).toHaveProperty('merchants')
    expect(result.current).toHaveProperty('transactions24h')
  })

  it('starts with zero values', () => {
    const { result } = renderHook(() => useSystemStats())
    
    expect(result.current.tvl).toBe(0)
    expect(result.current.vaults).toBe(0)
    expect(result.current.merchants).toBe(0)
    expect(result.current.transactions24h).toBe(0)
  })

  it('updates stats over time', async () => {
    const { result } = renderHook(() => useSystemStats())
    
    // Initial values are 0
    expect(result.current.tvl).toBe(0)
    
    // Advance time by 5 seconds
    await act(async () => {
      jest.advanceTimersByTime(5000)
    })
    
    // Stats should have updated (values can go up)
    // Since random, we check type
    expect(typeof result.current.tvl).toBe('number')
    expect(typeof result.current.vaults).toBe('number')
  })

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    
    const { unmount } = renderHook(() => useSystemStats())
    
    unmount()
    
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})

describe('useFeeCalculator', () => {
  it('calculates VFIDE fee correctly', () => {
    const { result } = renderHook(() => useFeeCalculator('100'))
    
    // With 0.5% burn fee on $100 = $0.50
    expect(result.current.vfideFee).toBe('0.50')
    expect(result.current.vfideNet).toBe('99.50')
  })

  it('calculates Stripe fee correctly', () => {
    const { result } = renderHook(() => useFeeCalculator('100'))
    
    // Stripe: 2.9% + $0.30 = $2.90 + $0.30 = $3.20
    expect(result.current.stripeFee).toBe('3.20')
    expect(result.current.stripeNet).toBe('96.80')
  })

  it('calculates savings correctly', () => {
    const { result } = renderHook(() => useFeeCalculator('100'))
    
    // Savings: $3.20 - $0.50 = $2.70
    expect(result.current.savings).toBe('2.70')
  })

  it('handles zero amount', () => {
    const { result } = renderHook(() => useFeeCalculator('0'))
    
    expect(result.current.vfideFee).toBe('0.00')
    expect(result.current.vfideNet).toBe('0.00')
    // Stripe still has $0.30 flat fee
    expect(result.current.stripeFee).toBe('0.30')
  })

  it('handles empty string', () => {
    const { result } = renderHook(() => useFeeCalculator(''))
    
    expect(result.current.vfideFee).toBe('0.00')
    expect(result.current.vfideNet).toBe('0.00')
  })

  it('handles invalid input', () => {
    const { result } = renderHook(() => useFeeCalculator('abc'))
    
    expect(result.current.vfideFee).toBe('0.00')
    expect(result.current.vfideNet).toBe('0.00')
  })

  it('returns burn fee from useProofScore', () => {
    const { result } = renderHook(() => useFeeCalculator('100'))
    
    expect(result.current.burnFee).toBe(0.5)
  })

  it('calculates savings percent', () => {
    const { result } = renderHook(() => useFeeCalculator('100'))
    
    // Savings: $2.70, Stripe fee: $3.20
    // Savings %: (2.70/3.20)*100 = 84.375%
    expect(parseFloat(result.current.savingsPercent)).toBeCloseTo(84.4, 0)
  })
})

describe('useActivityFeed', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns empty activities initially', () => {
    const { result } = renderHook(() => useActivityFeed())
    
    expect(result.current.activities).toEqual([])
  })

  it('adds activity items over time', async () => {
    const { result } = renderHook(() => useActivityFeed())
    
    expect(result.current.activities.length).toBe(0)
    
    // Advance time by 3 seconds
    await act(async () => {
      jest.advanceTimersByTime(3000)
    })
    
    expect(result.current.activities.length).toBe(1)
  })

  it('activity items have required properties', async () => {
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

  it('activity types are valid', async () => {
    const { result } = renderHook(() => useActivityFeed())
    
    await act(async () => {
      jest.advanceTimersByTime(3000)
    })
    
    const validTypes = ['transfer', 'merchant_payment', 'endorsement', 'vault_created', 'proposal_voted']
    expect(validTypes).toContain(result.current.activities[0].type)
  })

  it('limits to 20 activities', async () => {
    const { result } = renderHook(() => useActivityFeed())
    
    // Add 25 activities (3s each = 75s)
    await act(async () => {
      jest.advanceTimersByTime(75000)
    })
    
    expect(result.current.activities.length).toBeLessThanOrEqual(20)
  })

  it('cleans up on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
    
    const { unmount } = renderHook(() => useActivityFeed())
    
    unmount()
    
    expect(clearIntervalSpy).toHaveBeenCalled()
    clearIntervalSpy.mockRestore()
  })
})
