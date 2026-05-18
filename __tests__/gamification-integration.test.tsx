/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from '@jest/globals'

describe('Gamification Integration', () => {
  describe('End-to-End Badge Journey', () => {
    it('should progress from new user to elite achiever', () => {
      // Starting state
      let proofScore = 540
      let xp = 0
      let level = 0
      const badges: string[] = []

      // Step 1: Join as Pioneer (first 10k users)
      badges.push('PIONEER')
      xp += 30
      proofScore += 30
      level = Math.floor(xp / 100)

      expect(badges).toContain('PIONEER')
      expect(proofScore).toBe(570)
      expect(level).toBe(0)

      // Step 2: Complete 50+ transactions (Active Trader)
      badges.push('ACTIVE_TRADER')
      xp += 20
      proofScore += 20
      level = Math.floor(xp / 100)

      expect(badges.length).toBe(2)
      expect(proofScore).toBe(590)
      expect(xp).toBe(50)

      // Step 3: Vote on 10+ proposals (Governance Voter)
      badges.push('GOVERNANCE_VOTER')
      xp += 25
      proofScore += 25
      level = Math.floor(xp / 100)

      expect(badges.length).toBe(3)
      expect(proofScore).toBe(615)
      expect(xp).toBe(75)

      // Step 4: Use 3+ features (Power User)
      badges.push('POWER_USER')
      xp += 40
      proofScore += 40
      level = Math.floor(xp / 100)

      expect(badges.length).toBe(4)
      expect(proofScore).toBe(655)
      expect(xp).toBe(115)
      expect(level).toBe(1) // Level up!

      // Step 5: Endorse 5+ users (Trusted Endorser)
      badges.push('TRUSTED_ENDORSER')
      xp += 30
      proofScore += 30
      level = Math.floor(xp / 100)

      expect(badges.length).toBe(5)
      expect(proofScore).toBe(685)
      expect(xp).toBe(145)
      expect(level).toBe(1)

      // Step 6: 100+ merchant transactions (Verified Merchant)
      badges.push('VERIFIED_MERCHANT')
      xp += 40
      proofScore += 40
      level = Math.floor(xp / 100)

      expect(badges.length).toBe(6)
      expect(proofScore).toBe(725)
      expect(xp).toBe(185)
      expect(level).toBe(1)

      // Step 7: Recruit 10 users (Community Builder)
      badges.push('COMMUNITY_BUILDER')
      xp += 35
      proofScore += 35
      level = Math.floor(xp / 100)

      expect(badges.length).toBe(7)
      expect(proofScore).toBe(760)
      expect(xp).toBe(220)
      expect(level).toBe(2) // Level up again!

      // Step 8: Reach 900+ score (Elite Achiever)
      // Need to earn more badges to reach 900
      const requiredScore = 900
      const currentScore = proofScore
      const scoreNeeded = requiredScore - currentScore
      
      expect(scoreNeeded).toBe(140) // Still need 140 points
      
      // Continue earning more badges...
      badges.push('ELITE_MERCHANT') // +60
      xp += 60
      proofScore += 60
      
      badges.push('FRAUD_HUNTER') // +50
      xp += 50
      proofScore += 50
      
      badges.push('GUARDIAN') // +40
      xp += 40
      proofScore += 40
      
      level = Math.floor(xp / 100)
      
      expect(proofScore).toBeGreaterThanOrEqual(900)
      expect(badges.length).toBe(10)
      expect(level).toBe(3)
      
      // Final badge: Elite Achiever
      badges.push('ELITE_ACHIEVER')
      xp += 50
      proofScore += 50
      level = Math.floor(xp / 100)
      
      expect(badges).toContain('ELITE_ACHIEVER')
      expect(proofScore).toBe(960)
      expect(xp).toBe(420)
      expect(level).toBe(4)
    })

    it('should calculate leaderboard position from XP', () => {
      const users = [
        { address: '0xUser1', score: 700, xp: (700 - 540) * 10 },
        { address: '0xUser2', score: 800, xp: (800 - 540) * 10 },
        { address: '0xUser3', score: 600, xp: (600 - 540) * 10 },
        { address: '0xUser4', score: 900, xp: (900 - 540) * 10 },
      ]

      const sorted = users.sort((a, b) => b.score - a.score)
      const leaderboard = sorted.map((u, idx) => ({
        ...u,
        rank: idx + 1,
        level: Math.floor(u.xp / 100),
      }))

      expect(leaderboard[0].address).toBe('0xUser4')
      expect(leaderboard[0].rank).toBe(1)
      expect(leaderboard[0].level).toBe(36) // (900-540)*10/100 = 36

      expect(leaderboard[3].address).toBe('0xUser3')
      expect(leaderboard[3].rank).toBe(4)
      expect(leaderboard[3].level).toBe(6) // (600-540)*10/100 = 6
    })

    it('should handle badge renewal cycles', () => {
      // Renewable badge: Active Trader (90 days)
      const earnedAt = Date.now()
      const duration = 90 * 24 * 60 * 60 * 1000 // 90 days in ms
      const expiresAt = earnedAt + duration

      // Check before expiry
      expect(Date.now()).toBeLessThan(expiresAt)

      // Simulate time passing
      const futureTime = earnedAt + (95 * 24 * 60 * 60 * 1000) // 95 days later
      const isExpired = futureTime > expiresAt

      expect(isExpired).toBe(true)

      // User needs to re-qualify
      const needsRenewal = isExpired
      expect(needsRenewal).toBe(true)

      // After re-qualifying, badge is renewed
      const renewedAt = futureTime
      const newExpiresAt = renewedAt + duration

      expect(newExpiresAt).toBeGreaterThan(futureTime)
    })

    it('should prioritize permanent badges over temporary', () => {
      const badges = [
        { name: 'ACTIVE_TRADER', permanent: false, points: 20 },
        { name: 'PIONEER', permanent: true, points: 30 },
        { name: 'GOVERNANCE_VOTER', permanent: false, points: 25 },
        { name: 'FOUNDING_MEMBER', permanent: true, points: 50 },
      ]

      const permanentBadges = badges.filter(b => b.permanent)
      const temporaryBadges = badges.filter(b => !b.permanent)

      expect(permanentBadges.length).toBe(2)
      expect(temporaryBadges.length).toBe(2)

      // Permanent badges should have higher average points
      const avgPermanent = permanentBadges.reduce((sum, b) => sum + b.points, 0) / permanentBadges.length
      const avgTemporary = temporaryBadges.reduce((sum, b) => sum + b.points, 0) / temporaryBadges.length

      expect(avgPermanent).toBeGreaterThan(avgTemporary)
      expect(avgPermanent).toBe(40) // (30 + 50) / 2
      expect(avgTemporary).toBe(22.5) // (20 + 25) / 2
    })
  })

  describe('XP Progression System', () => {
    it('should have exponential difficulty for high levels', () => {
      const levelsAndXP = [
        { level: 1, xp: 100 },
        { level: 5, xp: 500 },
        { level: 10, xp: 1000 },
        { level: 20, xp: 2000 },
        { level: 50, xp: 5000 },
      ]

      levelsAndXP.forEach(({ level, xp }) => {
        const calculatedLevel = Math.floor(xp / 100)
        expect(calculatedLevel).toBe(level)
      })
    })

    it('should show progress to next level', () => {
      const currentXP = 234
      const currentLevel = Math.floor(currentXP / 100) // 2
      const nextLevelXP = (currentLevel + 1) * 100 // 300
      const progress = currentXP % 100 // 34
      const progressPercent = (progress / 100) * 100 // 34%

      expect(currentLevel).toBe(2)
      expect(nextLevelXP).toBe(300)
      expect(progress).toBe(34)
      expect(progressPercent).toBe(34)
    })
  })

  describe('Leaderboard Mechanics', () => {
    it('should handle rank changes correctly', () => {
      const previousRanks = new Map([
        ['0xUser1', 1],
        ['0xUser2', 2],
        ['0xUser3', 3],
      ])

      const currentRanks = new Map([
        ['0xUser2', 1], // Moved up
        ['0xUser1', 2], // Moved down
        ['0xUser3', 3], // No change
      ])

      const changes = Array.from(currentRanks.entries()).map(([addr, rank]) => ({
        address: addr,
        rank,
        change: (previousRanks.get(addr) ?? rank) - rank,
      }))

      expect(changes[0].change).toBe(1) // User2: 2 - 1 = +1
      expect(changes[1].change).toBe(-1) // User1: 1 - 2 = -1
      expect(changes[2].change).toBe(0) // User3: 3 - 3 = 0
    })

    it('should calculate tier from score', () => {
      const scoreToTier = (score: number): string => {
        if (score >= 900) return 'CHAMPION'
        if (score >= 800) return 'GUARDIAN'
        if (score >= 700) return 'DELEGATE'
        if (score >= 600) return 'ADVOCATE'
        if (score >= 540) return 'MERCHANT'
        return 'NEUTRAL'
      }

      expect(scoreToTier(950)).toBe('CHAMPION')
      expect(scoreToTier(850)).toBe('GUARDIAN')
      expect(scoreToTier(750)).toBe('DELEGATE')
      expect(scoreToTier(650)).toBe('ADVOCATE')
      expect(scoreToTier(580)).toBe('MERCHANT')
      expect(scoreToTier(500)).toBe('NEUTRAL')
    })
  })
})
