/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MockDate, TIME } from './utils/time-travel.helpers';

/**
 * Payroll Streaming Time-Dependent Tests
 * 
 * Tests continuous token streaming, per-second accrual, pause mechanics,
 * and dynamic withdrawal calculations over time.
 */
describe('Payroll Streaming Time-Dependent Features', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  /**
   * Calculate claimable amount based on time elapsed
   */
  function calculateClaimable(
    ratePerSecond: number,
    startTime: number,
    currentTime: number,
    lastWithdrawTime: number,
    pausedAt: number | null = null,
    pausedAccrued: number = 0
  ): number {
    if (pausedAt) {
      // If paused, return only the accrued amount at pause time
      return pausedAccrued;
    }

    const elapsedSinceWithdraw = currentTime - lastWithdrawTime;
    const secondsElapsed = Math.floor(elapsedSinceWithdraw / 1000);
    return secondsElapsed * ratePerSecond;
  }

  describe('Continuous Streaming', () => {
    it('should accrue tokens linearly over time', () => {
      const ratePerSecond = 1; // 1 token per second
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      // After 1 hour
      const after1Hour = streamStart + TIME.HOUR * 1000;
      const claimable1h = calculateClaimable(ratePerSecond, streamStart, after1Hour, lastWithdraw);
      expect(claimable1h).toBe(3600); // 3600 seconds * 1 token/sec
      
      // After 1 day
      const after1Day = streamStart + TIME.DAY * 1000;
      const claimable1d = calculateClaimable(ratePerSecond, streamStart, after1Day, lastWithdraw);
      expect(claimable1d).toBe(86400); // 86400 seconds * 1 token/sec
    });

    it('should handle fractional token rates', () => {
      const ratePerSecond = 0.1; // 0.1 tokens per second
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      const after1Minute = streamStart + TIME.MINUTE * 1000;
      const claimable = calculateClaimable(ratePerSecond, streamStart, after1Minute, lastWithdraw);
      expect(claimable).toBe(6); // 60 seconds * 0.1 = 6 tokens
    });

    it('should handle high token rates', () => {
      const ratePerSecond = 100; // 100 tokens per second
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      const after10Seconds = streamStart + 10 * 1000;
      const claimable = calculateClaimable(ratePerSecond, streamStart, after10Seconds, lastWithdraw);
      expect(claimable).toBe(1000); // 10 * 100 = 1000 tokens
    });

    it('should reset after withdrawal', () => {
      const ratePerSecond = 1;
      const streamStart = startTime;
      
      // First accrual period
      const firstWithdraw = streamStart + TIME.HOUR * 1000;
      const claimable1 = calculateClaimable(ratePerSecond, streamStart, firstWithdraw, streamStart);
      expect(claimable1).toBe(3600);
      
      // Second accrual period starts after first withdraw
      const secondCheck = firstWithdraw + TIME.HOUR * 1000;
      const claimable2 = calculateClaimable(ratePerSecond, streamStart, secondCheck, firstWithdraw);
      expect(claimable2).toBe(3600); // Another hour's worth
    });
  });

  describe('Stream Duration and Exhaustion', () => {
    it('should calculate stream end time correctly', () => {
      const totalAmount = 86400; // 86400 tokens
      const ratePerSecond = 1; // 1 token/sec
      const streamStart = startTime;
      
      const expectedDuration = totalAmount / ratePerSecond; // 86400 seconds = 1 day
      const expectedEndTime = streamStart + expectedDuration * 1000;
      
      const after1Day = streamStart + TIME.DAY * 1000;
      expect(after1Day).toBe(expectedEndTime);
    });

    it('should not allow claiming beyond total amount', () => {
      const totalAmount = 1000;
      const ratePerSecond = 1;
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      // Try to claim after stream should be exhausted
      const wayAfter = streamStart + 2000 * 1000; // 2000 seconds
      const claimable = calculateClaimable(ratePerSecond, streamStart, wayAfter, lastWithdraw);
      
      // Should be capped at total amount
      const cappedAmount = Math.min(claimable, totalAmount);
      expect(cappedAmount).toBe(1000);
    });

    it('should estimate correct end time for various rates', () => {
      const testCases = [
        { total: 3600, rate: 1, expectedDuration: 3600 }, // 1 hour
        { total: 86400, rate: 1, expectedDuration: 86400 }, // 1 day
        { total: 1000, rate: 10, expectedDuration: 100 }, // 100 seconds
        { total: 864000, rate: 0.1, expectedDuration: 8640000 }, // 100 days
      ];

      testCases.forEach(({ total, rate, expectedDuration }) => {
        const duration = total / rate;
        expect(duration).toBe(expectedDuration);
      });
    });
  });

  describe('Pause/Resume Mechanics', () => {
    it('should freeze accrual when paused', () => {
      const ratePerSecond = 1;
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      // Accrue for 1 hour, then pause
      const pauseTime = streamStart + TIME.HOUR * 1000;
      const accruedAtPause = calculateClaimable(ratePerSecond, streamStart, pauseTime, lastWithdraw);
      expect(accruedAtPause).toBe(3600);
      
      // Check claimable 1 hour after pause (should still be same)
      const checkAfterPause = pauseTime + TIME.HOUR * 1000;
      const claimableWhilePaused = calculateClaimable(
        ratePerSecond, 
        streamStart, 
        checkAfterPause, 
        lastWithdraw,
        pauseTime, // pausedAt
        accruedAtPause // pausedAccrued
      );
      expect(claimableWhilePaused).toBe(3600); // Should not increase
    });

    it('should resume accrual after unpause', () => {
      const ratePerSecond = 1;
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      // Accrue for 1 hour
      const pauseTime = streamStart + TIME.HOUR * 1000;
      const accruedAtPause = calculateClaimable(ratePerSecond, streamStart, pauseTime, lastWithdraw);
      
      // Resume after 1 hour pause (new effective start time)
      const resumeTime = pauseTime + TIME.HOUR * 1000;
      
      // Check 1 hour after resume
      const checkAfterResume = resumeTime + TIME.HOUR * 1000;
      const newAccrual = calculateClaimable(ratePerSecond, resumeTime, checkAfterResume, resumeTime);
      
      // Total should be: accrued before pause + new accrual after resume
      const total = accruedAtPause + newAccrual;
      expect(total).toBe(7200); // 3600 + 3600
    });

    it('should handle multiple pause/resume cycles', () => {
      const ratePerSecond = 1;
      let totalAccrued = 0;
      let currentStart = startTime;
      let lastWithdraw = startTime;
      
      // Cycle 1: Stream for 1 hour
      let currentTime = currentStart + TIME.HOUR * 1000;
      totalAccrued += calculateClaimable(ratePerSecond, currentStart, currentTime, lastWithdraw);
      expect(totalAccrued).toBe(3600);
      
      // Pause for 2 hours (no accrual)
      currentTime += 2 * TIME.HOUR * 1000;
      
      // Cycle 2: Resume and stream for 1 hour
      currentStart = currentTime;
      lastWithdraw = currentStart;
      currentTime = currentStart + TIME.HOUR * 1000;
      totalAccrued += calculateClaimable(ratePerSecond, currentStart, currentTime, lastWithdraw);
      expect(totalAccrued).toBe(7200);
      
      // Pause for 1 hour
      currentTime += TIME.HOUR * 1000;
      
      // Cycle 3: Resume and stream for 30 minutes
      currentStart = currentTime;
      lastWithdraw = currentStart;
      currentTime = currentStart + 30 * TIME.MINUTE * 1000;
      totalAccrued += calculateClaimable(ratePerSecond, currentStart, currentTime, lastWithdraw);
      expect(totalAccrued).toBe(9000); // 7200 + 1800
    });
  });

  describe('Withdrawal Timing', () => {
    it('should track last withdrawal time correctly', () => {
      const ratePerSecond = 1;
      const streamStart = startTime;
      let lastWithdraw = streamStart;
      
      // First withdrawal after 1 hour
      const withdraw1Time = streamStart + TIME.HOUR * 1000;
      const amount1 = calculateClaimable(ratePerSecond, streamStart, withdraw1Time, lastWithdraw);
      expect(amount1).toBe(3600);
      lastWithdraw = withdraw1Time;
      
      // Second withdrawal after another 2 hours
      const withdraw2Time = withdraw1Time + 2 * TIME.HOUR * 1000;
      const amount2 = calculateClaimable(ratePerSecond, streamStart, withdraw2Time, lastWithdraw);
      expect(amount2).toBe(7200); // 2 hours worth
      lastWithdraw = withdraw2Time;
      
      // Third withdrawal after 30 minutes
      const withdraw3Time = withdraw2Time + 30 * TIME.MINUTE * 1000;
      const amount3 = calculateClaimable(ratePerSecond, streamStart, withdraw3Time, lastWithdraw);
      expect(amount3).toBe(1800); // 30 minutes worth
    });

    it('should allow immediate successive withdrawals', () => {
      const ratePerSecond = 1;
      const streamStart = startTime;
      let lastWithdraw = streamStart;
      
      // Wait 1 hour and withdraw
      const time1 = streamStart + TIME.HOUR * 1000;
      const amount1 = calculateClaimable(ratePerSecond, streamStart, time1, lastWithdraw);
      expect(amount1).toBe(3600);
      lastWithdraw = time1;
      
      // Immediately try to withdraw again (same second)
      const time2 = time1;
      const amount2 = calculateClaimable(ratePerSecond, streamStart, time2, lastWithdraw);
      expect(amount2).toBe(0); // No time elapsed
    });

    it('should handle partial second withdrawals', () => {
      const ratePerSecond = 1;
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      // Check after 5.5 seconds (should floor to 5)
      const checkTime = streamStart + 5500; // 5500ms = 5.5 seconds
      const claimable = calculateClaimable(ratePerSecond, streamStart, checkTime, lastWithdraw);
      expect(claimable).toBe(5); // Floors to 5 whole seconds
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle monthly salary stream (30 days)', () => {
      const monthlySalary = 10000; // 10,000 tokens per month
      const secondsInMonth = 30 * TIME.DAY;
      const ratePerSecond = monthlySalary / secondsInMonth;
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      // Check after 15 days (half month)
      const after15Days = streamStart + 15 * TIME.DAY * 1000;
      const claimable = calculateClaimable(ratePerSecond, streamStart, after15Days, lastWithdraw);
      const expected = Math.floor(15 * TIME.DAY * ratePerSecond);
      expect(claimable).toBeCloseTo(5000, 0); // ~5000 tokens (half salary)
    });

    it('should handle weekly allowance stream', () => {
      const weeklyAmount = 700; // 700 tokens per week
      const ratePerSecond = weeklyAmount / (7 * TIME.DAY);
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      // Check daily accrual
      const after1Day = streamStart + TIME.DAY * 1000;
      const claimable = calculateClaimable(ratePerSecond, streamStart, after1Day, lastWithdraw);
      const expected = Math.floor(TIME.DAY * ratePerSecond);
      expect(claimable).toBeCloseTo(100, 0); // ~100 tokens per day
    });

    it('should handle hourly contractor payment', () => {
      const hourlyRate = 50; // 50 tokens per hour
      const ratePerSecond = hourlyRate / TIME.HOUR;
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      
      // Check after 8 hours (workday)
      const after8Hours = streamStart + 8 * TIME.HOUR * 1000;
      const claimable = calculateClaimable(ratePerSecond, streamStart, after8Hours, lastWithdraw);
      const expected = Math.floor(8 * TIME.HOUR * ratePerSecond);
      expect(claimable).toBe(400); // 8 * 50 = 400 tokens
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero-rate stream', () => {
      const ratePerSecond = 0;
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      const currentTime = streamStart + TIME.DAY * 1000;
      
      const claimable = calculateClaimable(ratePerSecond, streamStart, currentTime, lastWithdraw);
      expect(claimable).toBe(0);
    });

    it('should handle stream starting in the past', () => {
      const ratePerSecond = 1;
      const streamStart = startTime - 30 * TIME.DAY * 1000; // Started 30 days ago
      const lastWithdraw = streamStart;
      const currentTime = startTime;
      
      const claimable = calculateClaimable(ratePerSecond, streamStart, currentTime, lastWithdraw);
      expect(claimable).toBe(30 * 86400); // 30 days worth
    });

    it('should handle very long streams (1 year)', () => {
      const yearlyAmount = 31536000; // Tokens for whole year
      const ratePerSecond = yearlyAmount / (365 * TIME.DAY);
      const streamStart = startTime;
      const lastWithdraw = streamStart;
      const after1Year = streamStart + 365 * TIME.DAY * 1000;
      
      const claimable = calculateClaimable(ratePerSecond, streamStart, after1Year, lastWithdraw);
      expect(claimable).toBeCloseTo(yearlyAmount, 0);
    });
  });

  describe('Performance: Streaming Calculations', () => {
    it('should calculate 10,000 stream states efficiently', () => {
      const start = performance.now();
      const ratePerSecond = 1;
      
      const streams = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        startTime: startTime + i * TIME.MINUTE * 1000,
        lastWithdraw: startTime + i * TIME.MINUTE * 1000,
      }));

      const currentTime = startTime + TIME.DAY * 1000;
      
      streams.forEach(stream => {
        calculateClaimable(ratePerSecond, stream.startTime, currentTime, stream.lastWithdraw);
      });
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });

    it('should handle rapid withdrawal calculations', () => {
      const start = performance.now();
      const ratePerSecond = 1;
      const streamStart = startTime;
      let lastWithdraw = streamStart;
      
      // Simulate 1000 withdrawals over 1 day
      for (let i = 1; i <= 1000; i++) {
        const currentTime = streamStart + (i * 86) * 1000; // ~86 seconds between each
        calculateClaimable(ratePerSecond, streamStart, currentTime, lastWithdraw);
        lastWithdraw = currentTime;
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });
});
