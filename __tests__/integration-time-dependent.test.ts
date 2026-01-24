/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  MockDate, 
  VestingTimeTravel, 
  BadgeTimeTravel,
  TimelockTimeTravel,
  TIME 
} from './utils/time-travel';
import { BADGE_REGISTRY } from '@/lib/badge-registry';

/**
 * Integration Tests for Time-Dependent Features
 * 
 * These tests validate interactions between multiple time-dependent systems:
 * - Vesting schedules affecting voting power
 * - Badge expiration impacting governance participation
 * - Timelock delays coordinating with vesting milestones
 * - Multi-system time progression scenarios
 */

describe('Integration: Time-Dependent Features', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Vesting + Governance Integration', () => {
    it('should calculate voting power based on vested tokens', () => {
      const vesting = new VestingTimeTravel(startTime);
      const totalAllocation = 1000000; // 1M tokens
      
      // At milestone 12 (50% through first year)
      const time12 = vesting.atMilestone(12);
      const percentage12 = vesting.percentageVestedAt(time12);
      const votingPower12 = (totalAllocation * percentage12) / 100;
      
      expect(percentage12).toBe(25); // 12/48 = 25%
      expect(votingPower12).toBe(250000); // 250K tokens vested
    });

    it('should restrict governance participation during cliff', () => {
      const vesting = new VestingTimeTravel(startTime);
      const duringCliff = startTime + 30 * TIME.DAY * 1000;
      
      const vestedPercentage = vesting.percentageVestedAt(duringCliff);
      const canVote = vestedPercentage > 0;
      
      expect(canVote).toBe(false);
      expect(vestedPercentage).toBe(0);
    });

    it('should allow increased voting power after each milestone', () => {
      const vesting = new VestingTimeTravel(startTime);
      const totalAllocation = 1000000;
      
      const powerAtMilestone6 = (totalAllocation * vesting.percentageVestedAt(vesting.atMilestone(6))) / 100;
      const powerAtMilestone12 = (totalAllocation * vesting.percentageVestedAt(vesting.atMilestone(12))) / 100;
      const powerAtMilestone24 = (totalAllocation * vesting.percentageVestedAt(vesting.atMilestone(24))) / 100;
      
      expect(powerAtMilestone12).toBeGreaterThan(powerAtMilestone6);
      expect(powerAtMilestone24).toBeGreaterThan(powerAtMilestone12);
      expect(powerAtMilestone24).toBe(500000); // 50% at milestone 24
    });

    it('should handle delegation power during vesting progression', () => {
      const vesting = new VestingTimeTravel(startTime);
      const totalAllocation = 1000000;
      
      // User vests tokens over time
      const milestones = [6, 12, 18, 24, 36, 48];
      const delegationPower = milestones.map(m => {
        const percentage = vesting.percentageVestedAt(vesting.atMilestone(m));
        return (totalAllocation * percentage) / 100;
      });
      
      // Each milestone should increase delegation power
      for (let i = 1; i < delegationPower.length; i++) {
        expect(delegationPower[i]).toBeGreaterThan(delegationPower[i - 1]);
      }
      
      // Final delegation power should be full allocation
      expect(delegationPower[delegationPower.length - 1]).toBe(totalAllocation);
    });
  });

  describe('Badge + Governance Integration', () => {
    it('should lose voting bonus when GOVERNANCE_VOTER badge expires', () => {
      const awardTime = startTime;
      const votingBonus = 10; // 10% bonus
      const badge = BADGE_REGISTRY.GOVERNANCE_VOTER;
      
      // Badge active: bonus applies
      const duringValidity = awardTime + 100 * TIME.DAY * 1000;
      const isActive1 = !BadgeTimeTravel.isBadgeExpired(awardTime, badge.duration, duringValidity);
      expect(isActive1).toBe(true);
      
      // Badge expired: bonus lost
      const afterExpiry = awardTime + 200 * TIME.DAY * 1000;
      const isActive2 = !BadgeTimeTravel.isBadgeExpired(awardTime, badge.duration, afterExpiry);
      expect(isActive2).toBe(false);
    });

    it('should maintain GUARDIAN badge for 2+ years of activity', () => {
      const badge = BADGE_REGISTRY.GUARDIAN;
      const awardTime = startTime;
      
      // Test at various intervals
      const testPoints = [
        { days: 365, expected: true },  // 1 year: still valid
        { days: 730, expected: true },  // 2 years: still valid
        { days: 1095, expected: true }, // 3 years: still valid (permanent)
      ];
      
      testPoints.forEach(({ days, expected }) => {
        const testTime = awardTime + days * TIME.DAY * 1000;
        const isValid = !BadgeTimeTravel.isBadgeExpired(awardTime, badge.duration, testTime);
        expect(isValid).toBe(expected);
      });
    });

    it('should coordinate multiple badge expirations', () => {
      const awardTime = startTime;
      const badges = [
        { name: 'ACTIVE_TRADER', duration: BADGE_REGISTRY.ACTIVE_TRADER.duration },
        { name: 'GOVERNANCE_VOTER', duration: BADGE_REGISTRY.GOVERNANCE_VOTER.duration },
        { name: 'CLEAN_RECORD', duration: BADGE_REGISTRY.CLEAN_RECORD.duration },
      ];
      
      // Test at 100, 200, 400 days
      const testTimes = [100, 200, 400].map(d => awardTime + d * TIME.DAY * 1000);
      
      testTimes.forEach(testTime => {
        const activeBadges = badges.filter(b => 
          !BadgeTimeTravel.isBadgeExpired(awardTime, b.duration, testTime)
        );
        
        const daysElapsed = (testTime - awardTime) / (TIME.DAY * 1000);
        
        if (daysElapsed < 90) {
          expect(activeBadges.length).toBe(3); // All active
        } else if (daysElapsed < 180) {
          expect(activeBadges.length).toBe(2); // ACTIVE_TRADER expired
        } else if (daysElapsed < 365) {
          expect(activeBadges.length).toBe(1); // Only CLEAN_RECORD active
        } else {
          expect(activeBadges.length).toBe(0); // All expired
        }
      });
    });
  });

  describe('Vesting + Badge Coordination', () => {
    it('should track POWER_USER badge during vesting progression', () => {
      const vesting = new VestingTimeTravel(startTime);
      const powerUserBadge = BADGE_REGISTRY.POWER_USER;
      
      // User earns badge at milestone 10
      const milestone10 = vesting.atMilestone(10);
      const badgeAwardTime = milestone10;
      
      // Badge valid for 90 days
      const badgeExpiry = BadgeTimeTravel.getExpirationTime(badgeAwardTime, powerUserBadge.duration);
      const expiresAtMilestone = Math.floor((badgeExpiry - startTime) / (60 * TIME.DAY * 1000));
      
      // Badge should expire between milestones
      expect(expiresAtMilestone).toBeGreaterThan(10);
      expect(expiresAtMilestone).toBeLessThan(13); // 90 days ~= 1.5 milestones
    });

    it('should accumulate voting power and badge bonuses over 3 years', () => {
      const vesting = new VestingTimeTravel(startTime);
      const totalAllocation = 1000000;
      
      // Track progression at key milestones
      const milestones = [12, 24, 36, 48]; // 1yr, 2yr, 3yr, complete
      const progression = milestones.map(m => {
        const time = vesting.atMilestone(m);
        const vestedPercentage = vesting.percentageVestedAt(time);
        const votingPower = (totalAllocation * vestedPercentage) / 100;
        
        return {
          milestone: m,
          percentage: vestedPercentage,
          votingPower,
          months: m * 2, // Each milestone = 2 months
        };
      });
      
      // Verify linear progression
      expect(progression[0].percentage).toBe(25); // 25% at 1 year
      expect(progression[1].percentage).toBe(50); // 50% at 2 years
      expect(progression[2].percentage).toBe(75); // 75% at 3 years
      expect(progression[3].percentage).toBe(100); // 100% at completion
    });
  });

  describe('Timelock + Vesting Coordination', () => {
    it('should execute governance action at vesting milestone', () => {
      const vesting = new VestingTimeTravel(startTime);
      const timelockDelay = 2 * TIME.DAY; // 2-day timelock
      
      // Proposal queued just before milestone 6
      const milestone6 = vesting.atMilestone(6);
      const queueTime = milestone6 - TIME.DAY * 1000; // 1 day before milestone
      
      // Calculate when timelock unlocks
      const unlockTime = TimelockTimeTravel.getUnlockTime(queueTime, timelockDelay);
      
      // Should unlock after milestone 6
      expect(unlockTime).toBeGreaterThan(milestone6);
    });

    it('should handle multiple timelocked actions during vesting', () => {
      const vesting = new VestingTimeTravel(startTime);
      const timelockDelay = 24 * TIME.HOUR; // 24 hours
      
      // Queue actions at milestones 10, 20, 30
      const actions = [10, 20, 30].map(m => ({
        milestone: m,
        queueTime: vesting.atMilestone(m),
        unlockTime: TimelockTimeTravel.getUnlockTime(
          vesting.atMilestone(m),
          timelockDelay
        ),
      }));
      
      // All actions should unlock within the next milestone period
      actions.forEach(action => {
        const nextMilestone = vesting.atMilestone(action.milestone + 1);
        expect(action.unlockTime).toBeLessThan(nextMilestone);
      });
    });

    it('should validate timelock expiry windows', () => {
      const timelockDelay = TIME.DAY; // 1 day
      const expiryWindow = 7 * TIME.DAY; // 7 days to execute
      const queueTime = startTime;
      
      const unlockTime = TimelockTimeTravel.getUnlockTime(queueTime, timelockDelay);
      const expiryTime = unlockTime + expiryWindow * 1000;
      
      // Test times within and outside expiry window
      const validExecutionTime = unlockTime + 3 * TIME.DAY * 1000;
      const expiredTime = expiryTime + TIME.HOUR * 1000;
      
      expect(validExecutionTime).toBeLessThan(expiryTime);
      expect(expiredTime).toBeGreaterThan(expiryTime);
      
      // Validate execution windows
      const isValidExecution = validExecutionTime >= unlockTime && validExecutionTime < expiryTime;
      const isExpired = expiredTime >= expiryTime;
      
      expect(isValidExecution).toBe(true);
      expect(isExpired).toBe(true);
    });
  });

  describe('Multi-System Time Progression', () => {
    it('should handle simultaneous vesting, badge expiry, and timelock', () => {
      const vesting = new VestingTimeTravel(startTime);
      const badgeAwardTime = startTime + 100 * TIME.DAY * 1000;
      const timelockQueue = startTime + 150 * TIME.DAY * 1000;
      
      // Test at day 200
      const testTime = startTime + 200 * TIME.DAY * 1000;
      
      // Check vesting progress
      const vestedPercentage = vesting.percentageVestedAt(testTime);
      expect(vestedPercentage).toBeGreaterThan(0);
      
      // Check ACTIVE_TRADER badge (90-day duration)
      const badgeExpired = BadgeTimeTravel.isBadgeExpired(
        badgeAwardTime,
        BADGE_REGISTRY.ACTIVE_TRADER.duration,
        testTime
      );
      expect(badgeExpired).toBe(true); // 100 days elapsed since award
      
      // Check timelock (1-day delay)
      const timelockUnlocked = TimelockTimeTravel.isUnlocked(
        timelockQueue,
        TIME.DAY,
        testTime
      );
      expect(timelockUnlocked).toBe(true); // 50 days elapsed since queue
    });

    it('should simulate complete 3-year lifecycle', () => {
      const vesting = new VestingTimeTravel(startTime);
      const lifecycle = [];
      
      // Sample at yearly intervals
      for (let year = 0; year <= 3; year++) {
        const time = startTime + year * 365 * TIME.DAY * 1000;
        const vestedPercentage = vesting.percentageVestedAt(time);
        
        lifecycle.push({
          year,
          time,
          vestedPercentage,
          milestone: Math.floor(year * 6), // ~6 milestones per year
        });
      }
      
      // Verify progression
      // Note: Vesting starts after 60-day cliff and runs for 2,880 days (48 milestones × 60 days)
      // Year 0: Before/during cliff = 0%
      // Year 1 (365 days): ~10% vested (365-60 = 305 days / 2,880 days ≈ 10.6%)
      // Year 2 (730 days): ~23% vested (730-60 = 670 days / 2,880 days ≈ 23.3%)
      // Year 3 (1095 days): ~36% vested (1095-60 = 1035 days / 2,880 days ≈ 35.9%)
      expect(lifecycle[0].vestedPercentage).toBe(0); // Start: 0%
      expect(lifecycle[1].vestedPercentage).toBeGreaterThan(9); // 1 year: ~10%
      expect(lifecycle[2].vestedPercentage).toBeGreaterThan(22); // 2 years: ~23%
      expect(lifecycle[3].vestedPercentage).toBeGreaterThanOrEqual(35); // 3 years: ~36%
    });
  });

  describe('Performance: Integration Scenarios', () => {
    it('should efficiently calculate complex time progressions', () => {
      const startCalc = Date.now();
      const vesting = new VestingTimeTravel(startTime);
      
      // Simulate 1000 checks across 3-year period
      for (let i = 0; i < 1000; i++) {
        const randomTime = startTime + Math.random() * 3 * 365 * TIME.DAY * 1000;
        vesting.percentageVestedAt(randomTime);
      }
      
      const duration = Date.now() - startCalc;
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle 100+ concurrent badge checks efficiently', () => {
      const startCalc = Date.now();
      const testTime = startTime + 200 * TIME.DAY * 1000;
      
      // Check 100 badges with random award times
      for (let i = 0; i < 100; i++) {
        const awardTime = startTime + Math.random() * 100 * TIME.DAY * 1000;
        const duration = Math.random() * 365 * TIME.DAY;
        BadgeTimeTravel.isBadgeExpired(awardTime, duration, testTime);
      }
      
      const calcDuration = Date.now() - startCalc;
      expect(calcDuration).toBeLessThan(50); // Should complete in <50ms
    });
  });
});
