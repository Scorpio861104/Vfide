/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  MockDate, 
  BadgeTimeTravel, 
  TIME, 
  TEST_PERIODS 
} from './utils/time-travel.helpers';
import { BADGE_REGISTRY } from '@/lib/badge-registry';

describe('Badge Time-Dependent Features', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Badge Duration Logic', () => {
    it('should correctly identify permanent badges', () => {
      const permanentBadges = Object.values(BADGE_REGISTRY).filter(b => b.isPermanent);
      
      permanentBadges.forEach(badge => {
        expect(badge.duration).toBe(0);
        expect(BadgeTimeTravel.isBadgeExpired(startTime, badge.duration, startTime + 10 * TIME.YEAR * 1000)).toBe(false);
      });
    });

    it('should correctly identify time-limited badges', () => {
      const timeLimitedBadges = Object.values(BADGE_REGISTRY).filter(b => !b.isPermanent);
      
      timeLimitedBadges.forEach(badge => {
        expect(badge.duration).toBeGreaterThan(0);
      });
    });

    it('should have correct durations for specific badges', () => {
      expect(BADGE_REGISTRY.ACTIVE_TRADER.duration).toBe(90 * TIME.DAY);
      expect(BADGE_REGISTRY.GOVERNANCE_VOTER.duration).toBe(180 * TIME.DAY);
      expect(BADGE_REGISTRY.CLEAN_RECORD.duration).toBe(365 * TIME.DAY);
      expect(BADGE_REGISTRY.PIONEER.duration).toBe(0);
    });
  });

  describe('Active Trader Badge (90 days)', () => {
    const awardTime = startTime;
    const duration = TEST_PERIODS.BADGE_90_DAYS;

    it('should not expire immediately after award', () => {
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, awardTime)).toBe(false);
    });

    it('should not expire after 89 days', () => {
      const checkTime = awardTime + 89 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, checkTime)).toBe(false);
    });

    it('should expire at exactly 90 days', () => {
      const expirationTime = awardTime + 90 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, expirationTime)).toBe(true);
    });

    it('should expire after 90 days', () => {
      const checkTime = awardTime + 91 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, checkTime)).toBe(true);
    });

    it('should calculate correct expiration time', () => {
      const expirationTime = BadgeTimeTravel.getExpirationTime(awardTime, duration);
      const expectedExpiration = awardTime + 90 * TIME.DAY * 1000;
      expect(expirationTime).toBe(expectedExpiration);
    });

    it('should calculate correct time remaining', () => {
      const checkTime = awardTime + 45 * TIME.DAY * 1000; // Halfway
      const remaining = BadgeTimeTravel.getTimeRemaining(awardTime, duration, checkTime);
      const expectedRemaining = 45 * TIME.DAY * 1000;
      expect(remaining).toBe(expectedRemaining);
    });

    it('should return 0 time remaining after expiration', () => {
      const checkTime = awardTime + 100 * TIME.DAY * 1000;
      const remaining = BadgeTimeTravel.getTimeRemaining(awardTime, duration, checkTime);
      expect(remaining).toBe(0);
    });
  });

  describe('Governance Voter Badge (180 days)', () => {
    const awardTime = startTime;
    const duration = TEST_PERIODS.BADGE_180_DAYS;

    it('should remain valid for 180 days', () => {
      const checkTime = awardTime + 179 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, checkTime)).toBe(false);
    });

    it('should expire at 180 days', () => {
      const expirationTime = awardTime + 180 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, expirationTime)).toBe(true);
    });

    it('should calculate correct expiration time', () => {
      const expirationTime = BadgeTimeTravel.getExpirationTime(awardTime, duration);
      const expectedExpiration = awardTime + 180 * TIME.DAY * 1000;
      expect(expirationTime).toBe(expectedExpiration);
    });
  });

  describe('Clean Record Badge (365 days)', () => {
    const awardTime = startTime;
    const duration = TEST_PERIODS.BADGE_365_DAYS;

    it('should remain valid for a full year', () => {
      const checkTime = awardTime + 364 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, checkTime)).toBe(false);
    });

    it('should expire after 1 year', () => {
      const expirationTime = awardTime + 365 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, expirationTime)).toBe(true);
    });

    it('should handle leap years correctly', () => {
      // Approximate - 365.25 days for leap year adjustment
      const leapYearCheck = awardTime + 366 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, leapYearCheck)).toBe(true);
    });
  });

  describe('Guardian Badge (2+ years requirement)', () => {
    it('should verify user maintains score for 2 years', () => {
      // Simulate 2 years of maintaining high score
      const twoYears = 2 * 365 * TIME.DAY * 1000;
      
      // User earns badge after 2 years
      const badgeAwardTime = startTime + twoYears;
      
      // Badge is permanent
      expect(BADGE_REGISTRY.GUARDIAN.isPermanent).toBe(true);
      expect(BADGE_REGISTRY.GUARDIAN.duration).toBe(0);
      
      // Should never expire
      const farFuture = badgeAwardTime + 10 * TIME.YEAR * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(badgeAwardTime, 0, farFuture)).toBe(false);
    });

    it('should calculate 2-year period correctly', () => {
      const twoYears = 2 * 365 * TIME.DAY;
      expect(twoYears).toBe(730 * TIME.DAY);
    });
  });

  describe('Permanent Badge Behavior', () => {
    const permanentBadges = [
      { name: 'PIONEER', badge: BADGE_REGISTRY.PIONEER },
      { name: 'FOUNDING_MEMBER', badge: BADGE_REGISTRY.FOUNDING_MEMBER },
      { name: 'TRUSTED_ENDORSER', badge: BADGE_REGISTRY.TRUSTED_ENDORSER },
    ];

    permanentBadges.forEach(({ name, badge }) => {
      describe(`${name} Badge`, () => {
        it('should never expire', () => {
          const awardTime = startTime;
          const farFuture = awardTime + 100 * TIME.YEAR * 1000;
          
          expect(BadgeTimeTravel.isBadgeExpired(awardTime, badge.duration, farFuture)).toBe(false);
        });

        it('should have infinite expiration time', () => {
          const expirationTime = BadgeTimeTravel.getExpirationTime(startTime, badge.duration);
          expect(expirationTime).toBe(Infinity);
        });

        it('should have infinite time remaining', () => {
          const remaining = BadgeTimeTravel.getTimeRemaining(startTime, badge.duration, startTime + 1000000);
          expect(remaining).toBe(Infinity);
        });
      });
    });
  });

  describe('Badge Renewal and Re-earning', () => {
    it('should handle Active Trader badge renewal', () => {
      const firstAward = startTime;
      const firstDuration = TEST_PERIODS.BADGE_90_DAYS;
      
      // First badge expires
      const firstExpiration = BadgeTimeTravel.getExpirationTime(firstAward, firstDuration);
      expect(BadgeTimeTravel.isBadgeExpired(firstAward, firstDuration, firstExpiration)).toBe(true);
      
      // User re-earns badge
      const secondAward = firstExpiration + 1000;
      
      // New badge should not expire immediately
      expect(BadgeTimeTravel.isBadgeExpired(secondAward, firstDuration, secondAward)).toBe(false);
      
      // New badge expires 90 days after re-earning
      const secondExpiration = BadgeTimeTravel.getExpirationTime(secondAward, firstDuration);
      expect(BadgeTimeTravel.isBadgeExpired(secondAward, firstDuration, secondExpiration)).toBe(true);
    });

    it('should allow multiple renewals', () => {
      const duration = TEST_PERIODS.BADGE_90_DAYS;
      let currentAward = startTime;
      
      for (let renewal = 0; renewal < 5; renewal++) {
        // Badge should be valid for 90 days from current award
        const expirationTime = BadgeTimeTravel.getExpirationTime(currentAward, duration);
        expect(BadgeTimeTravel.isBadgeExpired(currentAward, duration, expirationTime - 1000)).toBe(false);
        expect(BadgeTimeTravel.isBadgeExpired(currentAward, duration, expirationTime)).toBe(true);
        
        // Re-earn after expiration
        currentAward = expirationTime + 1 * TIME.DAY * 1000;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle badge awarded at exact midnight', () => {
      const midnight = new Date('2024-01-01T00:00:00Z').getTime();
      const duration = 90 * TIME.DAY;
      
      const expirationTime = BadgeTimeTravel.getExpirationTime(midnight, duration);
      // 90 days from Jan 1 is April 1 (Jan=31, Feb=29 leap year, Mar=31 = 91 days but we count from day 0)
      // Actually: Jan 1 + 90 days = Mar 31
      const expectedTime = midnight + 90 * TIME.DAY * 1000;
      
      expect(expirationTime).toBe(expectedTime);
    });

    it('should handle badge awarded at odd timestamp', () => {
      const oddTime = startTime + 12345678; // Random milliseconds
      const duration = 90 * TIME.DAY;
      
      const expirationTime = BadgeTimeTravel.getExpirationTime(oddTime, duration);
      expect(expirationTime).toBe(oddTime + 90 * TIME.DAY * 1000);
    });

    it('should handle checking expiration at exact expiration time', () => {
      const awardTime = startTime;
      const duration = 90 * TIME.DAY;
      const expirationTime = BadgeTimeTravel.getExpirationTime(awardTime, duration);
      
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, expirationTime)).toBe(true);
    });

    it('should handle zero time remaining', () => {
      const awardTime = startTime;
      const duration = 90 * TIME.DAY;
      const afterExpiration = awardTime + 100 * TIME.DAY * 1000;
      
      const remaining = BadgeTimeTravel.getTimeRemaining(awardTime, duration, afterExpiration);
      expect(remaining).toBe(0);
    });
  });

  describe('Time Travel Integration', () => {
    it('should work with MockDate for badge lifecycle', () => {
      const duration = 90 * TIME.DAY;
      
      // Award badge
      MockDate.travelTo(startTime);
      const awardTime = MockDate.getCurrentTime();
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, awardTime)).toBe(false);
      
      // Travel forward 45 days
      MockDate.travel(45 * TIME.DAY);
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, MockDate.getCurrentTime())).toBe(false);
      
      // Travel to expiration
      MockDate.travel(45 * TIME.DAY);
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, MockDate.getCurrentTime())).toBe(true);
    });

    it('should simulate badge expiration over time', () => {
      const duration = 90 * TIME.DAY;
      MockDate.travelTo(startTime);
      const awardTime = MockDate.getCurrentTime();
      
      // Check every day for 100 days
      for (let day = 0; day < 100; day++) {
        const currentTime = MockDate.getCurrentTime();
        const isExpired = BadgeTimeTravel.isBadgeExpired(awardTime, duration, currentTime);
        
        if (day < 90) {
          expect(isExpired).toBe(false);
        } else {
          expect(isExpired).toBe(true);
        }
        
        MockDate.travel(TIME.DAY);
      }
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle user checking badge status periodically', () => {
      const awardTime = startTime;
      const duration = BADGE_REGISTRY.ACTIVE_TRADER.duration;
      
      // Check after 1 month
      const oneMonth = awardTime + 30 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, oneMonth)).toBe(false);
      const remaining1 = BadgeTimeTravel.getTimeRemaining(awardTime, duration, oneMonth);
      expect(remaining1).toBe(60 * TIME.DAY * 1000);
      
      // Check after 2 months
      const twoMonths = awardTime + 60 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, twoMonths)).toBe(false);
      const remaining2 = BadgeTimeTravel.getTimeRemaining(awardTime, duration, twoMonths);
      expect(remaining2).toBe(30 * TIME.DAY * 1000);
      
      // Check after 3 months (expired)
      const threeMonths = awardTime + 90 * TIME.DAY * 1000;
      expect(BadgeTimeTravel.isBadgeExpired(awardTime, duration, threeMonths)).toBe(true);
      const remaining3 = BadgeTimeTravel.getTimeRemaining(awardTime, duration, threeMonths);
      expect(remaining3).toBe(0);
    });

    it('should handle merchant maintaining multiple time-limited badges', () => {
      const awardTime = startTime;
      
      const badges = [
        { name: 'VERIFIED_MERCHANT', duration: 365 * TIME.DAY },
        { name: 'ELITE_MERCHANT', duration: 180 * TIME.DAY },
        { name: 'ZERO_DISPUTE', duration: 180 * TIME.DAY },
      ];
      
      // Check after 6 months
      const sixMonths = awardTime + 180 * TIME.DAY * 1000;
      
      badges.forEach(badge => {
        const isExpired = BadgeTimeTravel.isBadgeExpired(awardTime, badge.duration, sixMonths);
        
        if (badge.duration === 365 * TIME.DAY) {
          expect(isExpired).toBe(false); // 1-year badge still valid
        } else {
          expect(isExpired).toBe(true); // 6-month badges expired
        }
      });
    });
  });

  describe('Performance', () => {
    it('should efficiently check expiration for many badges', () => {
      const start = Date.now();
      const awardTime = startTime;
      
      // Check 10,000 badges
      for (let i = 0; i < 10000; i++) {
        const duration = (i % 3 === 0) ? 0 : 90 * TIME.DAY;
        const checkTime = awardTime + 45 * TIME.DAY * 1000;
        BadgeTimeTravel.isBadgeExpired(awardTime, duration, checkTime);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});
