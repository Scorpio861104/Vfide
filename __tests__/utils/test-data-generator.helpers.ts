/**
 * Test Data Generator for Time-Dependent Features
 * 
 * Utilities to generate realistic test data for:
 * - User vesting schedules
 * - Badge award histories
 * - Governance participation patterns
 * - Streak activity records
 */

import { TIME } from './time-travel';
import { BADGE_REGISTRY } from '@/lib/badge-registry';

export interface UserVestingData {
  userId: string;
  startTime: number;
  totalAllocation: number;
  cliffDays: number;
  vestingMonths: number;
  currentVested: number;
  nextMilestone: number;
}

export interface BadgeAward {
  badgeId: string;
  badgeName: string;
  awardedAt: number;
  expiresAt: number | null;
  isPermanent: boolean;
  points: number;
}

export interface GovernanceActivity {
  proposalId: string;
  votedAt: number;
  votePower: number;
  votedFor: boolean;
}

export interface StreakActivity {
  userId: string;
  lastActive: number;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
}

/**
 * Generate realistic user vesting data
 */
export class VestingDataGenerator {
  /**
   * Generate a single user's vesting schedule
   */
  static generateUser(
    userId: string,
    startTime: number,
    allocation: number
  ): UserVestingData {
    return {
      userId,
      startTime,
      totalAllocation: allocation,
      cliffDays: 60,
      vestingMonths: 36,
      currentVested: 0,
      nextMilestone: startTime + 60 * TIME.DAY * 1000,
    };
  }

  /**
   * Generate multiple users with varying allocations
   */
  static generateUsers(
    count: number,
    baseTime: number,
    allocationRange: [number, number]
  ): UserVestingData[] {
    const users: UserVestingData[] = [];
    const [minAlloc, maxAlloc] = allocationRange;

    for (let i = 0; i < count; i++) {
      const allocation = minAlloc + Math.random() * (maxAlloc - minAlloc);
      const startOffset = Math.random() * 30 * TIME.DAY * 1000; // Random start within 30 days
      
      users.push(
        this.generateUser(
          `user-${i}`,
          baseTime + startOffset,
          Math.floor(allocation)
        )
      );
    }

    return users;
  }

  /**
   * Generate vesting schedule with milestone timestamps
   */
  static generateMilestoneSchedule(
    startTime: number,
    totalMilestones: number = 48
  ): number[] {
    const milestones: number[] = [];
    const cliffTime = startTime + 60 * TIME.DAY * 1000;
    
    for (let i = 0; i < totalMilestones; i++) {
      milestones.push(cliffTime + i * 60 * TIME.DAY * 1000);
    }
    
    return milestones;
  }
}

/**
 * Generate realistic badge award data
 */
export class BadgeDataGenerator {
  /**
   * Generate a single badge award
   */
  static generateAward(
    badgeKey: keyof typeof BADGE_REGISTRY,
    awardTime: number
  ): BadgeAward {
    const badge = BADGE_REGISTRY[badgeKey];
    const expiresAt = badge.duration === 0 
      ? null 
      : awardTime + badge.duration * 1000;

    return {
      badgeId: badgeKey,
      badgeName: badge.name,
      awardedAt: awardTime,
      expiresAt,
      isPermanent: badge.isPermanent,
      points: badge.points,
    };
  }

  /**
   * Generate a user's badge history
   */
  static generateUserBadges(
    startTime: number,
    durationDays: number,
    badgeFrequency: number = 30 // Award badge every N days
  ): BadgeAward[] {
    const awards: BadgeAward[] = [];
    const timeLimitedBadges = Object.keys(BADGE_REGISTRY).filter(
      key => !BADGE_REGISTRY[key as keyof typeof BADGE_REGISTRY].isPermanent
    ) as (keyof typeof BADGE_REGISTRY)[];

    const permanentBadges = Object.keys(BADGE_REGISTRY).filter(
      key => BADGE_REGISTRY[key as keyof typeof BADGE_REGISTRY].isPermanent
    ) as (keyof typeof BADGE_REGISTRY)[];

    // Award 2-3 permanent badges at start
    const numPermanent = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numPermanent && i < permanentBadges.length; i++) {
      awards.push(
        this.generateAward(permanentBadges[i], startTime)
      );
    }

    // Award time-limited badges throughout period
    let currentTime = startTime;
    while (currentTime < startTime + durationDays * TIME.DAY * 1000) {
      const randomBadge = timeLimitedBadges[
        Math.floor(Math.random() * timeLimitedBadges.length)
      ];
      
      awards.push(this.generateAward(randomBadge, currentTime));
      
      currentTime += badgeFrequency * TIME.DAY * 1000;
    }

    return awards;
  }

  /**
   * Get active badges at specific time
   */
  static getActiveBadges(
    awards: BadgeAward[],
    currentTime: number
  ): BadgeAward[] {
    return awards.filter(award => {
      if (award.isPermanent) return true;
      return award.expiresAt === null || award.expiresAt > currentTime;
    });
  }

  /**
   * Calculate total badge points at time
   */
  static calculatePoints(
    awards: BadgeAward[],
    currentTime: number
  ): number {
    const activeBadges = this.getActiveBadges(awards, currentTime);
    return activeBadges.reduce((sum, badge) => sum + badge.points, 0);
  }
}

/**
 * Generate governance participation data
 */
export class GovernanceDataGenerator {
  /**
   * Generate voting activity for a user
   */
  static generateVotingHistory(
    startTime: number,
    durationDays: number,
    initialVotePower: number,
    votingFrequency: number = 7 // Vote every N days
  ): GovernanceActivity[] {
    const votes: GovernanceActivity[] = [];
    let currentTime = startTime;
    let proposalCount = 0;

    while (currentTime < startTime + durationDays * TIME.DAY * 1000) {
      // Voting power increases over time (simulate vesting)
      const timeProgress = (currentTime - startTime) / (durationDays * TIME.DAY * 1000);
      const votePower = Math.floor(initialVotePower * timeProgress);

      if (votePower > 0) {
        votes.push({
          proposalId: `prop-${proposalCount}`,
          votedAt: currentTime,
          votePower,
          votedFor: Math.random() > 0.3, // 70% vote "for"
        });
        proposalCount++;
      }

      // Random voting interval (±2 days)
      const interval = (votingFrequency + (Math.random() - 0.5) * 4) * TIME.DAY * 1000;
      currentTime += interval;
    }

    return votes;
  }

  /**
   * Calculate total votes cast in period
   */
  static countVotesInPeriod(
    votes: GovernanceActivity[],
    startTime: number,
    endTime: number
  ): number {
    return votes.filter(v => v.votedAt >= startTime && v.votedAt < endTime).length;
  }

  /**
   * Calculate average vote power over time
   */
  static averageVotePower(votes: GovernanceActivity[]): number {
    if (votes.length === 0) return 0;
    const total = votes.reduce((sum, v) => sum + v.votePower, 0);
    return total / votes.length;
  }
}

/**
 * Generate streak activity data
 */
export class StreakDataGenerator {
  /**
   * Generate realistic activity pattern
   */
  static generateActivity(
    userId: string,
    startTime: number,
    durationDays: number,
    activityRate: number = 0.8 // 80% daily activity
  ): StreakActivity {
    let currentStreak = 0;
    let longestStreak = 0;
    let totalActiveDays = 0;
    let lastActive = startTime;

    for (let day = 0; day < durationDays; day++) {
      const isActive = Math.random() < activityRate;
      
      if (isActive) {
        currentStreak++;
        totalActiveDays++;
        lastActive = startTime + day * TIME.DAY * 1000;
        
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      } else {
        currentStreak = 0;
      }
    }

    return {
      userId,
      lastActive,
      currentStreak,
      longestStreak,
      totalActiveDays,
    };
  }

  /**
   * Generate activity pattern with intentional gaps
   */
  static generateActivityWithGaps(
    userId: string,
    startTime: number,
    pattern: { activeDays: number; gapDays: number }[]
  ): StreakActivity {
    let currentTime = startTime;
    let currentStreak = 0;
    let longestStreak = 0;
    let totalActiveDays = 0;
    let lastActive = startTime;

    for (const { activeDays, gapDays } of pattern) {
      // Active period
      for (let i = 0; i < activeDays; i++) {
        currentStreak++;
        totalActiveDays++;
        lastActive = currentTime;
        currentTime += TIME.DAY * 1000;
        
        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }
      }

      // Gap period (streak breaks)
      currentTime += gapDays * TIME.DAY * 1000;
      currentStreak = 0;
    }

    return {
      userId,
      lastActive,
      currentStreak: 0, // Ends with gap
      longestStreak,
      totalActiveDays,
    };
  }

  /**
   * Simulate perfect 30-day streak
   */
  static generatePerfectStreak(
    userId: string,
    startTime: number,
    days: number = 30
  ): StreakActivity {
    return {
      userId,
      lastActive: startTime + (days - 1) * TIME.DAY * 1000,
      currentStreak: days,
      longestStreak: days,
      totalActiveDays: days,
    };
  }
}

/**
 * Generate comprehensive user profile with all time-dependent data
 */
export class UserProfileGenerator {
  static generateCompleteProfile(
    userId: string,
    startTime: number,
    vestingAllocation: number,
    simulationDays: number
  ) {
    return {
      vesting: VestingDataGenerator.generateUser(userId, startTime, vestingAllocation),
      badges: BadgeDataGenerator.generateUserBadges(startTime, simulationDays),
      governance: GovernanceDataGenerator.generateVotingHistory(
        startTime,
        simulationDays,
        vestingAllocation,
        14 // Vote every 2 weeks
      ),
      streak: StreakDataGenerator.generateActivity(userId, startTime, simulationDays, 0.85),
    };
  }

  /**
   * Generate multiple user profiles for load testing
   */
  static generateUsers(
    count: number,
    baseTime: number,
    allocationRange: [number, number],
    simulationDays: number
  ) {
    const profiles = [];
    
    for (let i = 0; i < count; i++) {
      const [min, max] = allocationRange;
      const allocation = min + Math.random() * (max - min);
      
      profiles.push(
        this.generateCompleteProfile(
          `user-${i}`,
          baseTime,
          Math.floor(allocation),
          simulationDays
        )
      );
    }
    
    return profiles;
  }
}

/**
 * Snapshot generator for testing state changes
 */
export class SnapshotGenerator {
  /**
   * Generate system snapshot at specific time
   */
  static generateSnapshot(
    users: ReturnType<typeof UserProfileGenerator.generateCompleteProfile>[],
    snapshotTime: number
  ) {
    return {
      timestamp: snapshotTime,
      totalUsers: users.length,
      activeBadges: users.reduce((sum, u) => {
        return sum + BadgeDataGenerator.getActiveBadges(u.badges, snapshotTime).length;
      }, 0),
      totalBadgePoints: users.reduce((sum, u) => {
        return sum + BadgeDataGenerator.calculatePoints(u.badges, snapshotTime);
      }, 0),
      activeStreaks: users.filter(u => u.streak.currentStreak > 0).length,
      totalVotes: users.reduce((sum, u) => u.governance.length + sum, 0),
    };
  }

  /**
   * Generate multiple snapshots over time period
   */
  static generateTimeSeries(
    users: ReturnType<typeof UserProfileGenerator.generateCompleteProfile>[],
    startTime: number,
    endTime: number,
    intervalDays: number
  ) {
    const snapshots = [];
    let currentTime = startTime;

    while (currentTime <= endTime) {
      snapshots.push(this.generateSnapshot(users, currentTime));
      currentTime += intervalDays * TIME.DAY * 1000;
    }

    return snapshots;
  }
}
