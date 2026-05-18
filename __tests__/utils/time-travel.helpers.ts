/**
 * Time Travel Utilities for Testing Time-Dependent Features
 * 
 * This module provides utilities to simulate time progression in tests
 * for features like vesting schedules, badge expirations, and streaks.
 */

/**
 * Time constants for easier test readability
 */
export const TIME = {
  SECOND: 1,
  MINUTE: 60,
  HOUR: 60 * 60,
  DAY: 24 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  MONTH_30: 30 * 24 * 60 * 60,
  MONTH_60: 60 * 24 * 60 * 60, // Bi-monthly for vesting
  YEAR: 365 * 24 * 60 * 60,
  YEAR_3: 3 * 365 * 24 * 60 * 60, // 3-year vesting period
} as const;

/**
 * Mock Date class for time travel in frontend tests
 */
export class MockDate {
  private static currentTime: number = Date.now();
  private static originalDate: DateConstructor = Date;

  /**
   * Install the mock Date
   */
  static install(startTime?: number): void {
    MockDate.currentTime = startTime || Date.now();
    
    // Store original Date
    MockDate.originalDate = global.Date;

    // Replace global Date
    global.Date = class extends MockDate.originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(MockDate.currentTime);
        } else {
          super(...args);
        }
      }

      static now(): number {
        return MockDate.currentTime;
      }
    } as DateConstructor;
  }

  /**
   * Uninstall the mock Date
   */
  static uninstall(): void {
    global.Date = MockDate.originalDate;
  }

  /**
   * Advance time by specified seconds
   */
  static travel(seconds: number): void {
    MockDate.currentTime += seconds * 1000;
  }

  /**
   * Travel to specific timestamp
   */
  static travelTo(timestamp: number): void {
    MockDate.currentTime = timestamp;
  }

  /**
   * Travel to specific date
   */
  static travelToDate(date: Date): void {
    MockDate.currentTime = date.getTime();
  }

  /**
   * Reset to current real time
   */
  static reset(): void {
    MockDate.currentTime = MockDate.originalDate.now();
  }

  /**
   * Get current mocked time
   */
  static getCurrentTime(): number {
    return MockDate.currentTime;
  }
}

/**
 * Time travel helpers for vesting schedule testing
 */
export class VestingTimeTravel {
  private startTime: number;
  private cliffDays: number = 60;
  private vestingMonths: number = 36;
  private milestoneDays: number = 60;

  constructor(startTime?: number) {
    this.startTime = startTime || Date.now();
  }

  /**
   * Get time after cliff period
   */
  afterCliff(): number {
    return this.startTime + this.cliffDays * TIME.DAY * 1000;
  }

  /**
   * Get time at specific milestone (1-48)
   */
  atMilestone(milestone: number): number {
    if (milestone < 1 || milestone > 48) {
      throw new Error('Milestone must be between 1 and 48');
    }
    // Milestone 1 is at cliff + one milestone period
    return this.startTime + (this.cliffDays + milestone * this.milestoneDays) * TIME.DAY * 1000;
  }

  /**
   * Get time at vesting completion
   */
  atCompletion(): number {
    return this.atMilestone(48);
  }

  /**
   * Calculate percentage vested at given time
   */
  percentageVestedAt(time: number): number {
    const cliffTime = this.afterCliff();
    
    if (time < cliffTime) {
      return 0;
    }
    
    const completionTime = this.atCompletion();
    if (time >= completionTime) {
      return 100;
    }

    // Vesting starts after cliff and continues linearly until completion
    const totalDuration = completionTime - cliffTime;
    const elapsed = time - cliffTime;
    return Math.floor((elapsed / totalDuration) * 100);
  }

  /**
   * Get all milestone timestamps
   */
  getAllMilestones(): number[] {
    return Array.from({ length: 48 }, (_, i) => this.atMilestone(i + 1));
  }
}

/**
 * Time travel helpers for badge duration testing
 */
export class BadgeTimeTravel {
  /**
   * Test if badge should be expired at given time
   */
  static isBadgeExpired(awardTime: number, duration: number, currentTime: number): boolean {
    if (duration === 0) {
      return false; // Permanent badge
    }
    return currentTime >= awardTime + duration * 1000;
  }

  /**
   * Get expiration time for badge
   */
  static getExpirationTime(awardTime: number, duration: number): number {
    if (duration === 0) {
      return Infinity; // Never expires
    }
    return awardTime + duration * 1000;
  }

  /**
   * Get time remaining until expiration
   */
  static getTimeRemaining(awardTime: number, duration: number, currentTime: number): number {
    if (duration === 0) {
      return Infinity;
    }
    const expirationTime = BadgeTimeTravel.getExpirationTime(awardTime, duration);
    return Math.max(0, expirationTime - currentTime);
  }
}

describe('time travel helpers', () => {
  it('advances time correctly', () => {
    const start = Date.now();
    MockDate.install(start);
    MockDate.travel(TIME.DAY);
    expect(MockDate.getCurrentTime()).toBe(start + TIME.DAY * 1000);
    MockDate.uninstall();
  });
});

/**
 * Time travel helpers tests
 */
describe('time travel helpers', () => {
  it('calculates time remaining', () => {
    const awardTime = 0;
    const duration = 10;
    const currentTime = 5 * 1000;

    expect(BadgeTimeTravel.getTimeRemaining(awardTime, duration, currentTime)).toBe(5000);
  });
});

/**
 * Time travel helpers for streak tracking
 */
export class StreakTimeTravel {
  /**
   * Check if two dates are consecutive days
   */
  static areConsecutiveDays(date1: Date, date2: Date): boolean {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Reset time to midnight
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays === 1;
  }

  /**
   * Check if date is today
   */
  static isToday(date: Date, currentTime: number): boolean {
    const d = new Date(date);
    const now = new Date(currentTime);
    
    return d.getDate() === now.getDate() &&
           d.getMonth() === now.getMonth() &&
           d.getFullYear() === now.getFullYear();
  }

  /**
   * Check if date is yesterday
   */
  static isYesterday(date: Date, currentTime: number): boolean {
    const yesterday = new Date(currentTime);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const d = new Date(date);
    return d.getDate() === yesterday.getDate() &&
           d.getMonth() === yesterday.getMonth() &&
           d.getFullYear() === yesterday.getFullYear();
  }

  /**
   * Generate sequence of daily activity dates
   */
  static generateDailySequence(startTime: number, days: number): Date[] {
    const dates: Date[] = [];
    for (let i = 0; i < days; i++) {
      dates.push(new Date(startTime + i * TIME.DAY * 1000));
    }
    return dates;
  }

  /**
   * Generate sequence with gaps (for testing streak breaks)
   */
  static generateSequenceWithGaps(startTime: number, pattern: number[]): Date[] {
    const dates: Date[] = [];
    let currentTime = startTime;
    
    for (const daysToAdd of pattern) {
      currentTime += daysToAdd * TIME.DAY * 1000;
      dates.push(new Date(currentTime));
    }
    
    return dates;
  }
}

/**
 * Time travel helpers for timelock testing
 */
export class TimelockTimeTravel {
  /**
   * Get unlock time for timelock
   */
  static getUnlockTime(lockTime: number, delaySeconds: number): number {
    return lockTime + delaySeconds * 1000;
  }

  /**
   * Check if timelock is unlocked
   */
  static isUnlocked(lockTime: number, delaySeconds: number, currentTime: number): boolean {
    return currentTime >= TimelockTimeTravel.getUnlockTime(lockTime, delaySeconds);
  }

  /**
   * Get time remaining until unlock
   */
  static getTimeRemaining(lockTime: number, delaySeconds: number, currentTime: number): number {
    const unlockTime = TimelockTimeTravel.getUnlockTime(lockTime, delaySeconds);
    return Math.max(0, unlockTime - currentTime);
  }
}

/**
 * Blockchain time manipulation utilities
 * For use with Hardhat or Ganache in integration tests
 */
export class BlockchainTime {
  /**
   * Increase time on blockchain (for use with hardhat/ganache)
   * @param provider - ethers provider
   * @param seconds - seconds to increase
   */
  static async increase(provider: any, seconds: number): Promise<void> {
    await provider.send('evm_increaseTime', [seconds]);
    await provider.send('evm_mine', []);
  }

  /**
   * Set blockchain time to specific timestamp
   * @param provider - ethers provider
   * @param timestamp - unix timestamp in seconds
   */
  static async setTime(provider: any, timestamp: number): Promise<void> {
    await provider.send('evm_setNextBlockTimestamp', [timestamp]);
    await provider.send('evm_mine', []);
  }

  /**
   * Mine blocks
   * @param provider - ethers provider
   * @param blocks - number of blocks to mine
   */
  static async mineBlocks(provider: any, blocks: number): Promise<void> {
    for (let i = 0; i < blocks; i++) {
      await provider.send('evm_mine', []);
    }
  }

  /**
   * Get current blockchain timestamp
   * @param provider - ethers provider
   */
  static async getTimestamp(provider: any): Promise<number> {
    const block = await provider.getBlock('latest');
    return block.timestamp;
  }

  /**
   * Take snapshot of blockchain state
   * @param provider - ethers provider
   */
  static async snapshot(provider: any): Promise<string> {
    return await provider.send('evm_snapshot', []);
  }

  /**
   * Restore blockchain state from snapshot
   * @param provider - ethers provider
   * @param snapshotId - snapshot ID to restore
   */
  static async restore(provider: any, snapshotId: string): Promise<void> {
    await provider.send('evm_revert', [snapshotId]);
  }
}

/**
 * Test scenario builder for time-dependent features
 */
export class TimeScenarioBuilder {
  private steps: Array<{ description: string; time: number; action?: () => void }> = [];
  private startTime: number;

  constructor(startTime?: number) {
    this.startTime = startTime || Date.now();
  }

  /**
   * Add a step to the scenario
   */
  addStep(description: string, secondsFromStart: number, action?: () => void): this {
    this.steps.push({
      description,
      time: this.startTime + secondsFromStart * 1000,
      action,
    });
    return this;
  }

  /**
   * Execute all steps in the scenario
   */
  async execute(timeTravel: (time: number) => void | Promise<void>): Promise<void> {
    for (const step of this.steps) {
      console.log(`[Time Travel] ${step.description} at ${new Date(step.time).toISOString()}`);
      await timeTravel(step.time);
      if (step.action) {
        step.action();
      }
    }
  }

  /**
   * Get all steps
   */
  getSteps() {
    return this.steps;
  }
}

/**
 * Utility to format time durations for test output
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)}h`;
  }
  if (seconds < 2592000) {
    return `${Math.floor(seconds / 86400)}d`;
  }
  return `${Math.floor(seconds / 2592000)}mo`;
}

/**
 * Generate test data for various time periods
 */
export const TEST_PERIODS = {
  // Badge durations
  BADGE_90_DAYS: 90 * TIME.DAY,
  BADGE_180_DAYS: 180 * TIME.DAY,
  BADGE_365_DAYS: 365 * TIME.DAY,
  
  // Vesting periods
  VESTING_CLIFF: 60 * TIME.DAY,
  VESTING_MILESTONE: 60 * TIME.DAY,
  VESTING_TOTAL: 36 * 30 * TIME.DAY,
  
  // Timelock delays
  TIMELOCK_1_HOUR: TIME.HOUR,
  TIMELOCK_6_HOURS: 6 * TIME.HOUR,
  TIMELOCK_24_HOURS: 24 * TIME.HOUR,
  
  // Streak tracking
  STREAK_7_DAYS: 7 * TIME.DAY,
  STREAK_30_DAYS: 30 * TIME.DAY,
} as const;

describe('time-travel helpers', () => {
  it('formats duration in seconds', () => {
    expect(formatDuration(30)).toBe('30s');
  });
});
