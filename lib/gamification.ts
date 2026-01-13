'use client';

import { analytics } from './socialAnalytics';

/**
 * Gamification system for VFIDE
 * Tracks achievements, XP, levels, and rewards user engagement
 */

// Achievement types
export type AchievementId = 
  | 'first_connection'
  | 'vault_creator'
  | 'social_butterfly'
  | 'messenger'
  | 'power_user'
  | 'early_adopter'
  | 'friend_collector'
  | 'group_master'
  | 'payment_pioneer'
  | 'seven_day_streak'
  | 'endorsement_receiver'
  | 'badge_collector';

export interface Achievement {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  xp: number;
  category: 'social' | 'vault' | 'engagement' | 'milestone';
  requirement: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserProgress {
  level: number;
  xp: number;
  xpToNextLevel: number;
  achievements: AchievementId[];
  stats: {
    messagesSent: number;
    friendsAdded: number;
    groupsCreated: number;
    paymentsSent: number;
    daysActive: number;
    lastActiveDate: string;
    currentStreak: number;
    longestStreak: number;
  };
}

// Achievement definitions
export const ACHIEVEMENTS: Record<AchievementId, Achievement> = {
  first_connection: {
    id: 'first_connection',
    name: 'First Steps',
    description: 'Connected your wallet to VFIDE',
    icon: '🎯',
    xp: 50,
    category: 'milestone',
    requirement: 'Connect wallet',
    rarity: 'common',
  },
  vault_creator: {
    id: 'vault_creator',
    name: 'Vault Master',
    description: 'Created your first vault',
    icon: '🔐',
    xp: 200,
    category: 'vault',
    requirement: 'Create a vault',
    rarity: 'rare',
  },
  social_butterfly: {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Added 10 friends',
    icon: '🦋',
    xp: 150,
    category: 'social',
    requirement: 'Add 10 friends',
    rarity: 'rare',
  },
  messenger: {
    id: 'messenger',
    name: 'Messenger',
    description: 'Sent 50 encrypted messages',
    icon: '💬',
    xp: 100,
    category: 'social',
    requirement: 'Send 50 messages',
    rarity: 'common',
  },
  power_user: {
    id: 'power_user',
    name: 'Power User',
    description: 'Active for 30 days',
    icon: '⚡',
    xp: 500,
    category: 'engagement',
    requirement: 'Be active 30 days',
    rarity: 'epic',
  },
  early_adopter: {
    id: 'early_adopter',
    name: 'Early Adopter',
    description: 'Joined during beta',
    icon: '🌟',
    xp: 300,
    category: 'milestone',
    requirement: 'Join during beta',
    rarity: 'legendary',
  },
  friend_collector: {
    id: 'friend_collector',
    name: 'Friend Collector',
    description: 'Added 25 friends',
    icon: '👥',
    xp: 300,
    category: 'social',
    requirement: 'Add 25 friends',
    rarity: 'epic',
  },
  group_master: {
    id: 'group_master',
    name: 'Group Master',
    description: 'Created 5 groups',
    icon: '🎭',
    xp: 200,
    category: 'social',
    requirement: 'Create 5 groups',
    rarity: 'rare',
  },
  payment_pioneer: {
    id: 'payment_pioneer',
    name: 'Payment Pioneer',
    description: 'Sent your first payment',
    icon: '💸',
    xp: 250,
    category: 'vault',
    requirement: 'Send 1 payment',
    rarity: 'rare',
  },
  seven_day_streak: {
    id: 'seven_day_streak',
    name: 'Streak Master',
    description: 'Active for 7 consecutive days',
    icon: '🔥',
    xp: 400,
    category: 'engagement',
    requirement: '7 day streak',
    rarity: 'epic',
  },
  endorsement_receiver: {
    id: 'endorsement_receiver',
    name: 'Endorsed',
    description: 'Received 10 endorsements',
    icon: '⭐',
    xp: 150,
    category: 'social',
    requirement: 'Get 10 endorsements',
    rarity: 'rare',
  },
  badge_collector: {
    id: 'badge_collector',
    name: 'Badge Collector',
    description: 'Earned 5 badges',
    icon: '🏆',
    xp: 350,
    category: 'milestone',
    requirement: 'Earn 5 badges',
    rarity: 'epic',
  },
};

// Level thresholds (exponential curve)
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1900,   // Level 7
  2650,   // Level 8
  3600,   // Level 9
  4800,   // Level 10
  6300,   // Level 11
  8100,   // Level 12
  10300,  // Level 13
  13000,  // Level 14
  16300,  // Level 15
];

class GamificationEngine {
  private storageKey = 'vfide_gamification';

  /**
   * Get user's current progress
   */
  getProgress(userAddress: string): UserProgress {
    if (typeof window === 'undefined') {
      return this.getDefaultProgress();
    }

    try {
      const stored = localStorage.getItem(`${this.storageKey}_${userAddress}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load gamification progress:', error);
    }

    return this.getDefaultProgress();
  }

  /**
   * Save user progress
   */
  private saveProgress(userAddress: string, progress: UserProgress) {
    try {
      localStorage.setItem(`${this.storageKey}_${userAddress}`, JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save gamification progress:', error);
    }
  }

  /**
   * Award XP and check for level ups
   */
  awardXP(userAddress: string, amount: number, _reason: string): { levelUp: boolean; newLevel?: number } {
    const progress = this.getProgress(userAddress);
    const oldLevel = progress.level;
    
    progress.xp += amount;
    
    // Check for level up
    const newLevel = this.calculateLevel(progress.xp);
    const levelUp = newLevel > oldLevel;
    
    if (levelUp) {
      progress.level = newLevel;
      analytics.track('payment_attempt_no_vault', { 
        feature: 'level_up',
        metadata: { level: newLevel, xp: progress.xp } 
      });
    }

    progress.xpToNextLevel = this.getXPForNextLevel(progress.xp);
    this.saveProgress(userAddress, progress);

    return { levelUp, newLevel: levelUp ? newLevel : undefined };
  }

  /**
   * Unlock achievement
   */
  unlockAchievement(userAddress: string, achievementId: AchievementId): boolean {
    const progress = this.getProgress(userAddress);
    
    // Check if already unlocked
    if (progress.achievements.includes(achievementId)) {
      return false;
    }

    const achievement = ACHIEVEMENTS[achievementId];
    progress.achievements.push(achievementId);
    
    // Award XP
    const result = this.awardXP(userAddress, achievement.xp, `Unlocked: ${achievement.name}`);
    
    analytics.track('payment_attempt_no_vault', {
      feature: 'achievement_unlocked',
      metadata: { 
        achievementId, 
        name: achievement.name,
        xp: achievement.xp,
        levelUp: result.levelUp,
      },
    });

    return true;
  }

  /**
   * Update user stats
   */
  updateStats(userAddress: string, stat: keyof UserProgress['stats'], value: number) {
    const progress = this.getProgress(userAddress);
    
    if (stat === 'lastActiveDate' || stat === 'currentStreak' || stat === 'longestStreak') {
      // Handle date-based stats separately
      return;
    }
    
    (progress.stats[stat] as number) = value;
    this.saveProgress(userAddress, progress);
    
    // Check for achievement unlocks based on stats
    this.checkStatAchievements(userAddress, progress);
  }

  /**
   * Increment a stat
   */
  incrementStat(userAddress: string, stat: keyof UserProgress['stats'], amount: number = 1) {
    const progress = this.getProgress(userAddress);
    const currentValue = progress.stats[stat] as number;
    this.updateStats(userAddress, stat, currentValue + amount);
  }

  /**
   * Update daily activity and streak
   */
  recordActivity(userAddress: string) {
    const progress = this.getProgress(userAddress);
    const today = new Date().toDateString();
    const lastActive = progress.stats.lastActiveDate;

    if (lastActive === today) {
      return; // Already recorded today
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    // Update streak
    if (lastActive === yesterdayStr) {
      progress.stats.currentStreak += 1;
    } else {
      progress.stats.currentStreak = 1;
    }

    // Update longest streak
    if (progress.stats.currentStreak > progress.stats.longestStreak) {
      progress.stats.longestStreak = progress.stats.currentStreak;
    }

    progress.stats.daysActive += 1;
    progress.stats.lastActiveDate = today;

    this.saveProgress(userAddress, progress);

    // Check streak achievements
    if (progress.stats.currentStreak === 7) {
      this.unlockAchievement(userAddress, 'seven_day_streak');
    }

    if (progress.stats.daysActive === 30) {
      this.unlockAchievement(userAddress, 'power_user');
    }
  }

  /**
   * Check for stat-based achievements
   */
  private checkStatAchievements(userAddress: string, progress: UserProgress) {
    const { stats } = progress;

    if (stats.friendsAdded >= 10 && !progress.achievements.includes('social_butterfly')) {
      this.unlockAchievement(userAddress, 'social_butterfly');
    }

    if (stats.friendsAdded >= 25 && !progress.achievements.includes('friend_collector')) {
      this.unlockAchievement(userAddress, 'friend_collector');
    }

    if (stats.messagesSent >= 50 && !progress.achievements.includes('messenger')) {
      this.unlockAchievement(userAddress, 'messenger');
    }

    if (stats.groupsCreated >= 5 && !progress.achievements.includes('group_master')) {
      this.unlockAchievement(userAddress, 'group_master');
    }

    if (stats.paymentsSent >= 1 && !progress.achievements.includes('payment_pioneer')) {
      this.unlockAchievement(userAddress, 'payment_pioneer');
    }
  }

  /**
   * Calculate level from XP
   */
  private calculateLevel(xp: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Get XP needed for next level
   */
  private getXPForNextLevel(currentXP: number): number {
    const currentLevel = this.calculateLevel(currentXP);
    
    if (currentLevel >= LEVEL_THRESHOLDS.length) {
      return 0; // Max level
    }

    return LEVEL_THRESHOLDS[currentLevel] - currentXP;
  }

  /**
   * Get default progress for new users
   */
  private getDefaultProgress(): UserProgress {
    return {
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      achievements: [],
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
    };
  }

  /**
   * Get leaderboard data
   */
  getLeaderboard(_limit: number = 10): Array<{ address: string; level: number; xp: number }> {
    // In a real implementation, this would query a backend
    // For now, return empty array
    return [];
  }
}

// Export singleton
export const gamification = new GamificationEngine();

/**
 * Get all user progress for leaderboard
 */
export function getAllUserProgress(): Array<UserProgress & { address: string; alias?: string; totalXP: number; unlockedAchievements: Achievement[] }> {
  if (typeof window === 'undefined') return [];

  const allProgress: Array<UserProgress & { address: string; alias?: string; totalXP: number; unlockedAchievements: Achievement[] }> = [];

  // Iterate through localStorage to find all gamification entries
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('vfide_gamification_')) {
      try {
        const address = key.replace('vfide_gamification_', '');
        const data = localStorage.getItem(key);
        if (data) {
          const progress: UserProgress = JSON.parse(data);
          
          // Get user alias if available
          let alias: string | undefined;
          try {
            const profileData = localStorage.getItem(`vfide_profile_${address}`);
            if (profileData) {
              const profile = JSON.parse(profileData);
              alias = profile.alias;
            }
          } catch (_e) {
            // Ignore profile errors
          }

          allProgress.push({
            ...progress,
            address,
            alias,
            totalXP: progress.xp,
            unlockedAchievements: progress.achievements.map(id => ACHIEVEMENTS[id]),
          });
        }
      } catch (e) {
        console.error('Failed to parse gamification data:', e);
      }
    }
  }

  return allProgress;
}

/**
 * Get user's progress by address
 */
export function getProgress(address: string): UserProgress {
  return gamification.getProgress(address);
}

/**
 * React hook for gamification
 */
export function useGamification(userAddress: string | undefined) {
  const progress = userAddress ? gamification.getProgress(userAddress) : null;

  return {
    progress,
    awardXP: (amount: number, reason: string) => 
      userAddress ? gamification.awardXP(userAddress, amount, reason) : { levelUp: false },
    unlockAchievement: (id: AchievementId) => 
      userAddress ? gamification.unlockAchievement(userAddress, id) : false,
    incrementStat: (stat: keyof UserProgress['stats'], amount?: number) => 
      userAddress ? gamification.incrementStat(userAddress, stat, amount) : undefined,
    recordActivity: () => 
      userAddress ? gamification.recordActivity(userAddress) : undefined,
  };
}
