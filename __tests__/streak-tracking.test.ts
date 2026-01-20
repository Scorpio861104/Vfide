/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { 
  MockDate, 
  StreakTimeTravel, 
  TIME 
} from './utils/time-travel';

describe('Gamification Streak Tracking', () => {
  const startTime = new Date('2024-01-01T00:00:00Z').getTime();

  beforeEach(() => {
    MockDate.install(startTime);
  });

  afterEach(() => {
    MockDate.uninstall();
  });

  describe('Consecutive Days Detection', () => {
    it('should detect consecutive days', () => {
      const day1 = new Date('2024-01-01T12:00:00Z');
      const day2 = new Date('2024-01-02T10:00:00Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(day1, day2)).toBe(true);
    });

    it('should detect non-consecutive days', () => {
      const day1 = new Date('2024-01-01T12:00:00Z');
      const day3 = new Date('2024-01-03T10:00:00Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(day1, day3)).toBe(false);
    });

    it('should handle same day', () => {
      const morning = new Date('2024-01-01T08:00:00Z');
      const evening = new Date('2024-01-01T20:00:00Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(morning, evening)).toBe(false);
    });

    it('should work regardless of time of day', () => {
      const day1Morning = new Date('2024-01-01T00:00:01Z');
      const day2Night = new Date('2024-01-02T23:59:59Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(day1Morning, day2Night)).toBe(true);
    });

    it('should work across months', () => {
      const jan31 = new Date('2024-01-31T12:00:00Z');
      const feb1 = new Date('2024-02-01T12:00:00Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(jan31, feb1)).toBe(true);
    });

    it('should work across years', () => {
      const dec31 = new Date('2023-12-31T12:00:00Z');
      const jan1 = new Date('2024-01-01T12:00:00Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(dec31, jan1)).toBe(true);
    });
  });

  describe('Today and Yesterday Detection', () => {
    it('should detect if date is today', () => {
      const today = new Date(startTime);
      expect(StreakTimeTravel.isToday(today, startTime)).toBe(true);
    });

    it('should detect if date is not today', () => {
      const yesterday = new Date(startTime - TIME.DAY * 1000);
      expect(StreakTimeTravel.isToday(yesterday, startTime)).toBe(false);
    });

    it('should detect if date is yesterday', () => {
      const yesterday = new Date(startTime - TIME.DAY * 1000);
      expect(StreakTimeTravel.isYesterday(yesterday, startTime)).toBe(true);
    });

    it('should detect if date is not yesterday', () => {
      const twoDaysAgo = new Date(startTime - 2 * TIME.DAY * 1000);
      expect(StreakTimeTravel.isYesterday(twoDaysAgo, startTime)).toBe(false);
    });

    it('should handle today/yesterday across midnight', () => {
      const almostMidnight = new Date('2024-01-01T23:59:59Z').getTime();
      const justAfterMidnight = new Date('2024-01-02T00:00:01Z').getTime();
      
      const date1 = new Date(almostMidnight);
      expect(StreakTimeTravel.isYesterday(date1, justAfterMidnight)).toBe(true);
    });
  });

  describe('7-Day Streak Achievement', () => {
    it('should complete 7-day streak with perfect attendance', () => {
      const days = StreakTimeTravel.generateDailySequence(startTime, 7);
      
      expect(days.length).toBe(7);
      
      // Verify consecutive
      for (let i = 0; i < days.length - 1; i++) {
        expect(StreakTimeTravel.areConsecutiveDays(days[i]!, days[i + 1]!)).toBe(true);
      }
    });

    it('should break streak with one missed day', () => {
      // Days 1-3, skip day 4, days 5-7
      const pattern = [1, 1, 1, 2, 1, 1, 1]; // Gap at day 4
      const days = StreakTimeTravel.generateSequenceWithGaps(startTime, pattern);
      
      expect(days.length).toBe(7);
      
      // Day 3 and 5 should not be consecutive (day 4 missing)
      expect(StreakTimeTravel.areConsecutiveDays(days[2]!, days[3]!)).toBe(false);
    });

    it('should track 7 consecutive days correctly', () => {
      MockDate.travelTo(startTime);
      const activityDates: Date[] = [];
      
      // Simulate user logging in every day
      for (let day = 0; day < 7; day++) {
        activityDates.push(new Date(MockDate.getCurrentTime()));
        MockDate.travel(TIME.DAY);
      }
      
      // Verify all days are consecutive
      for (let i = 0; i < activityDates.length - 1; i++) {
        expect(StreakTimeTravel.areConsecutiveDays(activityDates[i]!, activityDates[i + 1]!)).toBe(true);
      }
      
      expect(activityDates.length).toBe(7);
    });

    it('should not award 7-day streak with gaps', () => {
      MockDate.travelTo(startTime);
      const activityDates: Date[] = [];
      
      // Day 1-3
      for (let i = 0; i < 3; i++) {
        activityDates.push(new Date(MockDate.getCurrentTime()));
        MockDate.travel(TIME.DAY);
      }
      
      // Skip day 4
      MockDate.travel(TIME.DAY);
      
      // Day 5-7
      for (let i = 0; i < 3; i++) {
        activityDates.push(new Date(MockDate.getCurrentTime()));
        MockDate.travel(TIME.DAY);
      }
      
      // Should have 6 activity dates (missing day 4)
      expect(activityDates.length).toBe(6);
      
      // Streak broken between day 3 and 5
      expect(StreakTimeTravel.areConsecutiveDays(activityDates[2]!, activityDates[3]!)).toBe(false);
    });
  });

  describe('30-Day Power User Achievement', () => {
    it('should complete 30-day streak', () => {
      const days = StreakTimeTravel.generateDailySequence(startTime, 30);
      
      expect(days.length).toBe(30);
      
      // Verify all are consecutive
      for (let i = 0; i < days.length - 1; i++) {
        expect(StreakTimeTravel.areConsecutiveDays(days[i]!, days[i + 1]!)).toBe(true);
      }
    });

    it('should track 30 consecutive days', () => {
      MockDate.travelTo(startTime);
      let streak = 0;
      let previousDate: Date | null = null;
      
      for (let day = 0; day < 30; day++) {
        const currentDate = new Date(MockDate.getCurrentTime());
        
        if (previousDate && StreakTimeTravel.areConsecutiveDays(previousDate, currentDate)) {
          streak++;
        } else if (!previousDate) {
          streak = 1;
        }
        
        previousDate = currentDate;
        MockDate.travel(TIME.DAY);
      }
      
      // Started with 1, then 29 more consecutive = 30 total
      expect(streak).toBe(30);
    });

    it('should reset streak after missing a day', () => {
      MockDate.travelTo(startTime);
      const streaks: number[] = [];
      let currentStreak = 0;
      let previousDate: Date | null = null;
      
      // Activity pattern: 10 days, miss 1, 10 days, miss 1, 10 days
      const pattern = [
        ...Array(10).fill(1),
        2, // Miss a day
        ...Array(10).fill(1),
        2, // Miss a day
        ...Array(10).fill(1),
      ];
      
      for (const dayIncrement of pattern) {
        if (dayIncrement === 1) {
          const currentDate = new Date(MockDate.getCurrentTime());
          
          if (previousDate && StreakTimeTravel.areConsecutiveDays(previousDate, currentDate)) {
            currentStreak++;
          } else {
            if (currentStreak > 0) {
              streaks.push(currentStreak);
            }
            currentStreak = 1;
          }
          
          previousDate = currentDate;
        } else {
          if (currentStreak > 0) {
            streaks.push(currentStreak);
            currentStreak = 0;
          }
          previousDate = null;
        }
        
        MockDate.travel(dayIncrement * TIME.DAY);
      }
      
      if (currentStreak > 0) {
        streaks.push(currentStreak);
      }
      
      // Should have 3 streaks of 10 days each
      expect(streaks.length).toBe(3);
      expect(streaks.every(s => s === 10)).toBe(true);
    });
  });

  describe('Longest Streak Tracking', () => {
    it('should track longest streak across multiple attempts', () => {
      const sequences = [
        StreakTimeTravel.generateDailySequence(startTime, 5),
        StreakTimeTravel.generateDailySequence(startTime + 10 * TIME.DAY * 1000, 15),
        StreakTimeTravel.generateDailySequence(startTime + 30 * TIME.DAY * 1000, 8),
      ];
      
      const streakLengths = sequences.map(seq => seq.length);
      const longestStreak = Math.max(...streakLengths);
      
      expect(longestStreak).toBe(15);
    });

    it('should maintain longest streak even after breaking current streak', () => {
      let longestStreak = 0;
      let currentStreak = 0;
      
      MockDate.travelTo(startTime);
      
      // Build up to 20-day streak
      for (let i = 0; i < 20; i++) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
        MockDate.travel(TIME.DAY);
      }
      
      expect(longestStreak).toBe(20);
      
      // Break streak
      MockDate.travel(2 * TIME.DAY);
      currentStreak = 0;
      
      // Start new 10-day streak
      for (let i = 0; i < 10; i++) {
        currentStreak++;
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
        MockDate.travel(TIME.DAY);
      }
      
      // Longest should still be 20
      expect(longestStreak).toBe(20);
      expect(currentStreak).toBe(10);
    });
  });

  describe('Real-World Streak Scenarios', () => {
    it('should handle user logging in at different times each day', () => {
      const times = [
        '2024-01-01T08:00:00Z',
        '2024-01-02T14:30:00Z',
        '2024-01-03T22:15:00Z',
        '2024-01-04T06:45:00Z',
        '2024-01-05T19:00:00Z',
        '2024-01-06T11:30:00Z',
        '2024-01-07T16:20:00Z',
      ];
      
      const dates = times.map(t => new Date(t));
      
      // All should be consecutive days despite different times
      for (let i = 0; i < dates.length - 1; i++) {
        expect(StreakTimeTravel.areConsecutiveDays(dates[i]!, dates[i + 1]!)).toBe(true);
      }
    });

    it('should handle weekend breaks correctly', () => {
      const weekdayPattern = [
        1, // Monday
        1, // Tuesday
        1, // Wednesday
        1, // Thursday
        1, // Friday
        3, // Skip weekend, go to Monday
        1, // Tuesday
      ];
      
      const dates = StreakTimeTravel.generateSequenceWithGaps(startTime, weekdayPattern);
      
      // First 5 days consecutive
      for (let i = 0; i < 4; i++) {
        expect(StreakTimeTravel.areConsecutiveDays(dates[i]!, dates[i + 1]!)).toBe(true);
      }
      
      // Weekend break
      expect(StreakTimeTravel.areConsecutiveDays(dates[4]!, dates[5]!)).toBe(false);
    });

    it('should handle timezone edge cases', () => {
      // User in different timezone logs in just before and after midnight UTC
      const beforeMidnight = new Date('2024-01-01T23:59:00Z');
      const afterMidnight = new Date('2024-01-02T00:01:00Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(beforeMidnight, afterMidnight)).toBe(true);
    });

    it('should handle vacation break and recovery', () => {
      MockDate.travelTo(startTime);
      const activities: { date: Date; streakCount: number }[] = [];
      let currentStreak = 0;
      let previousDate: Date | null = null;
      
      // Build 14-day streak
      for (let i = 0; i < 14; i++) {
        const currentDate = new Date(MockDate.getCurrentTime());
        
        if (previousDate && StreakTimeTravel.areConsecutiveDays(previousDate, currentDate)) {
          currentStreak++;
        } else if (!previousDate) {
          currentStreak = 1;
        }
        
        activities.push({ date: currentDate, streakCount: currentStreak });
        previousDate = currentDate;
        MockDate.travel(TIME.DAY);
      }
      
      expect(currentStreak).toBe(14);
      
      // Take 7-day vacation
      MockDate.travel(7 * TIME.DAY);
      currentStreak = 0;
      previousDate = null;
      
      // Resume with new 7-day streak
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(MockDate.getCurrentTime());
        
        if (previousDate && StreakTimeTravel.areConsecutiveDays(previousDate, currentDate)) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
        
        activities.push({ date: currentDate, streakCount: currentStreak });
        previousDate = currentDate;
        MockDate.travel(TIME.DAY);
      }
      
      expect(currentStreak).toBe(7);
      expect(activities.length).toBe(21);
    });
  });

  describe('Edge Cases', () => {
    it('should handle daylight saving time transitions', () => {
      // Spring forward (March 10, 2024 in US)
      const beforeDST = new Date('2024-03-10T01:00:00Z');
      const afterDST = new Date('2024-03-11T01:00:00Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(beforeDST, afterDST)).toBe(true);
    });

    it('should handle leap year February 29', () => {
      const feb28 = new Date('2024-02-28T12:00:00Z');
      const feb29 = new Date('2024-02-29T12:00:00Z');
      const mar1 = new Date('2024-03-01T12:00:00Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(feb28, feb29)).toBe(true);
      expect(StreakTimeTravel.areConsecutiveDays(feb29, mar1)).toBe(true);
    });

    it('should handle date at epoch start', () => {
      const epoch = new Date(0);
      const nextDay = new Date(TIME.DAY * 1000);
      
      expect(StreakTimeTravel.areConsecutiveDays(epoch, nextDay)).toBe(true);
    });

    it('should handle future dates', () => {
      const future1 = new Date('2050-01-01T00:00:00Z');
      const future2 = new Date('2050-01-02T00:00:00Z');
      
      expect(StreakTimeTravel.areConsecutiveDays(future1, future2)).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should efficiently check consecutive days for large sequences', () => {
      const start = Date.now();
      const sequence = StreakTimeTravel.generateDailySequence(startTime, 365);
      
      for (let i = 0; i < sequence.length - 1; i++) {
        StreakTimeTravel.areConsecutiveDays(sequence[i]!, sequence[i + 1]!);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should efficiently generate large daily sequences', () => {
      const start = Date.now();
      const sequence = StreakTimeTravel.generateDailySequence(startTime, 1000);
      const duration = Date.now() - start;
      
      expect(sequence.length).toBe(1000);
      expect(duration).toBeLessThan(50); // Should complete in less than 50ms
    });
  });

  describe('Integration Scenarios', () => {
    it('should simulate complete user journey to 30-day achievement', () => {
      MockDate.travelTo(startTime);
      const journey: { day: number; date: Date; streakCount: number }[] = [];
      let streak = 0;
      let lastActive: string = '';
      
      for (let day = 1; day <= 30; day++) {
        const today = new Date(MockDate.getCurrentTime()).toDateString();
        const yesterday = new Date(MockDate.getCurrentTime() - TIME.DAY * 1000).toDateString();
        
        if (lastActive === yesterday) {
          streak++;
        } else if (lastActive === '') {
          streak = 1;
        } else {
          streak = 1;
        }
        
        journey.push({
          day,
          date: new Date(MockDate.getCurrentTime()),
          streakCount: streak,
        });
        
        lastActive = today;
        MockDate.travel(TIME.DAY);
      }
      
      expect(journey[journey.length - 1]!.streakCount).toBe(30);
    });
  });
});
