import { PRESALE_PRICES, DEFAULT_VFIDE_PRICE, vfideToUsd, formatVfideWithUsd } from '../price-utils'

describe('Price Utils', () => {
  describe('constants', () => {
    it('has correct presale prices from VFIDEPresale.sol', () => {
      expect(PRESALE_PRICES.founding).toBe(0.03)
      expect(PRESALE_PRICES.oath).toBe(0.05)
      expect(PRESALE_PRICES.public).toBe(0.07)
    })

    it('has correct default price (Oath tier)', () => {
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
})
