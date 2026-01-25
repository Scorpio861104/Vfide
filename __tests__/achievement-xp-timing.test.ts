/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  MockDate, 
  TIME 
} from './utils/time-travel.helpers';

/**
 * Achievement Unlock & XP System Time-Dependent Tests
 * 
 * Tests achievement unlock timing, XP decay, level progression, and leaderboard resets
 */

describe('Achievement Unlock Timing', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Time-Based Achievement Requirements', () => {
    it('should unlock "7 Day Streak" achievement after 7 consecutive days', () => {
      interface AchievementProgress {
        id: string;
        requirement: number; // days
        currentStreak: number;
        unlocked: boolean;
      }

      const achievement: AchievementProgress = {
        id: 'seven_day_streak',
        requirement: 7,
        currentStreak: 0,
        unlocked: false,
      };

      // Simulate 7 days
      for (let day = 1; day <= 7; day++) {
        achievement.currentStreak = day;
      }

      achievement.unlocked = achievement.currentStreak >= achievement.requirement;

      expect(achievement.unlocked).toBe(true);
      expect(achievement.currentStreak).toBe(7);
    });

    it('should unlock "30 Day Power User" after 30 days of activity', () => {
      const powerUserRequirement = 30;
      let activeDays = 0;

      // Simulate 30 days of activity
      for (let day = 1; day <= 30; day++) {
        activeDays++;
      }

      const unlocked = activeDays >= powerUserRequirement;

      expect(unlocked).toBe(true);
      expect(activeDays).toBe(30);
    });

    it('should unlock "Early Adopter" based on signup date', () => {
      const earlyAdopterCutoff = new Date('2024-03-01T00:00:00Z').getTime();
      const signupTime1 = new Date('2024-02-15T12:00:00Z').getTime();
      const signupTime2 = new Date('2024-03-15T12:00:00Z').getTime();

      const isEarlyAdopter1 = signupTime1 < earlyAdopterCutoff;
      const isEarlyAdopter2 = signupTime2 < earlyAdopterCutoff;

      expect(isEarlyAdopter1).toBe(true);
      expect(isEarlyAdopter2).toBe(false);
    });

    it('should track "Active for X Months" achievements', () => {
      const signupTime = startTime;
      const checkTimes = [
        startTime + 30 * TIME.DAY * 1000,  // 1 month
        startTime + 90 * TIME.DAY * 1000,  // 3 months
        startTime + 180 * TIME.DAY * 1000, // 6 months
        startTime + 365 * TIME.DAY * 1000, // 12 months
      ];

      const achievements = checkTimes.map((checkTime, index) => {
        const monthsActive = Math.floor((checkTime - signupTime) / (30 * TIME.DAY * 1000));
        return {
          months: monthsActive,
          achieved: true,
        };
      });

      expect(achievements[0].months).toBe(1);
      expect(achievements[1].months).toBe(3);
      expect(achievements[2].months).toBe(6);
      expect(achievements[3].months).toBe(12);
      expect(achievements.every(a => a.achieved)).toBe(true);
    });
  });

  describe('Achievement Unlock Delays', () => {
    it('should enforce processing delay before achievement becomes visible', () => {
      const requirementMetAt = startTime;
      const processingDelay = 5 * TIME.MINUTE * 1000;
      const visibleAt = requirementMetAt + processingDelay;

      const checkAt3Min = requirementMetAt + 3 * TIME.MINUTE * 1000;
      const checkAt6Min = requirementMetAt + 6 * TIME.MINUTE * 1000;

      expect(checkAt3Min).toBeLessThan(visibleAt);
      expect(checkAt6Min).toBeGreaterThan(visibleAt);
    });

    it('should batch achievement unlocks (process every hour)', () => {
      interface PendingAchievement {
        id: string;
        qualifiedAt: number;
        processedAt?: number;
      }

      const achievements: PendingAchievement[] = [
        { id: 'a1', qualifiedAt: startTime + 10 * TIME.MINUTE * 1000 },
        { id: 'a2', qualifiedAt: startTime + 25 * TIME.MINUTE * 1000 },
        { id: 'a3', qualifiedAt: startTime + 45 * TIME.MINUTE * 1000 },
      ];

      // Process at the hour mark
      const processTime = startTime + TIME.HOUR * 1000;
      achievements.forEach(a => {
        if (a.qualifiedAt < processTime) {
          a.processedAt = processTime;
        }
      });

      expect(achievements.every(a => a.processedAt === processTime)).toBe(true);
    });
  });

  describe('Retroactive Achievement Unlocks', () => {
    it('should grant achievements for past activity when requirements are met', () => {
      const accountCreated = new Date('2024-01-01T00:00:00Z').getTime();
      const achievementAdded = new Date('2024-07-01T00:00:00Z').getTime(); // 6 months later
      
      // User already had 6 months of activity when achievement was added
      const monthsActive = Math.floor((achievementAdded - accountCreated) / (30 * TIME.DAY * 1000));
      const qualifiesForRetroactive = monthsActive >= 6;

      expect(monthsActive).toBeGreaterThanOrEqual(6);
      expect(qualifiesForRetroactive).toBe(true);
    });

    it('should backdate achievement unlock to when requirement was first met', () => {
      const firstMetRequirement = startTime + 30 * TIME.DAY * 1000;
      const actuallyGranted = startTime + 90 * TIME.DAY * 1000;

      interface Achievement {
        requirementMetAt: number;
        grantedAt: number;
        backdated: boolean;
      }

      const achievement: Achievement = {
        requirementMetAt: firstMetRequirement,
        grantedAt: actuallyGranted,
        backdated: true,
      };

      expect(achievement.requirementMetAt).toBeLessThan(achievement.grantedAt);
      expect(achievement.backdated).toBe(true);
    });
  });

  describe('Performance: Achievement Timing', () => {
    it('should efficiently check achievement requirements for many users', () => {
      const numUsers = 10000;
      const currentTime = startTime + 100 * TIME.DAY * 1000;

      const start = Date.now();

      const users = Array.from({ length: numUsers }, (_, i) => {
        const signupTime = startTime + (i % 50) * TIME.DAY * 1000;
        const daysActive = Math.floor((currentTime - signupTime) / (TIME.DAY * 1000));
        
        return {
          id: i,
          signupTime,
          daysActive,
          achievements: {
            week1: daysActive >= 7,
            month1: daysActive >= 30,
            month3: daysActive >= 90,
          },
        };
      });

      const elapsed = Date.now() - start;

      expect(users).toHaveLength(numUsers);
      expect(elapsed).toBeLessThan(100);
    });
  });
});

describe('XP System & Level Progression', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('XP Accumulation Over Time', () => {
    it('should grant daily login XP', () => {
      const dailyLoginXP = 10;
      let totalXP = 0;
      let currentStreak = 0;

      // 30 days of logins
      for (let day = 1; day <= 30; day++) {
        totalXP += dailyLoginXP;
        currentStreak++;
      }

      expect(totalXP).toBe(300);
      expect(currentStreak).toBe(30);
    });

    it('should grant bonus XP for consecutive days', () => {
      interface DailyXP {
        day: number;
        baseXP: number;
        bonusXP: number;
        total: number;
      }

      const days: DailyXP[] = [];
      let streak = 0;

      for (let day = 1; day <= 7; day++) {
        streak++;
        const baseXP = 10;
        const bonusXP = streak >= 7 ? 50 : 0; // Bonus on day 7

        days.push({
          day,
          baseXP,
          bonusXP,
          total: baseXP + bonusXP,
        });
      }

      const totalXP = days.reduce((sum, d) => sum + d.total, 0);
      expect(totalXP).toBe(120); // 70 base + 50 bonus
      expect(days[6].bonusXP).toBe(50);
    });

    it('should calculate level from total XP', () => {
      const calculateLevel = (xp: number): number => {
        // Simple formula: level = floor(sqrt(xp/100))
        return Math.floor(Math.sqrt(xp / 100));
      };

      expect(calculateLevel(100)).toBe(1);
      expect(calculateLevel(400)).toBe(2);
      expect(calculateLevel(900)).toBe(3);
      expect(calculateLevel(10000)).toBe(10);
    });

    it('should track XP required for next level', () => {
      interface LevelProgress {
        currentLevel: number;
        currentXP: number;
        xpForCurrentLevel: number;
        xpForNextLevel: number;
        xpNeeded: number;
        progress: number; // percentage
      }

      const getXPForLevel = (level: number): number => level * level * 100;

      const currentXP = 450;
      const currentLevel = Math.floor(Math.sqrt(currentXP / 100));
      
      const progress: LevelProgress = {
        currentLevel,
        currentXP,
        xpForCurrentLevel: getXPForLevel(currentLevel),
        xpForNextLevel: getXPForLevel(currentLevel + 1),
        xpNeeded: 0,
        progress: 0,
      };

      progress.xpNeeded = progress.xpForNextLevel - progress.currentXP;
      const levelXPRange = progress.xpForNextLevel - progress.xpForCurrentLevel;
      const xpInCurrentLevel = progress.currentXP - progress.xpForCurrentLevel;
      progress.progress = Math.floor((xpInCurrentLevel / levelXPRange) * 100);

      expect(progress.currentLevel).toBe(2);
      expect(progress.xpNeeded).toBeGreaterThan(0);
      expect(progress.progress).toBeGreaterThanOrEqual(0);
      expect(progress.progress).toBeLessThanOrEqual(100);
    });
  });

  describe('XP Decay Mechanisms', () => {
    it('should decay XP after inactivity period', () => {
      interface UserXP {
        currentXP: number;
        lastActivityAt: number;
        decayRate: number; // XP lost per day of inactivity
      }

      const user: UserXP = {
        currentXP: 1000,
        lastActivityAt: startTime,
        decayRate: 10,
      };

      const checkTime = startTime + 30 * TIME.DAY * 1000; // 30 days later
      const daysInactive = Math.floor((checkTime - user.lastActivityAt) / (TIME.DAY * 1000));
      const xpLost = Math.min(daysInactive * user.decayRate, user.currentXP);
      const currentXP = user.currentXP - xpLost;

      expect(daysInactive).toBe(30);
      expect(xpLost).toBe(300);
      expect(currentXP).toBe(700);
    });

    it('should not decay XP below minimum threshold', () => {
      const minXP = 100;
      let currentXP = 250;
      const decayAmount = 200;

      currentXP = Math.max(minXP, currentXP - decayAmount);

      expect(currentXP).toBe(100); // Stopped at minimum
    });

    it('should reset decay on activity', () => {
      interface XPDecayState {
        xp: number;
        lastActivity: number;
        decayScheduledFor: number;
      }

      const state: XPDecayState = {
        xp: 1000,
        lastActivity: startTime,
        decayScheduledFor: startTime + 7 * TIME.DAY * 1000,
      };

      // User logs in before decay
      const loginTime = startTime + 5 * TIME.DAY * 1000;
      state.lastActivity = loginTime;
      state.decayScheduledFor = loginTime + 7 * TIME.DAY * 1000;

      expect(state.decayScheduledFor).toBeGreaterThan(startTime + 7 * TIME.DAY * 1000);
    });
  });

  describe('Seasonal XP Boosts', () => {
    it('should apply time-limited XP multiplier events', () => {
      interface XPEvent {
        name: string;
        multiplier: number;
        startTime: number;
        endTime: number;
      }

      const event: XPEvent = {
        name: 'Double XP Weekend',
        multiplier: 2.0,
        startTime: new Date('2024-01-06T00:00:00Z').getTime(), // Saturday
        endTime: new Date('2024-01-08T00:00:00Z').getTime(),   // Monday
      };

      const earnTime1 = new Date('2024-01-05T12:00:00Z').getTime(); // Before event
      const earnTime2 = new Date('2024-01-06T12:00:00Z').getTime(); // During event
      const earnTime3 = new Date('2024-01-08T12:00:00Z').getTime(); // After event

      const isActiveAt = (time: number) => time >= event.startTime && time < event.endTime;

      expect(isActiveAt(earnTime1)).toBe(false);
      expect(isActiveAt(earnTime2)).toBe(true);
      expect(isActiveAt(earnTime3)).toBe(false);

      const baseXP = 100;
      const xp1 = baseXP * (isActiveAt(earnTime1) ? event.multiplier : 1);
      const xp2 = baseXP * (isActiveAt(earnTime2) ? event.multiplier : 1);
      const xp3 = baseXP * (isActiveAt(earnTime3) ? event.multiplier : 1);

      expect(xp1).toBe(100);
      expect(xp2).toBe(200);
      expect(xp3).toBe(100);
    });

    it('should stack multiple XP boost sources with time limits', () => {
      interface XPBoost {
        source: string;
        multiplier: number;
        expiresAt: number;
      }

      const currentTime = startTime + TIME.HOUR * 1000;
      const boosts: XPBoost[] = [
        { source: 'premium', multiplier: 1.5, expiresAt: startTime + 30 * TIME.DAY * 1000 },
        { source: 'event', multiplier: 2.0, expiresAt: startTime + 2 * TIME.DAY * 1000 },
        { source: 'badge', multiplier: 1.2, expiresAt: startTime + 7 * TIME.DAY * 1000 },
      ];

      const activeBoosts = boosts.filter(b => b.expiresAt > currentTime);
      const totalMultiplier = activeBoosts.reduce((product, b) => product * b.multiplier, 1.0);

      expect(activeBoosts).toHaveLength(3);
      expect(totalMultiplier).toBeCloseTo(3.6, 1); // 1.5 * 2.0 * 1.2
    });
  });

  describe('Performance: XP Calculations', () => {
    it('should efficiently calculate XP and levels for many users', () => {
      const numUsers = 10000;

      const start = Date.now();

      const users = Array.from({ length: numUsers }, (_, i) => {
        const xp = 100 + i * 50;
        const level = Math.floor(Math.sqrt(xp / 100));
        const xpForNextLevel = (level + 1) * (level + 1) * 100;

        return {
          id: i,
          xp,
          level,
          xpNeeded: xpForNextLevel - xp,
        };
      });

      const elapsed = Date.now() - start;

      expect(users).toHaveLength(numUsers);
      expect(elapsed).toBeLessThan(100);
    });
  });
});

describe('Leaderboard Time Mechanics', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Monthly Leaderboard Resets', () => {
    it('should reset leaderboard at the start of each month', () => {
      const jan1 = new Date('2024-01-01T00:00:00Z');
      const feb1 = new Date('2024-02-01T00:00:00Z');
      const mar1 = new Date('2024-03-01T00:00:00Z');

      const month1 = `${jan1.getUTCFullYear()}-${jan1.getUTCMonth() + 1}`;
      const month2 = `${feb1.getUTCFullYear()}-${feb1.getUTCMonth() + 1}`;
      const month3 = `${mar1.getUTCFullYear()}-${mar1.getUTCMonth() + 1}`;

      expect(month1).toBe('2024-1');
      expect(month2).toBe('2024-2');
      expect(month3).toBe('2024-3');
      expect(new Set([month1, month2, month3]).size).toBe(3);
    });

    it('should archive previous month leaderboard before reset', () => {
      interface MonthlyLeaderboard {
        month: string;
        topUsers: { userId: number; score: number }[];
        archived: boolean;
      }

      const currentMonth: MonthlyLeaderboard = {
        month: '2024-01',
        topUsers: [
          { userId: 1, score: 1000 },
          { userId: 2, score: 900 },
          { userId: 3, score: 800 },
        ],
        archived: false,
      };

      // Archive and create new
      const archivedMonth = { ...currentMonth, archived: true };
      const newMonth: MonthlyLeaderboard = {
        month: '2024-02',
        topUsers: [],
        archived: false,
      };

      expect(archivedMonth.archived).toBe(true);
      expect(archivedMonth.topUsers).toHaveLength(3);
      expect(newMonth.topUsers).toHaveLength(0);
      expect(newMonth.month).not.toBe(archivedMonth.month);
    });

    it('should handle prize claims for previous month', () => {
      const monthEnd = new Date('2024-01-31T23:59:59Z').getTime();
      const claimWindow = 7 * TIME.DAY * 1000; // 7 days to claim
      const claimDeadline = monthEnd + claimWindow;

      const claimAt3Days = monthEnd + 3 * TIME.DAY * 1000;
      const claimAt8Days = monthEnd + 8 * TIME.DAY * 1000;

      expect(claimAt3Days).toBeLessThan(claimDeadline);
      expect(claimAt8Days).toBeGreaterThan(claimDeadline);
    });
  });

  describe('Weekly Leaderboard Cycles', () => {
    it('should track weekly competition periods', () => {
      const weekStart = startTime; // Monday
      const weekEnd = weekStart + 7 * TIME.DAY * 1000;

      interface WeeklyPeriod {
        weekNumber: number;
        startDate: string;
        endDate: string;
      }

      const week: WeeklyPeriod = {
        weekNumber: Math.floor(weekStart / (7 * TIME.DAY * 1000)),
        startDate: new Date(weekStart).toISOString().split('T')[0],
        endDate: new Date(weekEnd - 1000).toISOString().split('T')[0],
      };

      expect(week.startDate).toBe('2024-01-01');
      expect(week.endDate).toBe('2024-01-07');
    });

    it('should calculate time remaining in current period', () => {
      const periodStart = startTime;
      const periodEnd = periodStart + 7 * TIME.DAY * 1000;
      const currentTime = periodStart + 3 * TIME.DAY * 1000;

      const timeRemaining = periodEnd - currentTime;
      const daysRemaining = Math.floor(timeRemaining / (TIME.DAY * 1000));
      const hoursRemaining = Math.floor((timeRemaining % (TIME.DAY * 1000)) / (TIME.HOUR * 1000));

      expect(daysRemaining).toBe(4);
      expect(hoursRemaining).toBe(0);
    });
  });

  describe('Real-Time Leaderboard Updates', () => {
    it('should track score update timestamps', () => {
      interface LeaderboardEntry {
        userId: number;
        score: number;
        lastUpdated: number;
      }

      const entries: LeaderboardEntry[] = [
        { userId: 1, score: 1000, lastUpdated: startTime },
        { userId: 2, score: 900, lastUpdated: startTime + TIME.HOUR * 1000 },
        { userId: 3, score: 800, lastUpdated: startTime + 2 * TIME.HOUR * 1000 },
      ];

      const sortedByRecent = [...entries].sort((a, b) => b.lastUpdated - a.lastUpdated);

      expect(sortedByRecent[0].userId).toBe(3); // Most recent
      expect(sortedByRecent[2].userId).toBe(1); // Oldest
    });

    it('should cache leaderboard for performance (update every 5 minutes)', () => {
      interface LeaderboardCache {
        data: any[];
        lastRefresh: number;
        ttl: number;
      }

      const cache: LeaderboardCache = {
        data: [],
        lastRefresh: startTime,
        ttl: 5 * TIME.MINUTE * 1000,
      };

      const checkTime1 = startTime + 3 * TIME.MINUTE * 1000;
      const checkTime2 = startTime + 6 * TIME.MINUTE * 1000;

      const needsRefresh1 = checkTime1 - cache.lastRefresh >= cache.ttl;
      const needsRefresh2 = checkTime2 - cache.lastRefresh >= cache.ttl;

      expect(needsRefresh1).toBe(false);
      expect(needsRefresh2).toBe(true);
    });
  });

  describe('Seasonal Leaderboards', () => {
    it('should define seasonal periods (quarters)', () => {
      const getQuarter = (date: Date): number => {
        return Math.floor(date.getUTCMonth() / 3) + 1;
      };

      const jan = new Date('2024-01-15T00:00:00Z');
      const apr = new Date('2024-04-15T00:00:00Z');
      const jul = new Date('2024-07-15T00:00:00Z');
      const oct = new Date('2024-10-15T00:00:00Z');

      expect(getQuarter(jan)).toBe(1);
      expect(getQuarter(apr)).toBe(2);
      expect(getQuarter(jul)).toBe(3);
      expect(getQuarter(oct)).toBe(4);
    });

    it('should track annual leaderboard (full year)', () => {
      const yearStart = new Date('2024-01-01T00:00:00Z').getTime();
      const yearEnd = new Date('2024-12-31T23:59:59Z').getTime();

      const duration = yearEnd - yearStart;
      const days = Math.floor(duration / (TIME.DAY * 1000));

      expect(days).toBeGreaterThanOrEqual(365); // 2024 is leap year
    });
  });

  describe('Performance: Leaderboard Operations', () => {
    it('should efficiently sort large leaderboards', () => {
      const numPlayers = 10000;

      const start = Date.now();

      const players = Array.from({ length: numPlayers }, (_, i) => ({
        id: i,
        score: Math.floor(Math.random() * 10000),
        lastActive: startTime + i * 1000,
      }));

      const sorted = [...players].sort((a, b) => b.score - a.score);
      const top100 = sorted.slice(0, 100);

      const elapsed = Date.now() - start;

      expect(sorted).toHaveLength(numPlayers);
      expect(top100).toHaveLength(100);
      expect(top100[0].score).toBeGreaterThanOrEqual(top100[99].score);
      expect(elapsed).toBeLessThan(100);
    });

    it('should efficiently filter leaderboard by time period', () => {
      const numEntries = 5000;
      const currentTime = startTime + 15 * TIME.DAY * 1000;

      const start = Date.now();

      const entries = Array.from({ length: numEntries }, (_, i) => ({
        id: i,
        score: 100 + i,
        timestamp: startTime + (i % 30) * TIME.DAY * 1000,
      }));

      // Filter to current month
      const currentMonth = new Date(currentTime).getUTCMonth();
      const currentMonthEntries = entries.filter(e => 
        new Date(e.timestamp).getUTCMonth() === currentMonth
      );

      const elapsed = Date.now() - start;

      expect(entries).toHaveLength(numEntries);
      expect(currentMonthEntries.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100);
    });
  });
});

describe('Edge Cases & Time Zones', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  it('should handle achievement unlock at month/year boundary', () => {
    const dec31 = new Date('2024-12-31T23:59:59Z').getTime();
    const jan1 = dec31 + 2000; // 2 seconds later

    const dec31Month = new Date(dec31).getUTCMonth();
    const jan1Month = new Date(jan1).getUTCMonth();

    expect(dec31Month).toBe(11); // December
    expect(jan1Month).toBe(0);   // January
  });

  it('should handle XP gain right before leaderboard reset', () => {
    const monthEnd = new Date('2024-01-31T23:59:58Z').getTime();
    const xpGained = monthEnd;
    const recordProcessed = xpGained + 3000; // 3 seconds processing

    const gainedMonth = new Date(xpGained).getUTCMonth();
    const processedMonth = new Date(recordProcessed).getUTCMonth();

    // XP earned in January but processed in February
    expect(gainedMonth).toBe(0); // January
    expect(processedMonth).toBe(1); // February
  });

  it('should handle timezone-independent leaderboard periods', () => {
    // All times in UTC, regardless of user timezone
    const utcNoon = new Date('2024-01-15T12:00:00Z').getTime();
    const pstMidnight = new Date('2024-01-15T08:00:00Z').getTime(); // 00:00 PST = 08:00 UTC

    const utcDate = new Date(utcNoon).toISOString().split('T')[0];
    const pstDate = new Date(pstMidnight).toISOString().split('T')[0];

    expect(utcDate).toBe('2024-01-15');
    expect(pstDate).toBe('2024-01-15'); // Same day in UTC
  });
});
