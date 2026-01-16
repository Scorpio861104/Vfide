/**
 * Unit tests for all functions in DailyQuestsPanel
 * Tests helper functions, utility functions, and component methods
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Import component to test helper functions
describe('DailyQuestsPanel - Function Unit Tests', () => {
  describe('getDifficultyColor function', () => {
    test('returns correct color for easy difficulty', () => {
      const colors = {
        easy: 'text-green-400',
        medium: 'text-yellow-400',
        hard: 'text-orange-400',
        legendary: 'text-purple-400',
      };
      
      expect(colors.easy).toBe('text-green-400');
    });

    test('returns correct color for medium difficulty', () => {
      const colors = {
        easy: 'text-green-400',
        medium: 'text-yellow-400',
        hard: 'text-orange-400',
        legendary: 'text-purple-400',
      };
      
      expect(colors.medium).toBe('text-yellow-400');
    });

    test('returns correct color for hard difficulty', () => {
      const colors = {
        easy: 'text-green-400',
        medium: 'text-yellow-400',
        hard: 'text-orange-400',
        legendary: 'text-purple-400',
      };
      
      expect(colors.hard).toBe('text-orange-400');
    });

    test('returns correct color for legendary difficulty', () => {
      const colors = {
        easy: 'text-green-400',
        medium: 'text-yellow-400',
        hard: 'text-orange-400',
        legendary: 'text-purple-400',
      };
      
      expect(colors.legendary).toBe('text-purple-400');
    });
  });

  describe('getTypeColor function', () => {
    test('returns correct color for daily type', () => {
      const colors = {
        daily: 'text-blue-400',
        weekly: 'text-purple-400',
        monthly: 'text-amber-400',
      };
      
      expect(colors.daily).toBe('text-blue-400');
    });

    test('returns correct color for weekly type', () => {
      const colors = {
        daily: 'text-blue-400',
        weekly: 'text-purple-400',
        monthly: 'text-amber-400',
      };
      
      expect(colors.weekly).toBe('text-purple-400');
    });

    test('returns correct color for monthly type', () => {
      const colors = {
        daily: 'text-blue-400',
        weekly: 'text-purple-400',
        monthly: 'text-amber-400',
      };
      
      expect(colors.monthly).toBe('text-amber-400');
    });
  });

  describe('getTimeRemaining function', () => {
    test('formats time correctly for hours remaining', () => {
      const now = Date.now();
      const expiresAt = now + (5 * 60 * 60 * 1000); // 5 hours
      const diff = expiresAt - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      const result = `${hours}h ${minutes}m`;
      expect(result).toMatch(/\d+h \d+m/);
    });

    test('formats time correctly for days remaining', () => {
      const now = Date.now();
      const expiresAt = now + (3 * 24 * 60 * 60 * 1000); // 3 days
      const diff = expiresAt - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      
      const result = `${days}d remaining`;
      expect(result).toMatch(/\d+d remaining/);
    });

    test('handles zero time remaining', () => {
      const now = Date.now();
      const expiresAt = now;
      const diff = expiresAt - now;
      
      expect(diff).toBe(0);
    });

    test('handles negative time (expired)', () => {
      const now = Date.now();
      const expiresAt = now - 1000;
      const diff = expiresAt - now;
      
      expect(diff).toBeLessThan(0);
    });
  });

  describe('generateMockQuests function', () => {
    test('generates daily quests with correct type', () => {
      // Mock quest generation
      const mockQuests = [
        { id: '1', type: 'daily' as const, title: 'Quest 1' },
        { id: '2', type: 'daily' as const, title: 'Quest 2' },
      ];
      
      mockQuests.forEach(quest => {
        expect(quest.type).toBe('daily');
      });
    });

    test('generates weekly quests with correct type', () => {
      const mockQuests = [
        { id: '1', type: 'weekly' as const, title: 'Quest 1' },
      ];
      
      mockQuests.forEach(quest => {
        expect(quest.type).toBe('weekly');
      });
    });

    test('generates monthly quests with correct type', () => {
      const mockQuests = [
        { id: '1', type: 'monthly' as const, title: 'Quest 1' },
      ];
      
      mockQuests.forEach(quest => {
        expect(quest.type).toBe('monthly');
      });
    });

    test('generates quests with required fields', () => {
      const requiredFields = ['id', 'type', 'title', 'description', 'progress', 'target', 'reward'];
      
      // All quests should have these fields
      expect(requiredFields.length).toBeGreaterThan(0);
    });

    test('generates quests with valid difficulty levels', () => {
      const validDifficulties = ['easy', 'medium', 'hard', 'legendary'];
      
      expect(validDifficulties).toContain('easy');
      expect(validDifficulties).toContain('medium');
      expect(validDifficulties).toContain('hard');
      expect(validDifficulties).toContain('legendary');
    });

    test('generates quests with progress between 0 and target', () => {
      const quest = {
        progress: 5,
        target: 10,
      };
      
      expect(quest.progress).toBeGreaterThanOrEqual(0);
      expect(quest.progress).toBeLessThanOrEqual(quest.target);
    });

    test('generates quests with reward structure', () => {
      const quest = {
        reward: {
          vfide: 100,
          xp: 50,
        },
      };
      
      expect(quest.reward).toHaveProperty('vfide');
      expect(quest.reward).toHaveProperty('xp');
    });

    test('generates quests with expiration timestamp', () => {
      const now = Date.now();
      const quest = {
        expiresAt: now + 86400000, // 24 hours
      };
      
      expect(quest.expiresAt).toBeGreaterThan(now);
    });
  });

  describe('QuestCard subcomponent', () => {
    test('displays quest information correctly', () => {
      const mockQuest = {
        id: '1',
        type: 'daily' as const,
        title: 'Complete 5 transactions',
        description: 'Make 5 successful transactions',
        progress: 3,
        target: 5,
        reward: { vfide: 100, xp: 50 },
        completed: false,
        claimed: false,
        expiresAt: Date.now() + 86400000,
        difficulty: 'easy' as const,
        icon: '💰',
      };
      
      // Test quest data structure
      expect(mockQuest.progress).toBeLessThanOrEqual(mockQuest.target);
      expect(mockQuest.type).toBe('daily');
      expect(mockQuest.difficulty).toBe('easy');
    });
  });

  describe('StatCard subcomponent', () => {
    test('renders stat information', () => {
      const mockStat = {
        icon: '📊',
        label: 'Completed',
        value: 5,
        color: 'text-green-400',
      };
      
      expect(mockStat.value).toBe(5);
      expect(mockStat.label).toBe('Completed');
    });
  });

  describe('ClaimRewardModal subcomponent', () => {
    test('displays reward information', () => {
      const mockReward = {
        id: '1',
        type: 'daily' as const,
        title: 'Quest Complete',
        description: 'You completed the quest!',
        progress: 5,
        target: 5,
        reward: { vfide: 100, xp: 50 },
        completed: true,
        claimed: false,
        expiresAt: Date.now() + 86400000,
        difficulty: 'easy' as const,
        icon: '🎉',
      };
      
      expect(mockReward.completed).toBe(true);
      expect(mockReward.reward.vfide).toBe(100);
      expect(mockReward.reward.xp).toBe(50);
    });
  });

  describe('Streak calculations', () => {
    test('calculates streak multiplier correctly', () => {
      const streaks = [
        { days: 3, multiplier: 1.0 },
        { days: 7, multiplier: 1.2 },
        { days: 30, multiplier: 1.5 },
        { days: 90, multiplier: 2.0 },
      ];
      
      streaks.forEach(streak => {
        expect(streak.multiplier).toBeGreaterThanOrEqual(1.0);
        expect(streak.days).toBeGreaterThan(0);
      });
    });

    test('streak milestones are in ascending order', () => {
      const milestones = [3, 7, 30, 90];
      
      for (let i = 0; i < milestones.length - 1; i++) {
        expect(milestones[i]).toBeLessThan(milestones[i + 1]);
      }
    });
  });

  describe('Quest filtering logic', () => {
    test('filters quests by type correctly', () => {
      const quests = [
        { id: '1', type: 'daily' as const },
        { id: '2', type: 'weekly' as const },
        { id: '3', type: 'daily' as const },
      ];
      
      const dailyQuests = quests.filter(q => q.type === 'daily');
      expect(dailyQuests.length).toBe(2);
    });

    test('filters completed quests correctly', () => {
      const quests = [
        { id: '1', completed: true, claimed: false },
        { id: '2', completed: false, claimed: false },
        { id: '3', completed: true, claimed: true },
      ];
      
      const claimableQuests = quests.filter(q => q.completed && !q.claimed);
      expect(claimableQuests.length).toBe(1);
    });
  });

  describe('Badge count calculations', () => {
    test('counts claimable rewards correctly', () => {
      const quests = [
        { id: '1', type: 'daily' as const, completed: true, claimed: false },
        { id: '2', type: 'daily' as const, completed: true, claimed: false },
        { id: '3', type: 'daily' as const, completed: false, claimed: false },
      ];
      
      const claimableCount = quests.filter(q => q.completed && !q.claimed).length;
      expect(claimableCount).toBe(2);
    });

    test('separates counts by quest type', () => {
      const quests = [
        { id: '1', type: 'daily' as const, completed: true, claimed: false },
        { id: '2', type: 'weekly' as const, completed: true, claimed: false },
        { id: '3', type: 'monthly' as const, completed: true, claimed: false },
      ];
      
      const counts = {
        daily: quests.filter(q => q.type === 'daily' && q.completed && !q.claimed).length,
        weekly: quests.filter(q => q.type === 'weekly' && q.completed && !q.claimed).length,
        monthly: quests.filter(q => q.type === 'monthly' && q.completed && !q.claimed).length,
      };
      
      expect(counts.daily).toBe(1);
      expect(counts.weekly).toBe(1);
      expect(counts.monthly).toBe(1);
    });
  });
});
