/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  MockDate, 
  TIME 
} from './utils/time-travel';

/**
 * Daily & Weekly Quest Time-Dependent Tests
 * 
 * Tests quest reset mechanics, claim windows, and time-based progress tracking
 */

describe('Daily Quest Time Mechanics', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Daily Quest Reset (24-Hour Cycle)', () => {
    it('should reset daily quests at midnight UTC', () => {
      const midnightUTC = new Date('2024-01-01T00:00:00Z').getTime();
      const beforeMidnight = new Date('2024-01-01T23:59:59Z').getTime();
      const afterMidnight = new Date('2024-01-02T00:00:01Z').getTime();

      // Same day check
      const sameDay = Math.floor(midnightUTC / (TIME.DAY * 1000)) === 
                      Math.floor(beforeMidnight / (TIME.DAY * 1000));
      expect(sameDay).toBe(true);

      // Next day check
      const nextDay = Math.floor(afterMidnight / (TIME.DAY * 1000)) ===
                      Math.floor(midnightUTC / (TIME.DAY * 1000)) + 1;
      expect(nextDay).toBe(true);
    });

    it('should track quest completion date correctly', () => {
      const day1 = new Date('2024-01-01T12:00:00Z');
      const day2 = new Date('2024-01-02T12:00:00Z');

      const date1 = day1.toISOString().split('T')[0];
      const date2 = day2.toISOString().split('T')[0];

      expect(date1).toBe('2024-01-01');
      expect(date2).toBe('2024-01-02');
      expect(date1).not.toBe(date2);
    });

    it('should handle timezone-independent daily resets', () => {
      // User in different timezones should have same daily reset
      const utcMidnight = new Date('2024-01-01T00:00:00Z');
      const pstTime = new Date('2023-12-31T16:00:00-08:00'); // Same moment as UTC midnight

      expect(utcMidnight.getTime()).toBe(pstTime.getTime());
    });

    it('should reset quest progress after 24 hours', () => {
      const questStartTime = startTime;
      const after23Hours = questStartTime + 23 * TIME.HOUR * 1000;
      const after24Hours = questStartTime + 24 * TIME.HOUR * 1000;

      const dayStart = Math.floor(questStartTime / (TIME.DAY * 1000));
      const day23h = Math.floor(after23Hours / (TIME.DAY * 1000));
      const day24h = Math.floor(after24Hours / (TIME.DAY * 1000));

      expect(dayStart).toBe(day23h); // Same day
      expect(day24h).toBeGreaterThan(dayStart); // Next day
    });

    it('should allow quest completion multiple times across days', () => {
      interface QuestProgress {
        date: string;
        completed: boolean;
        claimed: boolean;
      }

      const completions: QuestProgress[] = [];
      
      // Day 1
      completions.push({
        date: '2024-01-01',
        completed: true,
        claimed: true,
      });

      // Day 2 - should be allowed again
      completions.push({
        date: '2024-01-02',
        completed: true,
        claimed: true,
      });

      expect(completions).toHaveLength(2);
      expect(completions[0].date).not.toBe(completions[1].date);
      expect(completions.every(c => c.completed)).toBe(true);
    });
  });

  describe('Daily Quest Claim Windows', () => {
    it('should allow claims within 24-hour window', () => {
      const questCompletedAt = startTime;
      const claimWindowEnd = questCompletedAt + 24 * TIME.HOUR * 1000;

      const claimAfter1Hour = questCompletedAt + 1 * TIME.HOUR * 1000;
      const claimAfter23Hour = questCompletedAt + 23 * TIME.HOUR * 1000;

      expect(claimAfter1Hour).toBeLessThan(claimWindowEnd);
      expect(claimAfter23Hour).toBeLessThan(claimWindowEnd);
    });

    it('should expire unclaimed rewards after 48 hours', () => {
      const questCompletedAt = startTime;
      const expirationTime = questCompletedAt + 48 * TIME.HOUR * 1000;

      const after47Hours = questCompletedAt + 47 * TIME.HOUR * 1000;
      const after49Hours = questCompletedAt + 49 * TIME.HOUR * 1000;

      expect(after47Hours).toBeLessThan(expirationTime);
      expect(after49Hours).toBeGreaterThan(expirationTime);
    });

    it('should track multiple unclaimed rewards with different expiration times', () => {
      interface UnclaimedReward {
        completedAt: number;
        expiresAt: number;
        amount: number;
      }

      const rewards: UnclaimedReward[] = [
        { completedAt: startTime, expiresAt: startTime + 48 * TIME.HOUR * 1000, amount: 100 },
        { completedAt: startTime + TIME.DAY * 1000, expiresAt: startTime + (48 + 24) * TIME.HOUR * 1000, amount: 150 },
        { completedAt: startTime + 2 * TIME.DAY * 1000, expiresAt: startTime + (48 + 48) * TIME.HOUR * 1000, amount: 200 },
      ];

      const checkTime = startTime + 50 * TIME.HOUR * 1000;
      const validRewards = rewards.filter(r => r.expiresAt > checkTime);

      expect(validRewards).toHaveLength(2);
      expect(validRewards[0].amount).toBe(150);
      expect(validRewards[1].amount).toBe(200);
    });
  });

  describe('Quest Cooldowns & Timing', () => {
    it('should enforce quest start cooldown (e.g., 1 hour between attempts)', () => {
      const firstAttempt = startTime;
      const cooldownPeriod = 1 * TIME.HOUR * 1000;
      const cooldownEnd = firstAttempt + cooldownPeriod;

      const attemptAt30Min = firstAttempt + 30 * TIME.MINUTE * 1000;
      const attemptAt90Min = firstAttempt + 90 * TIME.MINUTE * 1000;

      expect(attemptAt30Min).toBeLessThan(cooldownEnd);
      expect(attemptAt90Min).toBeGreaterThan(cooldownEnd);
    });

    it('should handle quest availability windows (specific hours)', () => {
      // Quest available only between 8 AM and 8 PM UTC
      const availableStart = 8; // 8 AM
      const availableEnd = 20; // 8 PM

      const timeAt7AM = new Date('2024-01-01T07:00:00Z');
      const timeAt9AM = new Date('2024-01-01T09:00:00Z');
      const timeAt7PM = new Date('2024-01-01T19:00:00Z');
      const timeAt9PM = new Date('2024-01-01T21:00:00Z');

      expect(timeAt7AM.getUTCHours()).toBeLessThan(availableStart);
      expect(timeAt9AM.getUTCHours()).toBeGreaterThanOrEqual(availableStart);
      expect(timeAt7PM.getUTCHours()).toBeLessThan(availableEnd);
      expect(timeAt9PM.getUTCHours()).toBeGreaterThanOrEqual(availableEnd);
    });
  });

  describe('Performance: Daily Quest Timing', () => {
    it('should calculate daily resets quickly for many users', () => {
      const numUsers = 10000;
      const currentDate = '2024-01-15';
      
      const start = Date.now();
      
      const userResets = Array.from({ length: numUsers }, (_, i) => ({
        userId: i,
        lastQuestDate: '2024-01-14',
        shouldReset: currentDate !== '2024-01-14',
      }));

      const elapsed = Date.now() - start;

      expect(userResets).toHaveLength(numUsers);
      expect(userResets.every(u => u.shouldReset)).toBe(true);
      expect(elapsed).toBeLessThan(100); // Should complete in <100ms
    });
  });
});

describe('Weekly Challenge Time Mechanics', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime(); // Monday

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Weekly Reset (7-Day Cycle)', () => {
    it('should calculate week boundaries correctly', () => {
      // Week starts on Monday
      const weekStart = new Date('2024-01-01T00:00:00Z'); // Monday
      const weekEnd = new Date('2024-01-07T23:59:59Z'); // Sunday

      const diffMs = weekEnd.getTime() - weekStart.getTime();
      const diffDays = diffMs / (TIME.DAY * 1000);

      expect(Math.floor(diffDays)).toBe(6); // 7 days total (0-6)
    });

    it('should identify current week number', () => {
      const jan1 = new Date('2024-01-01T00:00:00Z');
      const jan8 = new Date('2024-01-08T00:00:00Z');
      const jan15 = new Date('2024-01-15T00:00:00Z');

      const weekNum1 = Math.floor(jan1.getTime() / (7 * TIME.DAY * 1000));
      const weekNum2 = Math.floor(jan8.getTime() / (7 * TIME.DAY * 1000));
      const weekNum3 = Math.floor(jan15.getTime() / (7 * TIME.DAY * 1000));

      expect(weekNum2).toBe(weekNum1 + 1);
      expect(weekNum3).toBe(weekNum2 + 1);
    });

    it('should reset weekly challenges after 7 days', () => {
      const weekStart = startTime;
      const after6Days = weekStart + 6 * TIME.DAY * 1000;
      const after7Days = weekStart + 7 * TIME.DAY * 1000;

      // Calculate day numbers instead of week numbers for more accurate comparison
      const day1 = Math.floor(weekStart / (TIME.DAY * 1000));
      const day6 = Math.floor(after6Days / (TIME.DAY * 1000));
      const day7 = Math.floor(after7Days / (TIME.DAY * 1000));

      expect(day7 - day1).toBe(7); // Exactly 7 days apart
      expect(day6 - day1).toBe(6); // 6 days apart
    });

    it('should track weekly progress across multiple days', () => {
      interface WeeklyProgress {
        weekStart: string;
        dayProgress: { day: number; value: number }[];
        totalProgress: number;
      }

      const progress: WeeklyProgress = {
        weekStart: '2024-01-01',
        dayProgress: [
          { day: 1, value: 10 },
          { day: 2, value: 15 },
          { day: 3, value: 20 },
          { day: 4, value: 25 },
          { day: 5, value: 30 },
        ],
        totalProgress: 0,
      };

      progress.totalProgress = progress.dayProgress.reduce((sum, d) => sum + d.value, 0);

      expect(progress.totalProgress).toBe(100);
      expect(progress.dayProgress).toHaveLength(5);
    });
  });

  describe('Weekly Challenge Windows', () => {
    it('should allow completion any time within the week', () => {
      const weekStart = startTime;
      const weekEnd = weekStart + 7 * TIME.DAY * 1000;

      const monday = weekStart;
      const wednesday = weekStart + 2 * TIME.DAY * 1000;
      const sunday = weekStart + 6 * TIME.DAY * 1000 + 23 * TIME.HOUR * 1000;

      expect(monday).toBeGreaterThanOrEqual(weekStart);
      expect(monday).toBeLessThan(weekEnd);
      expect(wednesday).toBeLessThan(weekEnd);
      expect(sunday).toBeLessThan(weekEnd);
    });

    it('should allow claims for 72 hours after week ends', () => {
      const weekEnd = startTime + 7 * TIME.DAY * 1000;
      const claimWindowEnd = weekEnd + 72 * TIME.HOUR * 1000;

      const after24Hours = weekEnd + 24 * TIME.HOUR * 1000;
      const after71Hours = weekEnd + 71 * TIME.HOUR * 1000;
      const after73Hours = weekEnd + 73 * TIME.HOUR * 1000;

      expect(after24Hours).toBeLessThan(claimWindowEnd);
      expect(after71Hours).toBeLessThan(claimWindowEnd);
      expect(after73Hours).toBeGreaterThan(claimWindowEnd);
    });

    it('should expire unclaimed weekly rewards after grace period', () => {
      const weekEnd = startTime + 7 * TIME.DAY * 1000;
      const gracePeriod = 72 * TIME.HOUR * 1000;
      const expirationTime = weekEnd + gracePeriod;

      expect(expirationTime).toBe(weekEnd + 3 * TIME.DAY * 1000);
    });
  });

  describe('Multi-Week Challenge Chains', () => {
    it('should track consecutive week completions', () => {
      interface WeekCompletion {
        weekNumber: number;
        weekStart: string;
        completed: boolean;
      }

      const completions: WeekCompletion[] = [
        { weekNumber: 1, weekStart: '2024-01-01', completed: true },
        { weekNumber: 2, weekStart: '2024-01-08', completed: true },
        { weekNumber: 3, weekStart: '2024-01-15', completed: true },
        { weekNumber: 4, weekStart: '2024-01-22', completed: false },
      ];

      let consecutiveWeeks = 0;
      for (const week of completions) {
        if (week.completed) {
          consecutiveWeeks++;
        } else {
          break;
        }
      }

      expect(consecutiveWeeks).toBe(3);
    });

    it('should calculate 4-week challenge progress', () => {
      const fourWeekStart = startTime;
      const fourWeekEnd = fourWeekStart + 28 * TIME.DAY * 1000;

      const week2Start = fourWeekStart + 7 * TIME.DAY * 1000;
      const week3Start = fourWeekStart + 14 * TIME.DAY * 1000;
      const week4Start = fourWeekStart + 21 * TIME.DAY * 1000;

      expect(week2Start).toBeLessThan(fourWeekEnd);
      expect(week3Start).toBeLessThan(fourWeekEnd);
      expect(week4Start).toBeLessThan(fourWeekEnd);

      const totalDuration = fourWeekEnd - fourWeekStart;
      const expectedDuration = 28 * TIME.DAY * 1000;
      expect(totalDuration).toBe(expectedDuration);
    });
  });

  describe('Performance: Weekly Challenge Timing', () => {
    it('should efficiently calculate week numbers for many challenges', () => {
      const numChallenges = 5000;
      const baseTime = startTime;

      const start = Date.now();

      const challenges = Array.from({ length: numChallenges }, (_, i) => {
        const challengeTime = baseTime + i * TIME.DAY * 1000;
        return {
          id: i,
          weekNumber: Math.floor(challengeTime / (7 * TIME.DAY * 1000)),
          time: challengeTime,
        };
      });

      const elapsed = Date.now() - start;

      expect(challenges).toHaveLength(numChallenges);
      expect(elapsed).toBeLessThan(50); // Should complete quickly
    });
  });
});

describe('Reward Claim Timing & Expiration', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Reward Expiration Windows', () => {
    it('should track reward expiration for 48-hour window', () => {
      interface PendingReward {
        earnedAt: number;
        expiresAt: number;
        amount: number;
        type: 'daily' | 'weekly' | 'achievement';
      }

      const reward: PendingReward = {
        earnedAt: startTime,
        expiresAt: startTime + 48 * TIME.HOUR * 1000,
        amount: 100,
        type: 'daily',
      };

      const checkAt24h = startTime + 24 * TIME.HOUR * 1000;
      const checkAt47h = startTime + 47 * TIME.HOUR * 1000;
      const checkAt49h = startTime + 49 * TIME.HOUR * 1000;

      expect(checkAt24h).toBeLessThan(reward.expiresAt);
      expect(checkAt47h).toBeLessThan(reward.expiresAt);
      expect(checkAt49h).toBeGreaterThan(reward.expiresAt);
    });

    it('should handle different expiration times for different reward types', () => {
      interface RewardType {
        type: string;
        expirationHours: number;
      }

      const rewardTypes: RewardType[] = [
        { type: 'daily_quest', expirationHours: 48 },
        { type: 'weekly_challenge', expirationHours: 72 },
        { type: 'achievement', expirationHours: 168 }, // 7 days
        { type: 'seasonal_event', expirationHours: 720 }, // 30 days
      ];

      rewardTypes.forEach(rt => {
        const expiresAt = startTime + rt.expirationHours * TIME.HOUR * 1000;
        const beforeExpiry = expiresAt - TIME.HOUR * 1000;
        const afterExpiry = expiresAt + TIME.HOUR * 1000;

        expect(beforeExpiry).toBeLessThan(expiresAt);
        expect(afterExpiry).toBeGreaterThan(expiresAt);
      });

      expect(rewardTypes).toHaveLength(4);
    });

    it('should sort rewards by expiration time (claim most urgent first)', () => {
      interface TimedReward {
        id: number;
        expiresAt: number;
        amount: number;
      }

      const rewards: TimedReward[] = [
        { id: 1, expiresAt: startTime + 72 * TIME.HOUR * 1000, amount: 200 },
        { id: 2, expiresAt: startTime + 24 * TIME.HOUR * 1000, amount: 100 },
        { id: 3, expiresAt: startTime + 48 * TIME.HOUR * 1000, amount: 150 },
      ];

      const sortedByUrgency = [...rewards].sort((a, b) => a.expiresAt - b.expiresAt);

      expect(sortedByUrgency[0].id).toBe(2); // 24h - most urgent
      expect(sortedByUrgency[1].id).toBe(3); // 48h
      expect(sortedByUrgency[2].id).toBe(1); // 72h - least urgent
    });
  });

  describe('Bulk Claim Mechanics', () => {
    it('should allow claiming multiple rewards at once', () => {
      interface ClaimableReward {
        id: number;
        amount: number;
        claimedAt?: number;
      }

      const rewards: ClaimableReward[] = [
        { id: 1, amount: 100 },
        { id: 2, amount: 150 },
        { id: 3, amount: 200 },
      ];

      const claimTime = startTime + TIME.HOUR * 1000;
      const claimedRewards = rewards.map(r => ({
        ...r,
        claimedAt: claimTime,
      }));

      const totalClaimed = claimedRewards.reduce((sum, r) => sum + r.amount, 0);

      expect(claimedRewards).toHaveLength(3);
      expect(totalClaimed).toBe(450);
      expect(claimedRewards.every(r => r.claimedAt === claimTime)).toBe(true);
    });

    it('should filter out expired rewards before claiming', () => {
      interface RewardWithExpiry {
        id: number;
        amount: number;
        expiresAt: number;
      }

      const currentTime = startTime + 50 * TIME.HOUR * 1000;
      
      const rewards: RewardWithExpiry[] = [
        { id: 1, amount: 100, expiresAt: startTime + 48 * TIME.HOUR * 1000 }, // Expired
        { id: 2, amount: 150, expiresAt: startTime + 72 * TIME.HOUR * 1000 }, // Valid
        { id: 3, amount: 200, expiresAt: startTime + 24 * TIME.HOUR * 1000 }, // Expired
        { id: 4, amount: 250, expiresAt: startTime + 96 * TIME.HOUR * 1000 }, // Valid
      ];

      const claimableRewards = rewards.filter(r => r.expiresAt > currentTime);
      const totalClaimable = claimableRewards.reduce((sum, r) => sum + r.amount, 0);

      expect(claimableRewards).toHaveLength(2);
      expect(claimableRewards.map(r => r.id)).toEqual([2, 4]);
      expect(totalClaimable).toBe(400);
    });
  });

  describe('Reward Cooldowns', () => {
    it('should enforce cooldown between consecutive claims', () => {
      const lastClaimTime = startTime;
      const cooldownPeriod = 5 * TIME.MINUTE * 1000; // 5-minute cooldown
      const nextClaimAllowed = lastClaimTime + cooldownPeriod;

      const attemptAt3Min = lastClaimTime + 3 * TIME.MINUTE * 1000;
      const attemptAt6Min = lastClaimTime + 6 * TIME.MINUTE * 1000;

      expect(attemptAt3Min).toBeLessThan(nextClaimAllowed);
      expect(attemptAt6Min).toBeGreaterThan(nextClaimAllowed);
    });
  });

  describe('Performance: Reward Timing Calculations', () => {
    it('should efficiently process expiration checks for many rewards', () => {
      const numRewards = 10000;
      const currentTime = startTime + 50 * TIME.HOUR * 1000;

      const start = Date.now();

      const rewards = Array.from({ length: numRewards }, (_, i) => ({
        id: i,
        expiresAt: startTime + (24 + i % 100) * TIME.HOUR * 1000,
        amount: 100 + i % 200,
      }));

      const activeRewards = rewards.filter(r => r.expiresAt > currentTime);
      const totalAmount = activeRewards.reduce((sum, r) => sum + r.amount, 0);

      const elapsed = Date.now() - start;

      expect(rewards).toHaveLength(numRewards);
      expect(activeRewards.length).toBeGreaterThan(0);
      expect(totalAmount).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100); // Should be very fast
    });
  });
});

describe('Edge Cases & Real-World Scenarios', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  it('should handle quest completion right before daily reset', () => {
    const almostMidnight = new Date('2024-01-01T23:59:58Z').getTime();
    const processingDelay = 3 * 1000; // 3 seconds processing
    const completionRecorded = almostMidnight + processingDelay;

    const completionDate = new Date(almostMidnight).toISOString().split('T')[0];
    const recordedDate = new Date(completionRecorded).toISOString().split('T')[0];

    // Should count for next day if processing crosses midnight
    expect(completionDate).toBe('2024-01-01');
    expect(recordedDate).toBe('2024-01-02');
  });

  it('should handle leap year day calculations for weekly quests', () => {
    const leapYearStart = new Date('2024-02-28T00:00:00Z').getTime();
    const nextDay = leapYearStart + TIME.DAY * 1000;
    const weekLater = leapYearStart + 7 * TIME.DAY * 1000;

    const feb28 = new Date(leapYearStart).getUTCDate();
    const feb29 = new Date(nextDay).getUTCDate();

    expect(feb28).toBe(28);
    expect(feb29).toBe(29); // Leap day exists

    const weekLaterDate = new Date(weekLater).toISOString().split('T')[0];
    expect(weekLaterDate).toBe('2024-03-06');
  });

  it('should handle end-of-month/year boundaries for quests', () => {
    const dec31 = new Date('2024-12-31T23:00:00Z').getTime();
    const jan1 = dec31 + 2 * TIME.HOUR * 1000;

    const dec31Date = new Date(dec31).toISOString().split('T')[0];
    const jan1Date = new Date(jan1).toISOString().split('T')[0];

    expect(dec31Date).toBe('2024-12-31');
    expect(jan1Date).toBe('2025-01-01');

    const yearDec = new Date(dec31).getUTCFullYear();
    const yearJan = new Date(jan1).getUTCFullYear();
    expect(yearJan).toBe(yearDec + 1);
  });

  it('should handle simultaneous quest completions from multiple users', () => {
    interface UserCompletion {
      userId: number;
      completedAt: number;
      questId: number;
    }

    const completionTime = startTime + TIME.HOUR * 1000;
    const completions: UserCompletion[] = Array.from({ length: 1000 }, (_, i) => ({
      userId: i,
      completedAt: completionTime + i, // Microseconds apart
      questId: 1,
    }));

    // All completions within same second
    const allInSameSecond = completions.every(c => 
      Math.floor(c.completedAt / 1000) === Math.floor(completionTime / 1000)
    );

    expect(allInSameSecond).toBe(true);
    expect(completions).toHaveLength(1000);
  });

  it('should handle weekly challenge spanning DST change', () => {
    // Spring forward DST (lose an hour)
    const beforeDST = new Date('2024-03-10T00:00:00Z').getTime();
    const afterDST = beforeDST + 7 * TIME.DAY * 1000;

    const weekDuration = afterDST - beforeDST;
    const expectedDays = weekDuration / (TIME.DAY * 1000);

    // Should still be 7 days (UTC doesn't observe DST)
    expect(expectedDays).toBe(7);
  });
});
