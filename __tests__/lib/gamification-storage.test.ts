/**
 * @jest-environment jsdom
 */

jest.mock('@/lib/socialAnalytics', () => ({
  analytics: { track: jest.fn() },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { gamification, getAllUserProgress } from '@/lib/gamification';

describe('gamification storage safety', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns default progress when storage reads throw', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });

    const progress = gamification.getProgress('0xstorageblocked');

    expect(progress.level).toBe(1);
    expect(progress.xp).toBe(0);
    expect(progress.effectiveLevel).toBe(1);
  });

  it('still awards XP when storage writes throw', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });

    const result = gamification.awardXP('0xwriteblocked', 100, 'quest');

    expect(result.awarded).toBe(100);
    expect(result.levelUp).toBe(true);
    expect(result.newLevel).toBe(2);
  });

  it('returns an empty leaderboard when progress entries cannot be read', () => {
    const address = '0xleaderboardblocked';
    localStorage.setItem(
      `vfide_gamification_${address}`,
      JSON.stringify({
        level: 2,
        xp: 150,
        xpToNextLevel: 100,
        achievements: [],
        penaltyXP: 0,
        effectiveXP: 150,
        effectiveLevel: 2,
        dailyXPDate: '',
        dailyXPEarned: 0,
        stats: {
          messagesSent: 0,
          friendsAdded: 0,
          groupsCreated: 0,
          paymentsSent: 0,
          daysActive: 0,
          lastActiveDate: '',
          currentStreak: 0,
          longestStreak: 0,
        },
      })
    );

    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });

    expect(getAllUserProgress()).toEqual([]);
  });
});