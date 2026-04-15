'use client';

import { analytics } from './socialAnalytics';
import { logger } from '@/lib/logger';
import { safeLocalStorage } from './utils';

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
  /**
   * Accumulated XP penalty from violations.  The effective level (and all
   * perk/governance calculations) is based on `xp - penaltyXP`, so grinding
   * more XP can never fully erase the impact of misconduct.
   */
  penaltyXP: number;
  /** Effective XP after subtracting penalties; never goes below 0. */
  effectiveXP: number;
  /** Effective level derived from effectiveXP — used for all perk gates. */
  effectiveLevel: number;
  /**
   * Per-calendar-day XP already awarded.  Capped at MAX_XP_PER_DAY to
   * prevent rapid farming.
   */
  dailyXPDate: string;
  dailyXPEarned: number;
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

/**
 * Maximum XP that can be earned in a single calendar day.
 * Prevents rapid farming and ensures the playing field stays level.
 */
export const MAX_XP_PER_DAY = 500;

/**
 * ProofScore bonus granted per gamification level.
 *
 * Each level of in-app activity awards this many ProofScore points on top of
 * the base score that comes from on-chain actions (transactions, governance,
 * verification, etc.).  At Level 15 (the max) a user gains up to
 * MAX_LEVELS × XP_PROOF_SCORE_BONUS_PER_LEVEL = 15 × 100 = 1,500 ProofScore
 * points — a meaningful but non-dominant contribution (15 % of MAX_PROOF_SCORE).
 *
 * Formula: bonusPoints = (effectiveLevel - 1) * XP_PROOF_SCORE_BONUS_PER_LEVEL
 * The -1 means Level 1 (the starting level) contributes 0, so new users begin
 * with the same base ProofScore regardless of any XP they haven't earned yet.
 */
export const XP_PROOF_SCORE_BONUS_PER_LEVEL = 100;

/**
 * Convert an XP effective level to the equivalent ProofScore bonus.
 *
 * @param effectiveLevel - The player's effective level (1–15, after penalties).
 * @returns Additional ProofScore points from gamification (0 at Level 1, up to 1,400 at Level 15).
 */
export function xpLevelToProofScoreBonus(effectiveLevel: number): number {
  const clamped = Math.max(1, Math.min(15, Math.round(effectiveLevel)));
  return (clamped - 1) * XP_PROOF_SCORE_BONUS_PER_LEVEL;
}

/**
 * Platform perks unlocked at each level.
 * These are utility benefits for your own activity — not investment profit —
 * so they are fully Howey Test compliant.
 */
export interface LevelPerk {
  level: number;
  title: string;
  description: string;
  icon: string;
  category: 'fee' | 'governance' | 'feature' | 'status';
}

export const LEVEL_PERKS: LevelPerk[] = [
  {
    level: 2,
    title: '1% Fee Discount',
    description: 'Your transaction fees are reduced by 1% across the platform.',
    icon: '💸',
    category: 'fee',
  },
  {
    level: 3,
    title: 'Verified Participant Badge',
    description: 'Display a verified participant badge on your public profile.',
    icon: '✅',
    category: 'status',
  },
  {
    level: 5,
    title: '3% Fee Discount',
    description: 'Your transaction fees are reduced by 3% across the platform.',
    icon: '💸',
    category: 'fee',
  },
  {
    level: 5,
    title: 'Governance Voting Unlocked',
    description: 'Eligible to participate in DAO governance proposals.',
    icon: '🗳️',
    category: 'governance',
  },
  {
    level: 7,
    title: 'Priority Support',
    description: 'Your support requests are escalated to a dedicated queue.',
    icon: '⚡',
    category: 'feature',
  },
  {
    level: 8,
    title: '5% Fee Discount',
    description: 'Your transaction fees are reduced by 5% across the platform.',
    icon: '💸',
    category: 'fee',
  },
  {
    level: 10,
    title: '1.25× Governance Voting Weight',
    description: 'Your governance votes carry 25% more weight than base votes.',
    icon: '🗳️',
    category: 'governance',
  },
  {
    level: 10,
    title: 'Early Feature Access',
    description: 'Opt in to beta features before public release.',
    icon: '🔬',
    category: 'feature',
  },
  {
    level: 12,
    title: '8% Fee Discount',
    description: 'Your transaction fees are reduced by 8% across the platform.',
    icon: '💸',
    category: 'fee',
  },
  {
    level: 12,
    title: 'Direct DAO Proposal Rights',
    description: 'Submit governance proposals directly without a delegate.',
    icon: '📋',
    category: 'governance',
  },
  {
    level: 15,
    title: '12% Fee Discount',
    description: 'Maximum 12% transaction fee reduction for top-level members.',
    icon: '💸',
    category: 'fee',
  },
  {
    level: 15,
    title: '1.5× Governance Voting Weight',
    description: 'Your governance votes carry 50% more weight than base votes.',
    icon: '🗳️',
    category: 'governance',
  },
  {
    level: 15,
    title: 'Council Eligibility',
    description: 'Eligible to be elected to the VFIDE Community Council.',
    icon: '👑',
    category: 'status',
  },
];

/**
 * Additional governance perks granted by the Headhunter competition badge.
 * The badge is earned by finishing in the top 20 of a quarterly headhunter
 * competition. It stacks additively with level-based voting perks above.
 *
 * Badge perks: +25% voting weight bonus (stacks on top of level multiplier),
 * direct DAO proposal rights (if not already unlocked at Level 12),
 * and Community Council eligibility (if not already unlocked at Level 15).
 */
export const HEADHUNTER_BADGE_PERKS: Pick<LevelPerk, 'title' | 'description' | 'icon' | 'category'>[] = [
  {
    title: '+25% Voting Weight Bonus',
    description: 'Stacks additively on top of your level-based voting multiplier.',
    icon: '🗳️',
    category: 'governance',
  },
  {
    title: 'Direct DAO Proposal Rights',
    description: 'Submit governance proposals directly, regardless of XP level.',
    icon: '📋',
    category: 'governance',
  },
  {
    title: 'Council Eligibility',
    description: 'Eligible to be elected to the Community Council for the quarter.',
    icon: '👑',
    category: 'status',
  },
];

function getLocalStorageKeys(): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  } catch {
    return [];
  }
}

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
      const stored = safeLocalStorage.getItem(`${this.storageKey}_${userAddress}`);
      if (stored) {
        const parsed: UserProgress = JSON.parse(stored);
        // Backfill anti-abuse fields added after initial launch so existing
        // stored objects are always fully shaped.
        if (parsed.penaltyXP === undefined) parsed.penaltyXP = 0;
        if (parsed.effectiveXP === undefined) parsed.effectiveXP = parsed.xp;
        if (parsed.effectiveLevel === undefined) parsed.effectiveLevel = parsed.level;
        if (parsed.dailyXPDate === undefined) parsed.dailyXPDate = '';
        if (parsed.dailyXPEarned === undefined) parsed.dailyXPEarned = 0;
        return parsed;
      }
    } catch (error) {
      logger.error('Failed to load gamification progress:', error);
    }

    return this.getDefaultProgress();
  }

  /**
   * Save user progress
   */
  private saveProgress(userAddress: string, progress: UserProgress) {
    const didPersist = safeLocalStorage.setItem(
      `${this.storageKey}_${userAddress}`,
      JSON.stringify(progress)
    );

    if (!didPersist) {
      logger.error('Failed to save gamification progress:', new Error('localStorage write failed'));
    }
  }

  /**
   * Award XP and check for level ups.
   * Enforces the per-day cap (MAX_XP_PER_DAY) so rapid farming is not possible.
   * Returns the actual XP awarded (may be less than requested if cap is hit).
   */
  awardXP(userAddress: string, amount: number, reason: string): { levelUp: boolean; newLevel?: number; awarded: number } {
    const progress = this.getProgress(userAddress);
    const today = new Date().toDateString();

    // Reset daily counter when the date changes
    if (progress.dailyXPDate !== today) {
      progress.dailyXPDate = today;
      progress.dailyXPEarned = 0;
    }

    // Clamp to remaining daily allowance
    const remaining = Math.max(0, MAX_XP_PER_DAY - progress.dailyXPEarned);
    const awarded = Math.min(amount, remaining);

    if (awarded <= 0) {
      this.saveProgress(userAddress, progress);
      return { levelUp: false, awarded: 0 };
    }

    progress.xp += awarded;
    progress.dailyXPEarned += awarded;

    // Recompute effective values (used for all perk/governance gates)
    progress.effectiveXP = Math.max(0, progress.xp - progress.penaltyXP);
    progress.effectiveLevel = this.calculateLevel(progress.effectiveXP);

    // Earned level (ignores penalties — stored for record-keeping only)
    const newLevel = this.calculateLevel(progress.xp);
    const oldLevel = progress.level;
    const levelUp = newLevel > oldLevel;

    if (levelUp) {
      progress.level = newLevel;
      analytics.track('payment_attempt_no_vault', {
        feature: 'xp_level_up',
        metadata: { level: newLevel, xp: progress.xp, reason },
      });
    }

    // xpToNextLevel is based on effective XP so it reflects the user's real progress
    progress.xpToNextLevel = this.getXPForNextLevel(progress.effectiveXP);
    this.saveProgress(userAddress, progress);

    return { levelUp, newLevel: levelUp ? newLevel : undefined, awarded };
  }

  /**
   * Deduct XP as a penalty for misconduct.
   * Penalty XP accumulates in `penaltyXP` and permanently reduces
   * `effectiveLevel` — grinding more XP does NOT remove the penalty.
   */
  deductXP(userAddress: string, amount: number, reason: string): { newEffectiveLevel: number; penaltyXP: number } {
    if (amount <= 0) throw new Error('Penalty amount must be positive');
    const progress = this.getProgress(userAddress);

    progress.penaltyXP += amount;
    progress.effectiveXP = Math.max(0, progress.xp - progress.penaltyXP);
    progress.effectiveLevel = this.calculateLevel(progress.effectiveXP);
    // xpToNextLevel always reflects effective XP after penalties
    progress.xpToNextLevel = this.getXPForNextLevel(progress.effectiveXP);

    analytics.track('payment_attempt_no_vault', {
      feature: 'gamification_xp_penalty',
      metadata: { penaltyXP: amount, reason, effectiveLevel: progress.effectiveLevel },
    });

    this.saveProgress(userAddress, progress);
    return { newEffectiveLevel: progress.effectiveLevel, penaltyXP: progress.penaltyXP };
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
      if (xp >= (LEVEL_THRESHOLDS[i] ?? 0)) {
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

    return (LEVEL_THRESHOLDS[currentLevel] ?? 0) - currentXP;
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
      penaltyXP: 0,
      effectiveXP: 0,
      effectiveLevel: 1,
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
  for (const key of getLocalStorageKeys()) {
    if (key?.startsWith('vfide_gamification_')) {
      try {
        const address = key.replace('vfide_gamification_', '');
        const data = safeLocalStorage.getItem(key);
        if (data) {
          const progress: UserProgress = JSON.parse(data);
          
          // Get user alias if available
          let alias: string | undefined;
          try {
            const profileData = safeLocalStorage.getItem(`vfide_profile_${address}`);
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
        logger.error('Failed to parse gamification data:', e);
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
    deductXP: (amount: number, reason: string) =>
      userAddress ? gamification.deductXP(userAddress, amount, reason) : { newEffectiveLevel: 1, penaltyXP: 0 },
  };
}
