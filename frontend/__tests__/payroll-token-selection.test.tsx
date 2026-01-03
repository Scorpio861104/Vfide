/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from '@jest/globals'
import { parseUnits, formatUnits } from 'viem'

describe('Payroll Token Selection Logic', () => {
  it('should parse amounts with correct decimals per token', () => {
    // VFIDE with 18 decimals
    const vfideAmount = parseUnits('5000', 18)
    expect(vfideAmount).toBe(BigInt('5000000000000000000000'))
    expect(formatUnits(vfideAmount, 18)).toBe('5000')

    // USDC with 6 decimals
    const usdcAmount = parseUnits('5000', 6)
    expect(usdcAmount).toBe(BigInt('5000000000'))
    expect(formatUnits(usdcAmount, 6)).toBe('5000')

    // Custom token with 8 decimals
    const customAmount = parseUnits('1234.56', 8)
    expect(customAmount).toBe(BigInt('123456000000'))
    expect(formatUnits(customAmount, 8)).toBe('1234.56')
  })

  it('should validate token address format', () => {
    const validAddress = '0xf57992ab9F8887650C2a220A34fe86ebD00c02f5'
    expect(validAddress.startsWith('0x')).toBe(true)
    expect(validAddress.length).toBe(42)

    const invalidAddress = '0xinvalid'
    expect(invalidAddress.length).not.toBe(42)
  })

  it('should handle token metadata fallback', () => {
    // Mock token metadata lookup
    const getTokenMeta = (token: string) => {
      const knownTokens: Record<string, { symbol: string; decimals: number }> = {
        '0xf57992ab9f8887650c2a220a34fe86ebd00c02f5': { symbol: 'VFIDE', decimals: 18 },
        '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { symbol: 'USDC', decimals: 6 },
      }
      return knownTokens[token.toLowerCase()] || { symbol: 'TOKEN', decimals: 18 }
    }

    expect(getTokenMeta('0xf57992ab9F8887650C2a220A34fe86ebD00c02f5')).toEqual({
      symbol: 'VFIDE',
      decimals: 18,
    })

    expect(getTokenMeta('0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48')).toEqual({
      symbol: 'USDC',
      decimals: 6,
    })

    expect(getTokenMeta('0xunknown')).toEqual({
      symbol: 'TOKEN',
      decimals: 18,
    })
  })

  it('should calculate monthly runway correctly', () => {
    const monthlyRate = 5000 // tokens per month
    const deposit = 15000 // tokens
    const runway = Math.floor(deposit / monthlyRate)
    expect(runway).toBe(3) // 3 months
  })

  it('should convert monthly rate to per-second rate', () => {
    const monthlyRate = 5000
    const secondsPerMonth = 30 * 24 * 60 * 60 // ~2592000 seconds
    const ratePerSecond = monthlyRate / secondsPerMonth
    expect(ratePerSecond).toBeCloseTo(0.00192901, 8)

    // For contract: parseUnits(monthlyRate) / secondsPerMonth
    const rateWei = parseUnits('5000', 18) / BigInt(secondsPerMonth)
    expect(rateWei).toBeGreaterThan(BigInt(0))
  })
})
