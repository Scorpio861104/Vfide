import { formatPrice, parsePrice, DEFAULT_VFIDE_PRICE, vfideToUsd, formatVfideWithUsd } from '../price-utils'

describe('Price Utils', () => {
  describe('constants', () => {
    it('has correct default price', () => {
      expect(DEFAULT_VFIDE_PRICE).toBe(0.05)
    })
  })

  describe('vfideToUsd', () => {
    it('formats zero as $0.00', () => {
      expect(vfideToUsd(0)).toBe('$0.00')
    })

    it('formats NaN as $0.00', () => {
      expect(vfideToUsd(NaN)).toBe('$0.00')
    })

    it('formats regular amounts with 2 decimals', () => {
      expect(vfideToUsd(100)).toBe('$5.00')
    })

    it('formats small amounts with 4 decimals', () => {
      expect(vfideToUsd(5)).toBe('$0.2500')
    })

    it('formats very small amounts', () => {
      expect(vfideToUsd(0.1)).toBe('$0.0050')
    })

    it('formats thousands with K suffix', () => {
      expect(vfideToUsd(50000)).toBe('$2.5K')
    })

    it('formats millions with M suffix', () => {
      expect(vfideToUsd(20000000)).toBe('$1.00M')
    })

    it('handles string input', () => {
      expect(vfideToUsd('100')).toBe('$5.00')
    })

    it('handles custom price', () => {
      expect(vfideToUsd(100, 0.05)).toBe('$5.00')
    })
  })

  describe('formatVfideWithUsd', () => {
    it('returns vfide and usd values', () => {
      const result = formatVfideWithUsd(1000)
      expect(result.vfide).toBe('1,000')
      expect(result.usd).toBe('$50.00')
    })

    it('handles string input', () => {
      const result = formatVfideWithUsd('500')
      expect(result.vfide).toBe('500')
      expect(result.usd).toBe('$25.00')
    })

    it('handles large numbers', () => {
      const result = formatVfideWithUsd(1000000)
      expect(result.vfide).toBe('1,000,000')
      expect(result.usd).toBe('$50.0K')
    })

    it('handles custom price', () => {
      const result = formatVfideWithUsd(1000, 0.05)
      expect(result.vfide).toBe('1,000')
      expect(result.usd).toBe('$50.00')
    })

    it('handles zero', () => {
      const result = formatVfideWithUsd(0)
      expect(result.vfide).toBe('0')
      expect(result.usd).toBe('$0.00')
    })
  })

  describe('formatPrice', () => {
    it('formats USD currency', () => {
      expect(formatPrice(100)).toBe('$100.00')
    })

    it('formats non-USD currency', () => {
      expect(formatPrice(100, 'EUR')).toBe('100.00 EUR')
    })

    it('handles non-finite value', () => {
      expect(formatPrice(Infinity)).toBe('$0.00')
    })
  })

  describe('parsePrice', () => {
    it('parses string price', () => {
      expect(parsePrice('$100.00')).toBe(100)
    })

    it('returns number as-is when finite', () => {
      expect(parsePrice(42.5)).toBe(42.5)
    })

    it('returns 0 for non-finite number', () => {
      expect(parsePrice(Infinity)).toBe(0)
      expect(parsePrice(-Infinity)).toBe(0)
      expect(parsePrice(NaN)).toBe(0)
    })

    it('returns 0 for non-numeric string', () => {
      expect(parsePrice('abc')).toBe(0)
    })
  })
})
