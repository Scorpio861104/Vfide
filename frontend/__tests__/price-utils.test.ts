import { describe, it, expect } from 'vitest'
import {
  PRESALE_PRICES,
  DEFAULT_VFIDE_PRICE,
  vfideToUsd,
  formatVfideWithUsd,
} from '@/lib/price-utils'

describe('price-utils', () => {
  describe('constants', () => {
    it('has correct presale prices', () => {
      expect(PRESALE_PRICES.founding).toBe(0.05)
      expect(PRESALE_PRICES.oath).toBe(0.08)
      expect(PRESALE_PRICES.public).toBe(0.10)
    })

    it('has default price set to public tier', () => {
      expect(DEFAULT_VFIDE_PRICE).toBe(0.10)
    })
  })

  describe('vfideToUsd', () => {
    it('returns $0.00 for zero amount', () => {
      expect(vfideToUsd(0)).toBe('$0.00')
    })

    it('returns $0.00 for NaN', () => {
      expect(vfideToUsd('not-a-number')).toBe('$0.00')
    })

    it('formats small amounts correctly', () => {
      // Values < $1 use 4 decimal places
      expect(vfideToUsd(1)).toBe('$0.1000') // 1 * 0.10 = $0.10
      expect(vfideToUsd(5)).toBe('$0.5000') // 5 * 0.10 = $0.50
    })

    it('formats amounts >= $1 with 2 decimals', () => {
      expect(vfideToUsd(10)).toBe('$1.00')
      expect(vfideToUsd(100)).toBe('$10.00')
      expect(vfideToUsd(150)).toBe('$15.00')
    })

    it('formats thousands with K suffix', () => {
      expect(vfideToUsd(10000)).toBe('$1.0K') // 10000 * 0.10 = $1000
      expect(vfideToUsd(50000)).toBe('$5.0K') // 50000 * 0.10 = $5000
    })

    it('formats millions with M suffix', () => {
      expect(vfideToUsd(10000000)).toBe('$1.00M') // 10M * 0.10 = $1M
      expect(vfideToUsd(50000000)).toBe('$5.00M')
    })

    it('accepts string amounts', () => {
      expect(vfideToUsd('100')).toBe('$10.00')
      expect(vfideToUsd('10000')).toBe('$1.0K')
    })

    it('uses custom price when provided', () => {
      expect(vfideToUsd(100, 0.05)).toBe('$5.00') // 100 * 0.05 = $5
      expect(vfideToUsd(100, 0.20)).toBe('$20.00') // 100 * 0.20 = $20
    })

    it('handles very small amounts with 4 decimals', () => {
      expect(vfideToUsd(0.1)).toBe('$0.0100') // 0.1 * 0.10 = $0.01
    })
  })

  describe('formatVfideWithUsd', () => {
    it('returns both vfide and usd formatted', () => {
      const result = formatVfideWithUsd(1000)
      expect(result.vfide).toBe('1,000')
      expect(result.usd).toBe('$100.00')
    })

    it('handles string input', () => {
      const result = formatVfideWithUsd('5000')
      expect(result.vfide).toBe('5,000')
      expect(result.usd).toBe('$500.00')
    })

    it('uses custom price', () => {
      const result = formatVfideWithUsd(1000, 0.05)
      expect(result.usd).toBe('$50.00')
    })

    it('handles large amounts', () => {
      const result = formatVfideWithUsd(10000000)
      expect(result.vfide).toBe('10,000,000')
      expect(result.usd).toBe('$1.00M')
    })
  })
})
