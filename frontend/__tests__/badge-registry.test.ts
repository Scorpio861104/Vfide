import { describe, it, expect, vi } from 'vitest'
import { getBadgeId, BADGE_REGISTRY, type BadgeMetadata } from '@/lib/badge-registry'

describe('badge-registry', () => {
  describe('getBadgeId', () => {
    it('returns a hex string starting with 0x', () => {
      const id = getBadgeId('TEST')
      expect(id.startsWith('0x')).toBe(true)
    })

    it('returns consistent hash for same input', () => {
      const id1 = getBadgeId('PIONEER')
      const id2 = getBadgeId('PIONEER')
      expect(id1).toBe(id2)
    })

    it('returns different hash for different inputs', () => {
      const id1 = getBadgeId('PIONEER')
      const id2 = getBadgeId('GENESIS_PRESALE')
      expect(id1).not.toBe(id2)
    })

    it('generates correct length keccak256 hash', () => {
      const id = getBadgeId('TEST')
      // keccak256 produces 32 bytes = 64 hex chars + '0x' prefix
      expect(id.length).toBe(66)
    })
  })

  describe('BADGE_REGISTRY', () => {
    it('contains PIONEER badge', () => {
      expect(BADGE_REGISTRY.PIONEER).toBeDefined()
      expect(BADGE_REGISTRY.PIONEER.name).toBe('PIONEER')
      expect(BADGE_REGISTRY.PIONEER.displayName).toBe('Pioneer')
    })

    it('contains GENESIS_PRESALE badge', () => {
      expect(BADGE_REGISTRY.GENESIS_PRESALE).toBeDefined()
      expect(BADGE_REGISTRY.GENESIS_PRESALE.points).toBe(40)
    })

    it('contains FOUNDING_MEMBER badge', () => {
      expect(BADGE_REGISTRY.FOUNDING_MEMBER).toBeDefined()
      expect(BADGE_REGISTRY.FOUNDING_MEMBER.rarity).toBe('Mythic')
    })

    it('all badges have required fields', () => {
      Object.values(BADGE_REGISTRY).forEach((badge: BadgeMetadata) => {
        expect(badge.id).toBeTruthy()
        expect(badge.name).toBeTruthy()
        expect(badge.displayName).toBeTruthy()
        expect(badge.description).toBeTruthy()
        expect(badge.category).toBeTruthy()
        expect(badge.icon).toBeTruthy()
        expect(typeof badge.points).toBe('number')
        expect(typeof badge.duration).toBe('number')
        expect(typeof badge.isPermanent).toBe('boolean')
        expect(badge.rarity).toBeTruthy()
        expect(badge.earnRequirement).toBeTruthy()
      })
    })

    it('permanent badges have duration 0', () => {
      Object.values(BADGE_REGISTRY).forEach((badge: BadgeMetadata) => {
        if (badge.isPermanent) {
          expect(badge.duration).toBe(0)
        }
      })
    })

    it('non-permanent badges have duration > 0', () => {
      Object.values(BADGE_REGISTRY).forEach((badge: BadgeMetadata) => {
        if (!badge.isPermanent) {
          expect(badge.duration).toBeGreaterThan(0)
        }
      })
    })

    it('badge IDs match generated hashes', () => {
      Object.entries(BADGE_REGISTRY).forEach(([key, badge]) => {
        expect(badge.id).toBe(getBadgeId(badge.name))
      })
    })

    it('has valid rarity values', () => {
      const validRarities = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic']
      Object.values(BADGE_REGISTRY).forEach((badge: BadgeMetadata) => {
        expect(validRarities).toContain(badge.rarity)
      })
    })

    it('has correct categories', () => {
      const categories = new Set(Object.values(BADGE_REGISTRY).map(b => b.category))
      expect(categories.size).toBeGreaterThan(0)
    })
  })
})
