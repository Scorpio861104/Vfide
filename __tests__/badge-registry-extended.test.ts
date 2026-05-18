import { describe, expect, it } from '@jest/globals'
import {
  getBadgeId,
  BADGE_REGISTRY,
  getAllBadges,
  getBadgeByName,
  getBadgeById,
  getBadgesByCategory,
  getBadgeCategories,
  formatDuration,
} from '@/lib/badge-registry'

describe('Badge Registry - Extended Coverage', () => {
  describe('getBadgeId', () => {
    it('generates consistent hash for same name', () => {
      const id1 = getBadgeId('early_adopter')
      const id2 = getBadgeId('early_adopter')
      expect(id1).toBe(id2)
    })

    it('generates different hashes for different names', () => {
      const id1 = getBadgeId('early_adopter')
      const id2 = getBadgeId('first_payment')
      expect(id1).not.toBe(id2)
    })

    it('returns hex string', () => {
      const id = getBadgeId('test_badge')
      expect(id).toMatch(/^0x[a-f0-9]+$/i)
    })
  })

  describe('BADGE_REGISTRY', () => {
    it('is an object', () => {
      expect(typeof BADGE_REGISTRY).toBe('object')
    })

    it('has badge entries', () => {
      expect(Object.keys(BADGE_REGISTRY).length).toBeGreaterThan(0)
    })

    it('each badge has required fields', () => {
      Object.values(BADGE_REGISTRY).forEach((badge) => {
        expect(badge.id).toBeDefined()
        expect(badge.name).toBeDefined()
        expect(badge.displayName).toBeDefined()
        expect(badge.description).toBeDefined()
        expect(badge.category).toBeDefined()
        expect(badge.rarity).toBeDefined()
        expect(badge.icon).toBeDefined()
        expect(badge.points).toBeDefined()
        expect(badge.duration).toBeDefined()
        expect(typeof badge.isPermanent).toBe('boolean')
      })
    })

    it('badges have valid rarity values', () => {
      const validRarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic']
      Object.values(BADGE_REGISTRY).forEach((badge) => {
        expect(validRarities).toContain(badge.rarity)
      })
    })

    it('badges have positive or zero points', () => {
      Object.values(BADGE_REGISTRY).forEach((badge) => {
        expect(badge.points).toBeGreaterThanOrEqual(0)
      })
    })

    it('permanent badges have duration 0', () => {
      Object.values(BADGE_REGISTRY).forEach((badge) => {
        if (badge.isPermanent) {
          expect(badge.duration).toBe(0)
        }
      })
    })
  })

  describe('getAllBadges', () => {
    it('returns an array', () => {
      const badges = getAllBadges()
      expect(Array.isArray(badges)).toBe(true)
    })

    it('returns all badges from registry', () => {
      const badges = getAllBadges()
      expect(badges.length).toBe(Object.keys(BADGE_REGISTRY).length)
    })

    it('each badge has an id and name', () => {
      const badges = getAllBadges()
      badges.forEach((badge) => {
        expect(badge.id).toMatch(/^0x[a-f0-9]+$/i)
        expect(badge.name).toBeTruthy()
      })
    })
  })

  describe('getBadgeByName', () => {
    it('finds existing badge', () => {
      const firstBadgeName = Object.keys(BADGE_REGISTRY)[0]
      const badge = getBadgeByName(firstBadgeName)
      expect(badge).toBeDefined()
      expect(badge?.name).toBe(firstBadgeName)
    })

    it('returns undefined for non-existent badge', () => {
      const badge = getBadgeByName('nonexistent_badge_12345')
      expect(badge).toBeUndefined()
    })

    it('finds PIONEER badge', () => {
      const badge = getBadgeByName('PIONEER')
      expect(badge).toBeDefined()
      expect(badge?.displayName).toBe('Pioneer')
    })
  })

  describe('getBadgeById', () => {
    it('finds existing badge by id', () => {
      const firstBadge = Object.values(BADGE_REGISTRY)[0]
      const found = getBadgeById(firstBadge.id)
      expect(found).toBeDefined()
      expect(found?.id).toBe(firstBadge.id)
    })

    it('returns undefined for non-existent id', () => {
      const badge = getBadgeById('0x0000000000000000000000000000000000000000000000000000000000000000')
      expect(badge).toBeUndefined()
    })

    it('returns badge with matching id', () => {
      const pioneer = BADGE_REGISTRY['PIONEER']
      const found = getBadgeById(pioneer.id)
      expect(found?.name).toBe('PIONEER')
    })
  })

  describe('getBadgesByCategory', () => {
    it('returns badges for valid category', () => {
      const categories = getBadgeCategories()
      if (categories.length > 0) {
        const badges = getBadgesByCategory(categories[0])
        expect(Array.isArray(badges)).toBe(true)
        expect(badges.length).toBeGreaterThan(0)
      }
    })

    it('returns empty array for invalid category', () => {
      const badges = getBadgesByCategory('nonexistent_category_12345')
      expect(badges).toEqual([])
    })

    it('all returned badges have matching category', () => {
      const categories = getBadgeCategories()
      if (categories.length > 0) {
        const badges = getBadgesByCategory(categories[0])
        badges.forEach((badge) => {
          expect(badge.category).toBe(categories[0])
        })
      }
    })

    it('Pioneer & Foundation category returns Pioneer badge', () => {
      const badges = getBadgesByCategory('Pioneer & Foundation')
      expect(badges.length).toBeGreaterThan(0)
      expect(badges.some(b => b.name === 'PIONEER')).toBe(true)
    })
  })

  describe('getBadgeCategories', () => {
    it('returns an array', () => {
      const categories = getBadgeCategories()
      expect(Array.isArray(categories)).toBe(true)
    })

    it('returns unique categories', () => {
      const categories = getBadgeCategories()
      const uniqueCategories = [...new Set(categories)]
      expect(categories.length).toBe(uniqueCategories.length)
    })

    it('includes known categories', () => {
      const categories = getBadgeCategories()
      expect(categories).toContain('Pioneer & Foundation')
      expect(categories).toContain('Activity & Participation')
    })
  })

  describe('formatDuration', () => {
    it('formats 0 as Permanent', () => {
      const result = formatDuration(0)
      expect(result).toBe('Permanent')
    })

    it('formats 1 day', () => {
      const result = formatDuration(24 * 60 * 60) // 86400 seconds
      expect(result).toBe('1 days')
    })

    it('formats 30 days', () => {
      const result = formatDuration(30 * 24 * 60 * 60)
      expect(result).toBe('30 days')
    })

    it('formats 90 days', () => {
      const result = formatDuration(90 * 24 * 60 * 60)
      expect(result).toBe('90 days')
    })

    it('floors partial days', () => {
      const result = formatDuration(2 * 24 * 60 * 60 + 12 * 60 * 60) // 2.5 days
      expect(result).toBe('2 days')
    })

    it('returns 0 days for less than 1 day', () => {
      const result = formatDuration(12 * 60 * 60) // 12 hours
      expect(result).toBe('0 days')
    })
  })

  describe('Badge ID consistency', () => {
    it('PIONEER badge ID matches generated ID', () => {
      const pioneer = BADGE_REGISTRY['PIONEER']
      const generatedId = getBadgeId('PIONEER')
      expect(pioneer.id).toBe(generatedId)
    })

    it('all badges have IDs matching their name', () => {
      Object.entries(BADGE_REGISTRY).forEach(([name, badge]) => {
        const generatedId = getBadgeId(name)
        expect(badge.id).toBe(generatedId)
      })
    })
  })
})
