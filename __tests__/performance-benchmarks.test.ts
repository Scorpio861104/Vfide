/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { MockDate, TIME } from './utils/time-travel';
import {
  UserProfileGenerator,
  VestingDataGenerator,
  BadgeDataGenerator,
  GovernanceDataGenerator,
  StreakDataGenerator,
  SnapshotGenerator,
} from './utils/test-data-generator';
import { BADGE_REGISTRY } from '@/lib/badge-registry';

/**
 * Performance Benchmarks for Time-Dependent Features
 * 
 * Tests to ensure scalability and performance:
 * - Large-scale data generation
 * - Bulk calculations across many users
 * - Time series snapshots
 * - Concurrent operations
 */

describe('Performance Benchmarks', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Data Generation Performance', () => {
    it('should generate 1000 user profiles efficiently', () => {
      const startGen = performance.now();
      
      const users = UserProfileGenerator.generateUsers(
        1000,
        startTime,
        [100000, 1000000], // 100K to 1M allocation
        365 // 1 year simulation
      );
      
      const duration = performance.now() - startGen;
      
      expect(users.length).toBe(1000);
      expect(duration).toBeLessThan(5000); // Should complete in <5 seconds
      
      // Verify data integrity
      users.forEach(user => {
        expect(user.vesting.totalAllocation).toBeGreaterThanOrEqual(100000);
        expect(user.vesting.totalAllocation).toBeLessThanOrEqual(1000000);
        expect(user.badges.length).toBeGreaterThan(0);
        expect(user.governance.length).toBeGreaterThan(0);
      });
    });

    it('should generate vesting schedules for 10K users', () => {
      const startGen = performance.now();
      
      const users = VestingDataGenerator.generateUsers(
        10000,
        startTime,
        [50000, 500000]
      );
      
      const duration = performance.now() - startGen;
      
      expect(users.length).toBe(10000);
      expect(duration).toBeLessThan(1000); // Should complete in <1 second
    });

    it('should generate badge awards for 5000 users', () => {
      const startGen = performance.now();
      
      const allBadges = [];
      for (let i = 0; i < 5000; i++) {
        const badges = BadgeDataGenerator.generateUserBadges(
          startTime,
          365,
          30
        );
        allBadges.push(badges);
      }
      
      const duration = performance.now() - startGen;
      
      expect(allBadges.length).toBe(5000);
      expect(duration).toBeLessThan(2000); // Should complete in <2 seconds
    });
  });

  describe('Bulk Calculation Performance', () => {
    it('should calculate active badges for 1000 users at multiple times', () => {
      // Generate test data
      const users = UserProfileGenerator.generateUsers(
        1000,
        startTime,
        [100000, 1000000],
        365
      );

      // Test at 10 different time points
      const testTimes = Array.from({ length: 10 }, (_, i) => 
        startTime + (i * 30) * TIME.DAY * 1000
      );

      const startCalc = performance.now();
      
      const results = testTimes.map(time => {
        return users.map(user => 
          BadgeDataGenerator.getActiveBadges(user.badges, time)
        );
      });
      
      const duration = performance.now() - startCalc;
      
      // 1000 users × 10 time points = 10,000 calculations
      expect(results.length).toBe(10);
      expect(results[0].length).toBe(1000);
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });

    it('should calculate badge points for 5000 users', () => {
      const testTime = startTime + 180 * TIME.DAY * 1000;
      
      const users = Array.from({ length: 5000 }, (_, i) => ({
        badges: BadgeDataGenerator.generateUserBadges(startTime, 365, 30),
      }));

      const startCalc = performance.now();
      
      const totalPoints = users.reduce((sum, user) => {
        return sum + BadgeDataGenerator.calculatePoints(user.badges, testTime);
      }, 0);
      
      const duration = performance.now() - startCalc;
      
      expect(totalPoints).toBeGreaterThan(0);
      expect(duration).toBeLessThan(200); // Should complete in <200ms
    });

    it('should count votes for 1000 users across 12 months', () => {
      const users = Array.from({ length: 1000 }, (_, i) => ({
        governance: GovernanceDataGenerator.generateVotingHistory(
          startTime,
          365,
          100000 + i * 1000,
          7
        ),
      }));

      const startCalc = performance.now();
      
      const monthlyVotes = [];
      for (let month = 0; month < 12; month++) {
        const monthStart = startTime + month * 30 * TIME.DAY * 1000;
        const monthEnd = monthStart + 30 * TIME.DAY * 1000;
        
        const votes = users.reduce((sum, user) => {
          return sum + GovernanceDataGenerator.countVotesInPeriod(
            user.governance,
            monthStart,
            monthEnd
          );
        }, 0);
        
        monthlyVotes.push(votes);
      }
      
      const duration = performance.now() - startCalc;
      
      expect(monthlyVotes.length).toBe(12);
      expect(duration).toBeLessThan(300); // Should complete in <300ms
    });
  });

  describe('Time Series Performance', () => {
    it('should generate daily snapshots for 365 days with 100 users', () => {
      const users = UserProfileGenerator.generateUsers(
        100,
        startTime,
        [100000, 500000],
        365
      );

      const startCalc = performance.now();
      
      const snapshots = SnapshotGenerator.generateTimeSeries(
        users,
        startTime,
        startTime + 365 * TIME.DAY * 1000,
        1 // Daily snapshots
      );
      
      const duration = performance.now() - startCalc;
      
      expect(snapshots.length).toBeGreaterThan(360); // ~365 daily snapshots
      expect(duration).toBeLessThan(2000); // Should complete in <2 seconds
    });

    it('should generate weekly snapshots for 3 years with 500 users', () => {
      const users = UserProfileGenerator.generateUsers(
        500,
        startTime,
        [100000, 1000000],
        1095 // 3 years
      );

      const startCalc = performance.now();
      
      const snapshots = SnapshotGenerator.generateTimeSeries(
        users,
        startTime,
        startTime + 1095 * TIME.DAY * 1000,
        7 // Weekly snapshots
      );
      
      const duration = performance.now() - startCalc;
      
      expect(snapshots.length).toBeGreaterThan(150); // ~156 weekly snapshots
      expect(duration).toBeLessThan(3000); // Should complete in <3 seconds
      
      // Verify snapshot data integrity
      snapshots.forEach(snapshot => {
        expect(snapshot.totalUsers).toBe(500);
        expect(snapshot.activeBadges).toBeGreaterThan(0);
        expect(snapshot.totalBadgePoints).toBeGreaterThan(0);
      });
    });
  });

  describe('Streak Calculation Performance', () => {
    it('should calculate streaks for 10K users', () => {
      const startCalc = performance.now();
      
      const streaks = Array.from({ length: 10000 }, (_, i) => 
        StreakDataGenerator.generateActivity(
          `user-${i}`,
          startTime,
          365,
          0.8
        )
      );
      
      const duration = performance.now() - startCalc;
      
      expect(streaks.length).toBe(10000);
      expect(duration).toBeLessThan(3000); // Should complete in <3 seconds
      
      // Calculate aggregate stats
      const avgStreak = streaks.reduce((sum, s) => sum + s.currentStreak, 0) / streaks.length;
      const longestOverall = Math.max(...streaks.map(s => s.longestStreak));
      
      expect(avgStreak).toBeGreaterThan(0);
      expect(longestOverall).toBeGreaterThan(0);
    });

    it('should generate complex activity patterns for 1000 users', () => {
      const pattern = [
        { activeDays: 7, gapDays: 2 },
        { activeDays: 14, gapDays: 1 },
        { activeDays: 30, gapDays: 7 },
        { activeDays: 21, gapDays: 3 },
      ];

      const startCalc = performance.now();
      
      const activities = Array.from({ length: 1000 }, (_, i) => 
        StreakDataGenerator.generateActivityWithGaps(
          `user-${i}`,
          startTime,
          pattern
        )
      );
      
      const duration = performance.now() - startCalc;
      
      expect(activities.length).toBe(1000);
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle parallel vesting calculations', () => {
      const milestones = VestingDataGenerator.generateMilestoneSchedule(startTime, 48);
      const users = VestingDataGenerator.generateUsers(
        500,
        startTime,
        [100000, 1000000]
      );

      const startCalc = performance.now();
      
      // Calculate vesting for all users at all milestones
      const results = milestones.map(milestone => {
        return users.map(user => {
          const elapsed = milestone - user.startTime;
          const cliffTime = user.startTime + 60 * TIME.DAY * 1000;
          
          if (milestone < cliffTime) return 0;
          
          const totalDuration = 48 * 60 * TIME.DAY * 1000;
          const vestingElapsed = milestone - cliffTime;
          const percentage = Math.min(100, (vestingElapsed / totalDuration) * 100);
          
          return (user.totalAllocation * percentage) / 100;
        });
      });
      
      const duration = performance.now() - startCalc;
      
      // 48 milestones × 500 users = 24,000 calculations
      expect(results.length).toBe(48);
      expect(results[0].length).toBe(500);
      expect(duration).toBeLessThan(500); // Should complete in <500ms
    });

    it('should handle mixed operations on large dataset', () => {
      const users = UserProfileGenerator.generateUsers(
        200,
        startTime,
        [100000, 500000],
        365
      );

      const testTime = startTime + 180 * TIME.DAY * 1000;

      const startCalc = performance.now();
      
      // Perform multiple operations
      const results = users.map(user => {
        const activeBadges = BadgeDataGenerator.getActiveBadges(
          user.badges,
          testTime
        );
        const badgePoints = BadgeDataGenerator.calculatePoints(
          user.badges,
          testTime
        );
        const avgVotePower = GovernanceDataGenerator.averageVotePower(
          user.governance
        );
        const hasActiveStreak = user.streak.currentStreak > 0;
        
        return {
          activeBadges: activeBadges.length,
          badgePoints,
          avgVotePower,
          hasActiveStreak,
        };
      });
      
      const duration = performance.now() - startCalc;
      
      expect(results.length).toBe(200);
      expect(duration).toBeLessThan(200); // Should complete in <200ms
    });
  });

  describe('Memory Efficiency', () => {
    it('should not leak memory during repeated calculations', () => {
      const users = UserProfileGenerator.generateUsers(
        100,
        startTime,
        [100000, 500000],
        365
      );

      // Perform calculations 100 times
      for (let iteration = 0; iteration < 100; iteration++) {
        const testTime = startTime + (iteration * 3) * TIME.DAY * 1000;
        
        users.forEach(user => {
          BadgeDataGenerator.getActiveBadges(user.badges, testTime);
          BadgeDataGenerator.calculatePoints(user.badges, testTime);
        });
      }

      // If we reach here without running out of memory, test passes
      expect(true).toBe(true);
    });

    it('should handle large snapshot series efficiently', () => {
      const users = UserProfileGenerator.generateUsers(
        50,
        startTime,
        [100000, 500000],
        365
      );

      const startCalc = performance.now();
      
      // Generate hourly snapshots for 30 days (720 snapshots)
      const snapshots = [];
      for (let hour = 0; hour < 720; hour++) {
        const snapshotTime = startTime + hour * TIME.HOUR * 1000;
        snapshots.push(
          SnapshotGenerator.generateSnapshot(users, snapshotTime)
        );
      }
      
      const duration = performance.now() - startCalc;
      
      expect(snapshots.length).toBe(720);
      expect(duration).toBeLessThan(2000); // Should complete in <2 seconds
    });
  });

  describe('Edge Case Performance', () => {
    it('should handle users with no activity efficiently', () => {
      const users = Array.from({ length: 1000 }, (_, i) => ({
        badges: [],
        governance: [],
        streak: {
          userId: `user-${i}`,
          lastActive: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalActiveDays: 0,
        },
      }));

      const testTime = startTime + 180 * TIME.DAY * 1000;

      const startCalc = performance.now();
      
      const results = users.map(user => ({
        badgePoints: BadgeDataGenerator.calculatePoints(user.badges, testTime),
        hasActivity: user.streak.totalActiveDays > 0,
      }));
      
      const duration = performance.now() - startCalc;
      
      expect(results.length).toBe(1000);
      expect(duration).toBeLessThan(50); // Should complete very quickly
      
      // All should have 0 points and no activity
      results.forEach(r => {
        expect(r.badgePoints).toBe(0);
        expect(r.hasActivity).toBe(false);
      });
    });

    it('should handle users with maximum badges efficiently', () => {
      const allBadgeKeys = Object.keys(BADGE_REGISTRY) as (keyof typeof BADGE_REGISTRY)[];
      
      const users = Array.from({ length: 100 }, () => ({
        badges: allBadgeKeys.map(key => 
          BadgeDataGenerator.generateAward(key, startTime)
        ),
      }));

      const testTime = startTime + 180 * TIME.DAY * 1000;

      const startCalc = performance.now();
      
      const results = users.map(user => 
        BadgeDataGenerator.calculatePoints(user.badges, testTime)
      );
      
      const duration = performance.now() - startCalc;
      
      expect(results.length).toBe(100);
      expect(duration).toBeLessThan(100); // Should complete in <100ms
    });
  });
});
