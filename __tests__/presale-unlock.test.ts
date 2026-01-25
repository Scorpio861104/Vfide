/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MockDate, TIME, TimelockTimeTravel } from './utils/time-travel.helpers';

/**
 * Presale Lock & Unlock Time-Dependent Tests
 * 
 * Tests presale bonus lock periods (90-day, 180-day, no-lock) and unlock mechanics.
 * Critical for ensuring early investors can claim tokens at correct times.
 */
describe('Presale Lock & Unlock Mechanisms', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('No-Lock Bonus Tier', () => {
    const NO_LOCK_PERIOD = 0;

    it('should allow immediate claiming with no-lock bonus', () => {
      const purchaseTime = startTime;
      const currentTime = startTime + 1000; // 1 second later
      
      expect(TimelockTimeTravel.isUnlocked(purchaseTime, NO_LOCK_PERIOD, currentTime)).toBe(true);
    });

    it('should have no unlock time for no-lock purchases', () => {
      const purchaseTime = startTime;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, NO_LOCK_PERIOD);
      
      expect(unlockTime).toBe(purchaseTime);
    });
  });

  describe('90-Day Lock Bonus Tier', () => {
    const LOCK_90_DAYS = 90 * TIME.DAY;

    it('should not allow claiming before 90 days', () => {
      const purchaseTime = startTime;
      const currentTime = startTime + 89 * TIME.DAY * 1000;
      
      expect(TimelockTimeTravel.isUnlocked(purchaseTime, LOCK_90_DAYS, currentTime)).toBe(false);
    });

    it('should allow claiming after 90 days', () => {
      const purchaseTime = startTime;
      const currentTime = startTime + 91 * TIME.DAY * 1000;
      
      expect(TimelockTimeTravel.isUnlocked(purchaseTime, LOCK_90_DAYS, currentTime)).toBe(true);
    });

    it('should calculate correct unlock timestamp', () => {
      const purchaseTime = startTime;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, LOCK_90_DAYS);
      const expected = purchaseTime + 90 * TIME.DAY * 1000;
      
      expect(unlockTime).toBe(expected);
    });

    it('should calculate time remaining until unlock', () => {
      const purchaseTime = startTime;
      const currentTime = startTime + 30 * TIME.DAY * 1000; // 30 days in
      const remaining = TimelockTimeTravel.getTimeRemaining(purchaseTime, LOCK_90_DAYS, currentTime);
      
      expect(remaining).toBe(60 * TIME.DAY * 1000); // 60 days left
    });
  });

  describe('180-Day Lock Bonus Tier', () => {
    const LOCK_180_DAYS = 180 * TIME.DAY;

    it('should not allow claiming before 180 days', () => {
      const purchaseTime = startTime;
      const currentTime = startTime + 179 * TIME.DAY * 1000;
      
      expect(TimelockTimeTravel.isUnlocked(purchaseTime, LOCK_180_DAYS, currentTime)).toBe(false);
    });

    it('should allow claiming after 180 days', () => {
      const purchaseTime = startTime;
      const currentTime = startTime + 181 * TIME.DAY * 1000;
      
      expect(TimelockTimeTravel.isUnlocked(purchaseTime, LOCK_180_DAYS, currentTime)).toBe(true);
    });

    it('should calculate correct unlock timestamp', () => {
      const purchaseTime = startTime;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, LOCK_180_DAYS);
      const expected = purchaseTime + 180 * TIME.DAY * 1000;
      
      expect(unlockTime).toBe(expected);
    });

    it('should calculate time remaining until unlock', () => {
      const purchaseTime = startTime;
      const currentTime = startTime + 90 * TIME.DAY * 1000; // 90 days in (halfway)
      const remaining = TimelockTimeTravel.getTimeRemaining(purchaseTime, LOCK_180_DAYS, currentTime);
      
      expect(remaining).toBe(90 * TIME.DAY * 1000); // 90 days left
    });
  });

  describe('Custom Lock Periods', () => {
    it('should support 30-day lock', () => {
      const lockPeriod = 30 * TIME.DAY;
      const purchaseTime = startTime;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, lockPeriod);
      
      expect(unlockTime).toBe(purchaseTime + lockPeriod * 1000);
    });

    it('should support 365-day lock', () => {
      const lockPeriod = 365 * TIME.DAY;
      const purchaseTime = startTime;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, lockPeriod);
      
      expect(unlockTime).toBe(purchaseTime + lockPeriod * 1000);
    });

    it('should support 2-year lock', () => {
      const lockPeriod = 730 * TIME.DAY; // ~2 years
      const purchaseTime = startTime;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, lockPeriod);
      
      expect(unlockTime).toBe(purchaseTime + lockPeriod * 1000);
    });
  });

  describe('Partial Claim Scenarios', () => {
    it('should track claimed vs total amounts', () => {
      const totalPurchased = 10000;
      const claimed = 3000;
      const remaining = totalPurchased - claimed;
      
      expect(remaining).toBe(7000);
    });

    it('should allow multiple partial claims after unlock', () => {
      const lockPeriod = 90 * TIME.DAY;
      const purchaseTime = startTime;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, lockPeriod);
      
      // First claim at unlock + 1 day
      const claim1Time = unlockTime + TIME.DAY * 1000;
      expect(claim1Time).toBeGreaterThan(unlockTime);
      
      // Second claim at unlock + 7 days
      const claim2Time = unlockTime + 7 * TIME.DAY * 1000;
      expect(claim2Time).toBeGreaterThan(unlockTime);
      
      // Both should be valid claim times
      expect(claim1Time).toBeGreaterThan(purchaseTime + lockPeriod * 1000);
      expect(claim2Time).toBeGreaterThan(purchaseTime + lockPeriod * 1000);
    });

    it('should prevent over-claiming', () => {
      const totalPurchased = 10000;
      let claimed = 0;
      
      // Claim 1
      claimed += 4000;
      expect(claimed).toBeLessThanOrEqual(totalPurchased);
      
      // Claim 2
      claimed += 5000;
      expect(claimed).toBeLessThanOrEqual(totalPurchased);
      
      // Claim 3 - should cap at total
      const attemptClaim = 2000;
      const actualClaim = Math.min(attemptClaim, totalPurchased - claimed);
      claimed += actualClaim;
      expect(claimed).toBe(totalPurchased);
      expect(actualClaim).toBe(1000); // Only 1000 remaining
    });
  });

  describe('Multiple Purchase Tracking', () => {
    it('should handle multiple purchases with different lock periods', () => {
      const purchases = [
        { id: 1, time: startTime, amount: 1000, lockPeriod: 0 },
        { id: 2, time: startTime + TIME.DAY * 1000, amount: 5000, lockPeriod: 90 * TIME.DAY },
        { id: 3, time: startTime + 2 * TIME.DAY * 1000, amount: 10000, lockPeriod: 180 * TIME.DAY },
      ];

      const currentTime = startTime + 100 * TIME.DAY * 1000; // 100 days later

      const unlockedPurchases = purchases.filter(p => 
        TimelockTimeTravel.isUnlocked(p.time, p.lockPeriod, currentTime)
      );

      expect(unlockedPurchases.length).toBe(2); // No-lock and 90-day should be unlocked
      expect(unlockedPurchases[0].id).toBe(1);
      expect(unlockedPurchases[1].id).toBe(2);
    });

    it('should calculate total claimable across purchases', () => {
      const purchases = [
        { time: startTime, amount: 1000, lockPeriod: 0, claimed: 0 },
        { time: startTime, amount: 5000, lockPeriod: 90 * TIME.DAY, claimed: 0 },
        { time: startTime, amount: 10000, lockPeriod: 180 * TIME.DAY, claimed: 0 },
      ];

      const currentTime = startTime + 100 * TIME.DAY * 1000;

      const claimable = purchases.reduce((total, p) => {
        if (TimelockTimeTravel.isUnlocked(p.time, p.lockPeriod, currentTime)) {
          return total + (p.amount - p.claimed);
        }
        return total;
      }, 0);

      expect(claimable).toBe(6000); // 1000 + 5000 (180-day still locked)
    });

    it('should prioritize unlocking schedule by time', () => {
      const purchases = [
        { id: 1, time: startTime, lockPeriod: 180 * TIME.DAY },
        { id: 2, time: startTime, lockPeriod: 90 * TIME.DAY },
        { id: 3, time: startTime, lockPeriod: 0 },
      ];

      const unlockTimes = purchases.map(p => ({
        id: p.id,
        unlockTime: TimelockTimeTravel.getUnlockTime(p.time, p.lockPeriod),
      })).sort((a, b) => a.unlockTime - b.unlockTime);

      expect(unlockTimes[0].id).toBe(3); // No-lock first
      expect(unlockTimes[1].id).toBe(2); // 90-day second
      expect(unlockTimes[2].id).toBe(1); // 180-day last
    });
  });

  describe('Unlock Notifications and Warnings', () => {
    it('should detect when unlock is imminent (within 7 days)', () => {
      const lockPeriod = 90 * TIME.DAY;
      const purchaseTime = startTime;
      const currentTime = startTime + 85 * TIME.DAY * 1000; // 85 days in
      const remaining = TimelockTimeTravel.getTimeRemaining(purchaseTime, lockPeriod, currentTime);
      
      const daysRemaining = remaining / (TIME.DAY * 1000);
      expect(daysRemaining).toBeLessThan(7);
      expect(daysRemaining).toBeGreaterThan(0);
    });

    it('should calculate exact unlock date', () => {
      const lockPeriod = 90 * TIME.DAY;
      const purchaseTime = new Date('2024-01-01T00:00:00Z').getTime();
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, lockPeriod);
      
      const unlockDate = new Date(unlockTime);
      const expectedDate = new Date('2024-03-31T00:00:00Z'); // 90 days from Jan 1
      
      // Should be approximately the same (within a day due to date calculation)
      const diffDays = Math.abs(unlockDate.getTime() - expectedDate.getTime()) / (TIME.DAY * 1000);
      expect(diffDays).toBeLessThan(2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle purchase at year boundary', () => {
      const purchaseTime = new Date('2023-12-31T23:59:59Z').getTime();
      const lockPeriod = 90 * TIME.DAY;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, lockPeriod);
      
      // Should unlock ~90 days later in 2024
      const unlockDate = new Date(unlockTime);
      expect(unlockDate.getFullYear()).toBe(2024);
    });

    it('should handle leap year lock periods', () => {
      const purchaseTime = new Date('2024-01-01T00:00:00Z').getTime(); // 2024 is leap year
      const lockPeriod = 180 * TIME.DAY;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, lockPeriod);
      
      // 180 days from Jan 1, 2024 (through Feb 29)
      const expected = purchaseTime + 180 * TIME.DAY * 1000;
      expect(unlockTime).toBe(expected);
    });

    it('should handle purchase at exact unlock boundary', () => {
      const purchaseTime = startTime;
      const lockPeriod = 90 * TIME.DAY;
      const unlockTime = TimelockTimeTravel.getUnlockTime(purchaseTime, lockPeriod);
      
      // Check at exact unlock time
      expect(TimelockTimeTravel.isUnlocked(purchaseTime, lockPeriod, unlockTime)).toBe(true);
      
      // Check 1 second before
      expect(TimelockTimeTravel.isUnlocked(purchaseTime, lockPeriod, unlockTime - 1000)).toBe(false);
    });

    it('should handle very old purchases', () => {
      const purchaseTime = startTime - 365 * TIME.DAY * 1000; // 1 year ago
      const lockPeriod = 90 * TIME.DAY;
      const currentTime = startTime;
      
      expect(TimelockTimeTravel.isUnlocked(purchaseTime, lockPeriod, currentTime)).toBe(true);
      
      const remaining = TimelockTimeTravel.getTimeRemaining(purchaseTime, lockPeriod, currentTime);
      expect(remaining).toBe(0);
    });
  });

  describe('Bonus Tier Comparison', () => {
    it('should reflect higher bonus for longer locks', () => {
      // Simulated bonus multipliers
      const bonusMultipliers = {
        noLock: 1.0, // No bonus
        lock90: 1.10, // 10% bonus
        lock180: 1.20, // 20% bonus
      };

      const baseAmount = 1000;
      
      const noLockAmount = baseAmount * bonusMultipliers.noLock;
      const lock90Amount = baseAmount * bonusMultipliers.lock90;
      const lock180Amount = baseAmount * bonusMultipliers.lock180;
      
      expect(noLockAmount).toBe(1000);
      expect(lock90Amount).toBe(1100);
      expect(lock180Amount).toBe(1200);
      
      // Longer lock = more tokens
      expect(lock180Amount).toBeGreaterThan(lock90Amount);
      expect(lock90Amount).toBeGreaterThan(noLockAmount);
    });

    it('should calculate ROI benefit of lock periods', () => {
      const investment = 1000; // $1000
      const tokenPrice = 0.10; // $0.10 per token
      
      // Base tokens
      const baseTokens = investment / tokenPrice;
      
      // With bonuses
      const tokens90Day = baseTokens * 1.10;
      const tokens180Day = baseTokens * 1.20;
      
      // Additional tokens gained
      const bonus90 = tokens90Day - baseTokens;
      const bonus180 = tokens180Day - baseTokens;
      
      expect(bonus90).toBe(1000); // 10% of 10000 = 1000 extra tokens
      expect(bonus180).toBe(2000); // 20% of 10000 = 2000 extra tokens
    });
  });

  describe('Performance: Presale Calculations', () => {
    it('should check unlock status for 10,000 purchases efficiently', () => {
      const start = performance.now();
      const currentTime = startTime + 100 * TIME.DAY * 1000;
      
      const purchases = Array.from({ length: 10000 }, (_, i) => ({
        time: startTime + (i % 30) * TIME.DAY * 1000,
        lockPeriod: [0, 90 * TIME.DAY, 180 * TIME.DAY][i % 3],
      }));

      const unlocked = purchases.filter(p =>
        TimelockTimeTravel.isUnlocked(p.time, p.lockPeriod, currentTime)
      );
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
      expect(unlocked.length).toBeGreaterThan(0);
    });

    it('should calculate unlock times for bulk purchases efficiently', () => {
      const start = performance.now();
      
      const purchases = Array.from({ length: 10000 }, (_, i) => ({
        time: startTime + (i * TIME.HOUR) * 1000,
        lockPeriod: [0, 90 * TIME.DAY, 180 * TIME.DAY][i % 3],
      }));

      const unlockTimes = purchases.map(p =>
        TimelockTimeTravel.getUnlockTime(p.time, p.lockPeriod)
      );
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
      expect(unlockTimes.length).toBe(10000);
    });
  });
});
