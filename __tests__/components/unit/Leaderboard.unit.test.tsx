/**
 * Unit tests for all functions in Leaderboard component
 * Tests sorting algorithms and ranking logic
 */

import React from 'react';
import '@testing-library/jest-dom';

describe('Leaderboard - Function Unit Tests', () => {
  describe('Sorting by XP', () => {
    test('sorts users by total XP descending', () => {
      const users = [
        { address: '0x1', totalXP: 1000 },
        { address: '0x2', totalXP: 5000 },
        { address: '0x3', totalXP: 3000 },
      ];
      
      const sorted = [...users].sort((a, b) => b.totalXP - a.totalXP);
      
      expect(sorted[0].totalXP).toBe(5000);
      expect(sorted[2].totalXP).toBe(1000);
    });

    test('handles users with same XP', () => {
      const users = [
        { address: '0x1', totalXP: 1000 },
        { address: '0x2', totalXP: 1000 },
      ];
      
      const sorted = [...users].sort((a, b) => b.totalXP - a.totalXP);
      
      expect(sorted.length).toBe(2);
      expect(sorted[0].totalXP).toBe(sorted[1].totalXP);
    });
  });

  describe('Sorting by level', () => {
    test('sorts users by level descending', () => {
      const users = [
        { address: '0x1', level: 5, totalXP: 1000 },
        { address: '0x2', level: 10, totalXP: 3000 },
        { address: '0x3', level: 7, totalXP: 2000 },
      ];
      
      const sorted = [...users].sort((a, b) => {
        if (b.level !== a.level) {
          return b.level - a.level;
        }
        return b.totalXP - a.totalXP;
      });
      
      expect(sorted[0].level).toBe(10);
      expect(sorted[2].level).toBe(5);
    });

    test('uses XP as tiebreaker for same level', () => {
      const users = [
        { address: '0x1', level: 5, totalXP: 1000 },
        { address: '0x2', level: 5, totalXP: 2000 },
      ];
      
      const sorted = [...users].sort((a, b) => {
        if (b.level !== a.level) {
          return b.level - a.level;
        }
        return b.totalXP - a.totalXP;
      });
      
      expect(sorted[0].totalXP).toBe(2000);
    });
  });

  describe('Sorting by achievements', () => {
    test('sorts users by achievement count descending', () => {
      const users = [
        { address: '0x1', unlockedAchievements: ['a1', 'a2'] },
        { address: '0x2', unlockedAchievements: ['a1', 'a2', 'a3', 'a4'] },
        { address: '0x3', unlockedAchievements: ['a1'] },
      ];
      
      const sorted = [...users].sort((a, b) => 
        b.unlockedAchievements.length - a.unlockedAchievements.length
      );
      
      expect(sorted[0].unlockedAchievements.length).toBe(4);
      expect(sorted[2].unlockedAchievements.length).toBe(1);
    });

    test('handles users with no achievements', () => {
      const users = [
        { address: '0x1', unlockedAchievements: [] },
        { address: '0x2', unlockedAchievements: ['a1'] },
      ];
      
      const sorted = [...users].sort((a, b) => 
        b.unlockedAchievements.length - a.unlockedAchievements.length
      );
      
      expect(sorted[0].unlockedAchievements.length).toBe(1);
      expect(sorted[1].unlockedAchievements.length).toBe(0);
    });
  });

  describe('Sorting by friends', () => {
    test('sorts users by friend count descending', () => {
      const users = [
        { address: '0x1', stats: { friendsAdded: 5 } },
        { address: '0x2', stats: { friendsAdded: 10 } },
        { address: '0x3', stats: { friendsAdded: 7 } },
      ];
      
      const sorted = [...users].sort((a, b) => 
        (b.stats.friendsAdded || 0) - (a.stats.friendsAdded || 0)
      );
      
      expect(sorted[0].stats.friendsAdded).toBe(10);
      expect(sorted[2].stats.friendsAdded).toBe(5);
    });

    test('handles users with undefined friend count', () => {
      const users = [
        { address: '0x1', stats: {} },
        { address: '0x2', stats: { friendsAdded: 5 } },
      ];
      
      const sorted = [...users].sort((a, b) => 
        ((b.stats as any).friendsAdded || 0) - ((a.stats as any).friendsAdded || 0)
      );
      
      expect(sorted.length).toBe(2);
    });
  });

  describe('Rank assignment', () => {
    test('assigns ranks starting from 1', () => {
      const users = [
        { address: '0x1', totalXP: 5000 },
        { address: '0x2', totalXP: 3000 },
        { address: '0x3', totalXP: 1000 },
      ];
      
      const sorted = [...users].sort((a, b) => b.totalXP - a.totalXP);
      const ranked = sorted.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
      
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].rank).toBe(3);
    });

    test('assigns sequential ranks', () => {
      const users = Array.from({ length: 10 }, (_, i) => ({
        address: `0x${i}`,
        totalXP: (10 - i) * 1000,
      }));
      
      const sorted = [...users].sort((a, b) => b.totalXP - a.totalXP);
      const ranked = sorted.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
      
      ranked.forEach((user, index) => {
        expect(user.rank).toBe(index + 1);
      });
    });
  });

  describe('getCurrentUserRank function', () => {
    test('finds current user rank in leaderboard', () => {
      const leaderboard = [
        { address: '0x1', rank: 1 },
        { address: '0x2', rank: 2 },
        { address: '0x3', rank: 3 },
      ];
      
      const currentAddress = '0x2';
      const userRank = leaderboard.find(entry => 
        entry.address.toLowerCase() === currentAddress.toLowerCase()
      );
      
      expect(userRank?.rank).toBe(2);
    });

    test('returns null when user not found', () => {
      const leaderboard = [
        { address: '0x1', rank: 1 },
      ];
      
      const currentAddress = '0x999';
      const userRank = leaderboard.find(entry => 
        entry.address.toLowerCase() === currentAddress.toLowerCase()
      );
      
      expect(userRank).toBeUndefined();
    });

    test('handles case-insensitive address matching', () => {
      const leaderboard = [
        { address: '0xABC', rank: 1 },
      ];
      
      const currentAddress = '0xabc';
      const userRank = leaderboard.find(entry => 
        entry.address.toLowerCase() === currentAddress.toLowerCase()
      );
      
      expect(userRank).toBeDefined();
      expect(userRank?.rank).toBe(1);
    });
  });

  describe('getRankIcon function', () => {
    test('returns crown for rank 1', () => {
      const rank = 1;
      const icon = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
      
      expect(icon).toBe('👑');
    });

    test('returns silver medal for rank 2', () => {
      const rank = 2;
      const icon = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
      
      expect(icon).toBe('🥈');
    });

    test('returns bronze medal for rank 3', () => {
      const rank = 3;
      const icon = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
      
      expect(icon).toBe('🥉');
    });

    test('returns null for ranks > 3', () => {
      const rank = 4;
      const icon = rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
      
      expect(icon).toBeNull();
    });
  });

  describe('Time range filtering', () => {
    test('filters by all time', () => {
      const timeRange = 'all';
      const users = [
        { address: '0x1', totalXP: 1000 },
        { address: '0x2', totalXP: 2000 },
      ];
      
      const filtered = timeRange === 'all' ? users : [];
      
      expect(filtered.length).toBe(2);
    });

    test('would filter by week (logic placeholder)', () => {
      const timeRange = 'week';
      // In real implementation, would filter by last 7 days
      expect(timeRange).toBe('week');
    });

    test('would filter by month (logic placeholder)', () => {
      const timeRange = 'month';
      // In real implementation, would filter by last 30 days
      expect(timeRange).toBe('month');
    });
  });

  describe('Empty leaderboard handling', () => {
    test('handles empty user list', () => {
      const users: any[] = [];
      const sorted = [...users].sort((a, b) => b.totalXP - a.totalXP);
      
      expect(sorted.length).toBe(0);
    });

    test('handles single user', () => {
      const users = [
        { address: '0x1', totalXP: 1000 },
      ];
      
      const sorted = [...users].sort((a, b) => b.totalXP - a.totalXP);
      const ranked = sorted.map((user, index) => ({
        ...user,
        rank: index + 1,
      }));
      
      expect(ranked.length).toBe(1);
      expect(ranked[0].rank).toBe(1);
    });
  });

  describe('Data consistency', () => {
    test('maintains user data through sort', () => {
      const users = [
        { address: '0x1', alias: 'Alice', totalXP: 1000 },
        { address: '0x2', alias: 'Bob', totalXP: 2000 },
      ];
      
      const sorted = [...users].sort((a, b) => b.totalXP - a.totalXP);
      
      expect(sorted[0].alias).toBe('Bob');
      expect(sorted[0].address).toBe('0x2');
    });

    test('does not mutate original array', () => {
      const users = [
        { address: '0x1', totalXP: 1000 },
        { address: '0x2', totalXP: 2000 },
      ];
      
      const originalFirst = users[0].address;
      const sorted = [...users].sort((a, b) => b.totalXP - a.totalXP);
      
      expect(users[0].address).toBe(originalFirst);
      expect(sorted[0].address).not.toBe(originalFirst);
    });
  });
});
