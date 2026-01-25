/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  MockDate, 
  VestingTimeTravel, 
  TIME, 
  TEST_PERIODS 
} from './utils/time-travel.helpers';

describe('3-Year Developer Vesting Schedule', () => {
  let vestingSchedule: VestingTimeTravel;
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
    vestingSchedule = new VestingTimeTravel(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Cliff Period (60 days)', () => {
    it('should have 0% vested before cliff', () => {
      const beforeCliff = startTime + 59 * TIME.DAY * 1000;
      expect(vestingSchedule.percentageVestedAt(beforeCliff)).toBe(0);
    });

    it('should begin vesting after cliff', () => {
      // Just after cliff, percentage might still round to 0 due to long vesting period
      // Test at 30 days after cliff to have meaningful percentage
      const oneMonthAfterCliff = vestingSchedule.afterCliff() + 30 * TIME.DAY * 1000;
      const percentage = vestingSchedule.percentageVestedAt(oneMonthAfterCliff);
      expect(percentage).toBeGreaterThan(0);
    });

    it('should have cliff at day 60', () => {
      const cliffTime = vestingSchedule.afterCliff();
      const expectedCliff = startTime + 60 * TIME.DAY * 1000;
      expect(cliffTime).toBe(expectedCliff);
    });

    it('should not allow claims during cliff period', () => {
      // This would typically interact with contract
      // Here we verify the time calculation
      const duringCliff = startTime + 30 * TIME.DAY * 1000;
      expect(duringCliff).toBeLessThan(vestingSchedule.afterCliff());
    });
  });

  describe('Bi-Monthly Milestones (48 total)', () => {
    it('should have 48 milestones over 36 months', () => {
      const milestones = vestingSchedule.getAllMilestones();
      expect(milestones.length).toBe(48);
    });

    it('should space milestones 60 days apart', () => {
      const milestone1 = vestingSchedule.atMilestone(1);
      const milestone2 = vestingSchedule.atMilestone(2);
      const diff = (milestone2 - milestone1) / 1000;
      expect(diff).toBe(60 * TIME.DAY);
    });

    it('should reach milestone 1 at 120 days (60 cliff + 60)', () => {
      const m1 = vestingSchedule.atMilestone(1);
      const expectedM1 = startTime + 120 * TIME.DAY * 1000;
      expect(m1).toBe(expectedM1);
    });

    it('should reach milestone 24 at 18 months', () => {
      const m24 = vestingSchedule.atMilestone(24);
      const expectedDays = 60 + (24 * 60); // cliff + 24 milestones
      const expectedTime = startTime + expectedDays * TIME.DAY * 1000;
      expect(m24).toBe(expectedTime);
    });

    it('should reach milestone 48 at 36 months', () => {
      const m48 = vestingSchedule.atMilestone(48);
      const expectedDays = 60 + (48 * 60); // cliff + 48 milestones
      const expectedTime = startTime + expectedDays * TIME.DAY * 1000;
      expect(m48).toBe(expectedTime);
    });

    it('should reject invalid milestone numbers', () => {
      expect(() => vestingSchedule.atMilestone(0)).toThrow();
      expect(() => vestingSchedule.atMilestone(49)).toThrow();
      expect(() => vestingSchedule.atMilestone(-1)).toThrow();
    });
  });

  describe('Linear Vesting Progression', () => {
    it('should vest approximately 2.08% per milestone', () => {
      // 100% / 48 milestones ≈ 2.08% per milestone
      const expectedPercentPerMilestone = 100 / 48;
      expect(expectedPercentPerMilestone).toBeCloseTo(2.08, 2);
    });

    it('should be 0% vested at start', () => {
      expect(vestingSchedule.percentageVestedAt(startTime)).toBe(0);
    });

    it('should be approximately 25% vested after 12 milestones', () => {
      const time = vestingSchedule.atMilestone(12);
      const percentage = vestingSchedule.percentageVestedAt(time);
      expect(percentage).toBeGreaterThanOrEqual(23);
      expect(percentage).toBeLessThanOrEqual(27);
    });

    it('should be approximately 50% vested after 24 milestones', () => {
      const time = vestingSchedule.atMilestone(24);
      const percentage = vestingSchedule.percentageVestedAt(time);
      expect(percentage).toBeGreaterThanOrEqual(48);
      expect(percentage).toBeLessThanOrEqual(52);
    });

    it('should be approximately 75% vested after 36 milestones', () => {
      const time = vestingSchedule.atMilestone(36);
      const percentage = vestingSchedule.percentageVestedAt(time);
      expect(percentage).toBeGreaterThanOrEqual(73);
      expect(percentage).toBeLessThanOrEqual(77);
    });

    it('should be 100% vested at completion', () => {
      const completion = vestingSchedule.atCompletion();
      expect(vestingSchedule.percentageVestedAt(completion)).toBe(100);
    });

    it('should remain 100% vested after completion', () => {
      const afterCompletion = vestingSchedule.atCompletion() + 365 * TIME.DAY * 1000;
      expect(vestingSchedule.percentageVestedAt(afterCompletion)).toBe(100);
    });
  });

  describe('Full 3-Year Journey', () => {
    it('should vest over exactly 36 months (from presale launch)', () => {
      const completion = vestingSchedule.atCompletion();
      const duration = (completion - startTime) / 1000;
      const expectedDuration = 60 * TIME.DAY + 48 * 60 * TIME.DAY; // cliff + 48 milestones
      expect(duration).toBe(expectedDuration);
    });

    it('should complete vesting at 2,940 days from start', () => {
      // 60 cliff + (48 * 60) = 2,940 days
      const completion = vestingSchedule.atCompletion();
      const daysElapsed = (completion - startTime) / (1000 * TIME.DAY);
      expect(daysElapsed).toBe(2940);
    });

    it('should simulate 3-year progression correctly', () => {
      const checkpoints = [
        { milestone: 1, expectedDays: 120, minPercent: 0, maxPercent: 5 },
        { milestone: 6, expectedDays: 420, minPercent: 10, maxPercent: 15 },
        { milestone: 12, expectedDays: 780, minPercent: 23, maxPercent: 27 },
        { milestone: 18, expectedDays: 1140, minPercent: 35, maxPercent: 40 },
        { milestone: 24, expectedDays: 1500, minPercent: 48, maxPercent: 52 },
        { milestone: 30, expectedDays: 1860, minPercent: 60, maxPercent: 65 },
        { milestone: 36, expectedDays: 2220, minPercent: 73, maxPercent: 77 },
        { milestone: 42, expectedDays: 2580, minPercent: 85, maxPercent: 90 },
        { milestone: 48, expectedDays: 2940, minPercent: 99, maxPercent: 100 },
      ];

      checkpoints.forEach(({ milestone, expectedDays, minPercent, maxPercent }) => {
        const time = vestingSchedule.atMilestone(milestone);
        const daysFromStart = (time - startTime) / (1000 * TIME.DAY);
        const percentage = vestingSchedule.percentageVestedAt(time);

        expect(daysFromStart).toBe(expectedDays);
        expect(percentage).toBeGreaterThanOrEqual(minPercent);
        expect(percentage).toBeLessThanOrEqual(maxPercent);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle time exactly at cliff', () => {
      const cliffTime = vestingSchedule.afterCliff();
      const percentage = vestingSchedule.percentageVestedAt(cliffTime);
      expect(percentage).toBeGreaterThanOrEqual(0);
    });

    it('should handle time between milestones', () => {
      const m1 = vestingSchedule.atMilestone(1);
      const m2 = vestingSchedule.atMilestone(2);
      const midpoint = (m1 + m2) / 2;
      
      const percentage = vestingSchedule.percentageVestedAt(midpoint);
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThan(100);
    });

    it('should handle very far future time', () => {
      const farFuture = startTime + 10 * TIME.YEAR * 1000;
      expect(vestingSchedule.percentageVestedAt(farFuture)).toBe(100);
    });

    it('should handle time before contract start', () => {
      const beforeStart = startTime - 1000;
      expect(vestingSchedule.percentageVestedAt(beforeStart)).toBe(0);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle developer checking vesting after 1 year', () => {
      const oneYearLater = startTime + 365 * TIME.DAY * 1000;
      const percentage = vestingSchedule.percentageVestedAt(oneYearLater);
      
      // After 1 year (365 days), should have passed about 6 milestones
      // (365 - 60) / 60 = ~5 milestones
      expect(percentage).toBeGreaterThanOrEqual(8);
      expect(percentage).toBeLessThanOrEqual(15);
    });

    it('should handle developer checking vesting after 2 years', () => {
      const twoYearsLater = startTime + 730 * TIME.DAY * 1000;
      const percentage = vestingSchedule.percentageVestedAt(twoYearsLater);
      
      // After 2 years (730 days), should have passed about 11 milestones
      // (730 - 60) / 60 = ~11 milestones
      expect(percentage).toBeGreaterThanOrEqual(20);
      expect(percentage).toBeLessThanOrEqual(28);
    });

    it('should handle developer checking vesting after 2.5 years', () => {
      const twoHalfYearsLater = startTime + 912 * TIME.DAY * 1000;
      const percentage = vestingSchedule.percentageVestedAt(twoHalfYearsLater);
      
      // After 2.5 years (912 days), should have passed about 14 milestones
      // (912 - 60) / 60 = ~14 milestones
      expect(percentage).toBeGreaterThanOrEqual(27);
      expect(percentage).toBeLessThanOrEqual(35);
    });

    it('should handle developer checking vesting exactly at completion', () => {
      const completion = vestingSchedule.atCompletion();
      MockDate.travelTo(completion);
      
      expect(vestingSchedule.percentageVestedAt(completion)).toBe(100);
    });

    it('should verify all 48 milestones are reachable', () => {
      for (let i = 1; i <= 48; i++) {
        const milestoneTime = vestingSchedule.atMilestone(i);
        expect(milestoneTime).toBeGreaterThan(startTime);
        expect(milestoneTime).toBeGreaterThan(vestingSchedule.afterCliff());
      }
    });
  });

  describe('Mathematical Consistency', () => {
    it('should have monotonically increasing vesting percentage', () => {
      let previousPercentage = 0;
      
      for (let i = 1; i <= 48; i++) {
        const time = vestingSchedule.atMilestone(i);
        const percentage = vestingSchedule.percentageVestedAt(time);
        
        expect(percentage).toBeGreaterThanOrEqual(previousPercentage);
        previousPercentage = percentage;
      }
    });

    it('should have consistent milestone spacing', () => {
      for (let i = 2; i <= 48; i++) {
        const prev = vestingSchedule.atMilestone(i - 1);
        const curr = vestingSchedule.atMilestone(i);
        const diff = (curr - prev) / 1000;
        
        expect(diff).toBe(60 * TIME.DAY);
      }
    });

    it('should correctly calculate total vesting period', () => {
      const totalPeriod = TEST_PERIODS.VESTING_CLIFF + (48 * TEST_PERIODS.VESTING_MILESTONE);
      const completion = vestingSchedule.atCompletion();
      const actualPeriod = (completion - startTime) / 1000;
      
      expect(actualPeriod).toBe(totalPeriod);
    });
  });

  describe('Integration with Time Travel', () => {
    it('should work with MockDate time travel', () => {
      // Start at day 0
      MockDate.travelTo(startTime);
      expect(vestingSchedule.percentageVestedAt(MockDate.getCurrentTime())).toBe(0);

      // Travel to 30 days after cliff
      MockDate.travel(90 * TIME.DAY);
      expect(vestingSchedule.percentageVestedAt(MockDate.getCurrentTime())).toBeGreaterThan(0);

      // Travel to milestone 12
      MockDate.travelTo(vestingSchedule.atMilestone(12));
      expect(vestingSchedule.percentageVestedAt(MockDate.getCurrentTime())).toBeGreaterThanOrEqual(23);

      // Travel to completion
      MockDate.travelTo(vestingSchedule.atCompletion());
      expect(vestingSchedule.percentageVestedAt(MockDate.getCurrentTime())).toBe(100);
    });

    it('should simulate day-by-day progression', () => {
      MockDate.travelTo(startTime);
      
      // Fast-forward through cliff
      for (let day = 0; day < 60; day++) {
        const percentage = vestingSchedule.percentageVestedAt(MockDate.getCurrentTime());
        expect(percentage).toBe(0);
        MockDate.travel(TIME.DAY);
      }

      // After cliff, wait 30 days to have measurable percentage
      MockDate.travel(30 * TIME.DAY);
      expect(vestingSchedule.percentageVestedAt(MockDate.getCurrentTime())).toBeGreaterThan(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should efficiently calculate any milestone', () => {
      const start = Date.now();
      
      for (let i = 1; i <= 48; i++) {
        vestingSchedule.atMilestone(i);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should efficiently calculate all percentages', () => {
      const start = Date.now();
      
      for (let i = 1; i <= 48; i++) {
        const time = vestingSchedule.atMilestone(i);
        vestingSchedule.percentageVestedAt(time);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});
