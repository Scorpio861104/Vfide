import { describe, it, expect } from '@jest/globals'
import {
  PRESALE_PRICES,
  DEFAULT_VFIDE_PRICE,
  vfideToUsd,
  formatVfideWithUsd,
} from '@/lib/price-utils'

describe('price-utils', () => {
  describe('constants', () => {
    it('has correct presale prices', () => {
      expect(PRESALE_PRICES.founding).toBe(0.03)
      expect(PRESALE_PRICES.oath).toBe(0.05)
      expect(PRESALE_PRICES.public).toBe(0.07)
    })

    it('has default price set to oath tier', () => {
      expect(DEFAULT_VFIDE_PRICE).toBe(0.05)
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
      // Values < $1 use 4 decimal places (default price 0.05)
      expect(vfideToUsd(1)).toBe('$0.0500') // 1 * 0.05 = $0.05
      expect(vfideToUsd(5)).toBe('$0.2500') // 5 * 0.05 = $0.25
    })

    it('formats amounts >= $1 with 2 decimals', () => {
      expect(vfideToUsd(20)).toBe('$1.00')   // 20 * 0.05 = $1.00
      expect(vfideToUsd(100)).toBe('$5.00')  // 100 * 0.05 = $5.00
      expect(vfideToUsd(200)).toBe('$10.00') // 200 * 0.05 = $10.00
    })

    it('formats thousands with K suffix', () => {
      expect(vfideToUsd(20000)).toBe('$1.0K') // 20000 * 0.05 = $1000
      expect(vfideToUsd(100000)).toBe('$5.0K') // 100000 * 0.05 = $5000
    })

    it('formats millions with M suffix', () => {
      expect(vfideToUsd(20000000)).toBe('$1.00M') // 20M * 0.05 = $1M
      expect(vfideToUsd(100000000)).toBe('$5.00M')
    })

    it('accepts string amounts', () => {
      expect(vfideToUsd('100')).toBe('$5.00')   // 100 * 0.05 = $5
      expect(vfideToUsd('20000')).toBe('$1.0K') // 20000 * 0.05 = $1000
    })

    it('uses custom price when provided', () => {
      expect(vfideToUsd(100, 0.05)).toBe('$5.00') // 100 * 0.05 = $5
      expect(vfideToUsd(100, 0.20)).toBe('$20.00') // 100 * 0.20 = $20
    })

    it('handles very small amounts with 4 decimals', () => {
      expect(vfideToUsd(0.1)).toBe('$0.0050') // 0.1 * 0.05 = $0.005
    })
  })

  describe('formatVfideWithUsd', () => {
    it('returns both vfide and usd formatted', () => {
      const result = formatVfideWithUsd(1000)
      expect(result.vfide).toBe('1,000')
      expect(result.usd).toBe('$50.00') // 1000 * 0.05 = $50
    })

    it('handles string input', () => {
      const result = formatVfideWithUsd('5000')
      expect(result.vfide).toBe('5,000')
      expect(result.usd).toBe('$250.00') // 5000 * 0.05 = $250
    })

    it('uses custom price', () => {
      const result = formatVfideWithUsd(1000, 0.05)
      expect(result.usd).toBe('$50.00')
    })

    it('handles large amounts', () => {
      const result = formatVfideWithUsd(20000000)
      expect(result.vfide).toBe('20,000,000')
      expect(result.usd).toBe('$1.00M') // 20M * 0.05 = $1M
    })
  })
})
