import { describe, it, expect } from '@jest/globals'
import { getScoreTier } from '@/hooks/useProofScore'

describe('useProofScore', () => {
  describe('getScoreTier', () => {
    it('returns Elite for scores >= 8000', () => {
      expect(getScoreTier(8000)).toBe('Elite')
      expect(getScoreTier(8500)).toBe('Elite')
      expect(getScoreTier(9999)).toBe('Elite')
    })

    it('returns Council for scores 7000-7999', () => {
      expect(getScoreTier(7000)).toBe('Council')
      expect(getScoreTier(7500)).toBe('Council')
      expect(getScoreTier(7999)).toBe('Council')
    })

    it('returns Trusted for scores 5600-6999', () => {
      expect(getScoreTier(5600)).toBe('Trusted')
      expect(getScoreTier(6000)).toBe('Trusted')
      expect(getScoreTier(6999)).toBe('Trusted')
    })

    it('returns Governance for scores 5400-5599', () => {
      expect(getScoreTier(5400)).toBe('Governance')
      expect(getScoreTier(5500)).toBe('Governance')
      expect(getScoreTier(5599)).toBe('Governance')
    })

    it('returns Neutral for scores 5000-5399', () => {
      expect(getScoreTier(5000)).toBe('Neutral')
      expect(getScoreTier(5200)).toBe('Neutral')
      expect(getScoreTier(5399)).toBe('Neutral')
    })

    it('returns Low Trust for scores 3500-4999', () => {
      expect(getScoreTier(3500)).toBe('Low Trust')
      expect(getScoreTier(4000)).toBe('Low Trust')
      expect(getScoreTier(4999)).toBe('Low Trust')
    })

    it('returns Risky for scores < 3500', () => {
      expect(getScoreTier(0)).toBe('Risky')
      expect(getScoreTier(3499)).toBe('Risky')
      expect(getScoreTier(1000)).toBe('Risky')
    })
  })

  describe('score thresholds', () => {
    it('voting requires 5400+ score', () => {
      const canVote = (score: number) => score >= 5400
      expect(canVote(5400)).toBe(true)
      expect(canVote(5399)).toBe(false)
    })

    it('merchant requires 5600+ score', () => {
      const canMerchant = (score: number) => score >= 5600
      expect(canMerchant(5600)).toBe(true)
      expect(canMerchant(5599)).toBe(false)
    })

    it('council requires 7000+ score', () => {
      const canCouncil = (score: number) => score >= 7000
      expect(canCouncil(7000)).toBe(true)
      expect(canCouncil(6999)).toBe(false)
    })

    it('endorsing requires 8000+ score', () => {
      const canEndorse = (score: number) => score >= 8000
      expect(canEndorse(8000)).toBe(true)
      expect(canEndorse(7999)).toBe(false)
    })
  })

  describe('burn fee calculation', () => {
    it('calculates correct fees based on score', () => {
      const getBurnFee = (score: number) => 
        score >= 8000 ? 0.25 :
        score >= 7000 ? 1.0 :
        score >= 5000 ? 2.5 :
        score >= 4000 ? 3.5 :
        5.0

      expect(getBurnFee(8000)).toBe(0.25)
      expect(getBurnFee(7000)).toBe(1.0)
      expect(getBurnFee(5000)).toBe(2.5)
      expect(getBurnFee(4000)).toBe(3.5)
      expect(getBurnFee(3999)).toBe(5.0)
    })
  })

  describe('score colors', () => {
    it('returns correct colors based on score', () => {
      const getColor = (score: number) => 
        score >= 8000 ? '#00FF88' :
        score >= 7000 ? '#00F0FF' :
        score >= 5000 ? '#FFD700' :
        score >= 3500 ? '#FFA500' : '#FF4444'

      expect(getColor(8000)).toBe('#00FF88') // Elite green
      expect(getColor(7000)).toBe('#00F0FF') // High trust cyan
      expect(getColor(5000)).toBe('#FFD700') // Neutral gold
      expect(getColor(3500)).toBe('#FFA500') // Low orange
      expect(getColor(3000)).toBe('#FF4444') // Risky red
    })
  })
})
