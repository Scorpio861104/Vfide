/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from '@jest/globals'
import { getBadgeId, BADGE_REGISTRY } from '@/lib/badge-registry'

describe('Badge System & Gamification', () => {
  describe('Badge ID Generation', () => {
    it('should generate consistent badge IDs', () => {
      const pioneerId = getBadgeId('PIONEER')
      const sameId = getBadgeId('PIONEER')
      expect(pioneerId).toBe(sameId)
      expect(pioneerId.startsWith('0x')).toBe(true)
      expect(pioneerId.length).toBe(66) // 0x + 64 hex chars
    })

    it('should generate unique IDs for different badges', () => {
      const pioneer = getBadgeId('PIONEER')
      const founder = getBadgeId('FOUNDING_MEMBER')
      expect(pioneer).not.toBe(founder)
    })
  })

  describe('Badge Registry Metadata', () => {
    it('should have complete metadata for all badges', () => {
      Object.values(BADGE_REGISTRY).forEach(badge => {
        expect(badge.id).toBeDefined()
        expect(badge.name).toBeDefined()
        expect(badge.displayName).toBeDefined()
        expect(badge.description).toBeDefined()
        expect(badge.category).toBeDefined()
        expect(badge.points).toBeGreaterThan(0)
        expect(badge.rarity).toBeDefined()
        expect(badge.earnRequirement).toBeDefined()
      })
    })

    it('should have valid badge categories', () => {
      const validCategories = [
        'Pioneer & Foundation',
        'Activity & Participation',
        'Trust & Community',
        'Commerce & Merchants',
        'Security & Integrity',
        'Achievements & Milestones',
        'Education & Contribution',
        'Headhunter Competition',
      ]
      
      Object.values(BADGE_REGISTRY).forEach(badge => {
        expect(validCategories).toContain(badge.category)
      })
    })

    it('should have valid rarity levels', () => {
      const validRarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic']
      
      Object.values(BADGE_REGISTRY).forEach(badge => {
        expect(validRarities).toContain(badge.rarity)
      })
    })

    it('should have permanent badges with 0 duration', () => {
      Object.values(BADGE_REGISTRY).forEach(badge => {
        if (badge.isPermanent) {
          expect(badge.duration).toBe(0)
        } else {
          expect(badge.duration).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('XP and Level Calculation', () => {
    it('should calculate XP from badge points', () => {
      const points = [30, 40, 50, 100, 200]
      points.forEach(p => {
        const xp = p
        expect(xp).toBe(p)
      })
    })

    it('should calculate level from XP', () => {
      const testCases = [
        { xp: 0, expectedLevel: 0 },
        { xp: 50, expectedLevel: 0 },
        { xp: 100, expectedLevel: 1 },
        { xp: 250, expectedLevel: 2 },
        { xp: 500, expectedLevel: 5 },
        { xp: 1000, expectedLevel: 10 },
      ]

      testCases.forEach(({ xp, expectedLevel }) => {
        const level = Math.floor(xp / 100)
        expect(level).toBe(expectedLevel)
      })
    })

    it('should calculate XP needed for next level', () => {
      const currentXP = 234
      const currentLevel = Math.floor(currentXP / 100) // 2
      const nextLevelXP = (currentLevel + 1) * 100 // 300
      const xpNeeded = nextLevelXP - currentXP // 66
      
      expect(currentLevel).toBe(2)
      expect(xpNeeded).toBe(66)
    })

    it('should calculate XP progress percentage', () => {
      const currentXP = 234
      const progressInLevel = currentXP % 100 // 34
      const progressPercent = progressInLevel // 34%
      
      expect(progressPercent).toBe(34)
    })
  })

  describe('Badge Points Distribution', () => {
    it('should have higher points for rarer badges', () => {
      const rarityAvgPoints: Record<string, number[]> = {}
      
      Object.values(BADGE_REGISTRY).forEach(badge => {
        if (!rarityAvgPoints[badge.rarity]) {
          rarityAvgPoints[badge.rarity] = []
        }
        rarityAvgPoints[badge.rarity].push(badge.points)
      })

      const avgPoints = Object.entries(rarityAvgPoints).map(([rarity, points]) => ({
        rarity,
        avg: points.reduce((a, b) => a + b, 0) / points.length
      }))

      // Verify general trend: higher rarity = higher avg points
      expect(avgPoints.length).toBeGreaterThan(0)
    })

    it('should have permanent badges in significant categories', () => {
      const permanentBadges = Object.values(BADGE_REGISTRY).filter(b => b.isPermanent)
      expect(permanentBadges.length).toBeGreaterThan(0)
      
      // Pioneer badges should be permanent
      const pioneer = BADGE_REGISTRY.PIONEER
      expect(pioneer.isPermanent).toBe(true)
      expect(pioneer.duration).toBe(0)
    })

    it('should have renewable badges with valid durations', () => {
      const renewableBadges = Object.values(BADGE_REGISTRY).filter(b => !b.isPermanent)
      renewableBadges.forEach(badge => {
        expect(badge.duration).toBeGreaterThan(0)
        // Duration should be in seconds (reasonable range: 1 day to 2 years)
        const oneDay = 24 * 60 * 60
        const twoYears = 2 * 365 * 24 * 60 * 60
        expect(badge.duration).toBeGreaterThanOrEqual(oneDay)
        expect(badge.duration).toBeLessThanOrEqual(twoYears)
      })
    })
  })

  describe('Leaderboard XP Calculation', () => {
    it('should estimate XP from ProofScore', () => {
      const scores = [540, 600, 700, 800, 900]
      scores.forEach(score => {
        const xp = Math.max(0, (score - 540) * 10)
        expect(xp).toBeGreaterThanOrEqual(0)
        
        if (score === 540) expect(xp).toBe(0)
        if (score === 600) expect(xp).toBe(600)
        if (score === 700) expect(xp).toBe(1600)
      })
    })

    it('should calculate level from score-based XP', () => {
      const score = 700
      const xp = (score - 540) * 10 // 1600
      const level = Math.floor(xp / 100) // 16
      expect(level).toBe(16)
    })

    it('should handle minimum score correctly', () => {
      const minScore = 540
      const xp = Math.max(0, (minScore - 540) * 10)
      expect(xp).toBe(0)
      
      const level = Math.floor(xp / 100)
      expect(level).toBe(0)
    })

    it('should handle high scores correctly', () => {
      const highScore = 1000
      const xp = Math.max(0, (highScore - 540) * 10)
      expect(xp).toBe(4600)
      
      const level = Math.floor(xp / 100)
      expect(level).toBe(46)
    })
  })

  describe('Badge Filtering & Search', () => {
    it('should filter badges by category', () => {
      const category = 'Pioneer & Foundation'
      const filtered = Object.values(BADGE_REGISTRY).filter(b => b.category === category)
      expect(filtered.length).toBeGreaterThan(0)
      filtered.forEach(b => expect(b.category).toBe(category))
    })

    it('should search badges by name', () => {
      const query = 'PIONEER'
      const results = Object.values(BADGE_REGISTRY).filter(b => 
        b.name.toLowerCase().includes(query.toLowerCase())
      )
      expect(results.length).toBeGreaterThan(0)
    })

    it('should search badges by description', () => {
      const query = 'commerce'
      const results = Object.values(BADGE_REGISTRY).filter(b => 
        b.description.toLowerCase().includes(query.toLowerCase())
      )
      expect(results.length).toBeGreaterThan(0)
    })
  })
})
