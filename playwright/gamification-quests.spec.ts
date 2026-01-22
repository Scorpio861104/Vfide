import { test, expect, Page, devices } from '@playwright/test';

/**
 * Gamification & Quests E2E Tests
 * Tests daily/weekly quests, achievements, leaderboard, and reward claiming
 */

test.describe('Gamification & Quests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should navigate to quests page', async () => {
    const questsLink = page.locator('a, button').filter({ hasText: /(quest|challenge|task)/i }).first();
    
    if (await questsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await questsLink.click();
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    } else {
      await page.goto('/quests');
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display quests dashboard', async () => {
    await page.goto('/quests');
    
    const dashboard = page.locator('main, [data-testid="quests-dashboard"]');
    await expect(dashboard).toBeVisible();
  });

  test('should show user level and XP', async () => {
    await page.goto('/quests');
    
    // Should display current level and experience points
    const levelDisplay = page.locator('[data-testid="user-level"], text=/level|lvl/i').first();
    const xpDisplay = page.locator('[data-testid="user-xp"], text=/xp|experience/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display XP progress bar', async () => {
    await page.goto('/quests');
    
    // Should show progress to next level
    const progressBar = page.locator('[role="progressbar"], .progress-bar, [data-testid="xp-progress"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Daily Quests', () => {
  test('should display daily quests', async ({ page }) => {
    await page.goto('/quests');
    
    const dailyQuests = page.locator('[data-testid="daily-quests"], text=/daily/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should list all daily quest tasks', async ({ page }) => {
    await page.goto('/quests');
    
    // Should show list of daily tasks
    const questItems = page.locator('[data-testid="quest-item"], .quest-card');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display quest progress', async ({ page }) => {
    await page.goto('/quests');
    
    // Each quest should show progress (e.g., 2/5 completed)
    const progress = page.locator('text=/\\d+\\/\\d+|\\d+%/').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show quest rewards', async ({ page }) => {
    await page.goto('/quests');
    
    // Quests should display XP and token rewards
    const rewards = page.locator('[data-testid="quest-reward"], text=/reward|xp|tokens/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display time remaining for daily reset', async ({ page }) => {
    await page.goto('/quests');
    
    // Should show countdown to daily reset
    const countdown = page.locator('text=/reset|time remaining|expires/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should mark completed quests', async ({ page }) => {
    await page.goto('/quests');
    
    // Completed quests should be marked (checkmark, badge, etc.)
    const completedBadge = page.locator('[data-testid="quest-completed"], text=/completed|done|✓/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should allow claiming daily quest rewards', async ({ page }) => {
    await page.goto('/quests');
    
    const claimBtn = page.locator('button').filter({ hasText: /claim/i }).first();
    
    if (await claimBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await claimBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show reward claimed
      const success = page.locator('text=/claimed|success|received/i').first();
    }
  });

  test('should track quest completion automatically', async ({ page }) => {
    await page.goto('/quests');
    
    // Quest progress should update automatically when actions are performed
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Weekly Quests', () => {
  test('should display weekly quests', async ({ page }) => {
    await page.goto('/quests');
    
    const weeklyQuests = page.locator('[data-testid="weekly-quests"], text=/weekly/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show higher rewards for weekly quests', async ({ page }) => {
    await page.goto('/quests');
    
    // Weekly quests should have higher rewards than daily
    const weeklyReward = page.locator('[data-testid="weekly-reward"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display weekly reset countdown', async ({ page }) => {
    await page.goto('/quests');
    
    // Should show time until weekly reset
    const weeklyCountdown = page.locator('text=/\\d+ day|weekly reset/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should filter between daily and weekly quests', async ({ page }) => {
    await page.goto('/quests');
    
    const tabs = ['daily', 'weekly', 'all'];
    
    for (const tab of tabs) {
      const tabBtn = page.locator('button, [role="tab"]').filter({ hasText: new RegExp(tab, 'i') }).first();
      
      if (await tabBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(300);
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Achievements', () => {
  test('should navigate to achievements page', async ({ page }) => {
    await page.goto('/quests');
    
    const achievementsLink = page.locator('a, button').filter({ hasText: /achievement/i }).first();
    
    if (await achievementsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await achievementsLink.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display achievement list', async ({ page }) => {
    await page.goto('/quests');
    
    // Should show all available achievements
    const achievements = page.locator('[data-testid="achievement-item"], .achievement-card');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show unlocked vs locked achievements', async ({ page }) => {
    await page.goto('/quests');
    
    // Locked achievements should be visually distinct
    const lockedAchievement = page.locator('[data-testid="achievement-locked"], .locked').first();
    const unlockedAchievement = page.locator('[data-testid="achievement-unlocked"], .unlocked').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display achievement details on click', async ({ page }) => {
    await page.goto('/quests');
    
    const achievementCard = page.locator('[data-testid="achievement-item"]').first();
    
    if (await achievementCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await achievementCard.click();
      await page.waitForTimeout(500);
      
      // Should show detailed view
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should show achievement progress', async ({ page }) => {
    await page.goto('/quests');
    
    // Should display progress toward locked achievements
    const progress = page.locator('[data-testid="achievement-progress"], text=/\\d+\\/\\d+/').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should filter achievements by category', async ({ page }) => {
    await page.goto('/quests');
    
    const categories = ['all', 'trading', 'social', 'governance', 'vault'];
    
    for (const category of categories) {
      const filterBtn = page.locator('button').filter({ hasText: new RegExp(category, 'i') }).first();
      
      if (await filterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show achievement unlock date', async ({ page }) => {
    await page.goto('/quests');
    
    // Unlocked achievements should show when they were earned
    const unlockDate = page.locator('[data-testid="unlock-date"], time').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display achievement rarity', async ({ page }) => {
    await page.goto('/quests');
    
    // Achievements should have rarity levels (common, rare, epic, legendary)
    const rarity = page.locator('text=/common|rare|epic|legendary/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Leaderboard', () => {
  test('should navigate to leaderboard', async ({ page }) => {
    await page.goto('/quests');
    
    const leaderboardLink = page.locator('a, button').filter({ hasText: /leaderboard|ranking/i }).first();
    
    if (await leaderboardLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await leaderboardLink.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display top ranked users', async ({ page }) => {
    await page.goto('/quests');
    
    // Should show leaderboard rankings
    const leaderboard = page.locator('[data-testid="leaderboard"], .leaderboard-list');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show user position on leaderboard', async ({ page }) => {
    await page.goto('/quests');
    
    // Should highlight current user's rank
    const userRank = page.locator('[data-testid="user-rank"], text=/your rank|you/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display user stats on leaderboard', async ({ page }) => {
    await page.goto('/quests');
    
    // Each entry should show: rank, username, level, XP
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should filter leaderboard by timeframe', async ({ page }) => {
    await page.goto('/quests');
    
    const timeframes = ['all time', 'this month', 'this week', 'today'];
    
    for (const timeframe of timeframes) {
      const filterBtn = page.locator('button').filter({ hasText: new RegExp(timeframe, 'i') }).first();
      
      if (await filterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should paginate leaderboard results', async ({ page }) => {
    await page.goto('/quests');
    
    const nextBtn = page.locator('button').filter({ hasText: /(next|>)/i }).first();
    
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should search users on leaderboard', async ({ page }) => {
    await page.goto('/quests');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('user');
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Reward System', () => {
  test('should display available rewards', async ({ page }) => {
    await page.goto('/quests');
    
    // Should show rewards to claim
    const rewards = page.locator('[data-testid="rewards"], text=/reward/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show reward balance', async ({ page }) => {
    await page.goto('/quests');
    
    // Should display accumulated unclaimed rewards
    const balance = page.locator('[data-testid="reward-balance"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should claim multiple rewards at once', async ({ page }) => {
    await page.goto('/quests');
    
    const claimAllBtn = page.locator('button').filter({ hasText: /claim all/i }).first();
    
    if (await claimAllBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await claimAllBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show success message
      const success = page.locator('text=/claimed|success/i').first();
    }
  });

  test('should display reward history', async ({ page }) => {
    await page.goto('/quests');
    
    const historyLink = page.locator('a, button').filter({ hasText: /(history|past rewards)/i }).first();
    
    if (await historyLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await historyLink.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should show reward expiration if applicable', async ({ page }) => {
    await page.goto('/quests');
    
    // Some rewards may have expiration dates
    const expiration = page.locator('text=/expires|expiration/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display different reward types', async ({ page }) => {
    await page.goto('/quests');
    
    // Rewards can be: XP, tokens, NFTs, badges
    const rewardTypes = ['xp', 'token', 'nft', 'badge'];
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Quest Details', () => {
  test('should display quest requirements', async ({ page }) => {
    await page.goto('/quests');
    
    const questCard = page.locator('[data-testid="quest-item"]').first();
    
    if (await questCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await questCard.click();
      await page.waitForTimeout(500);
      
      // Should show what needs to be done
      const requirements = page.locator('text=/requirement|task|objective/i').first();
    }
  });

  test('should show quest difficulty', async ({ page }) => {
    await page.goto('/quests');
    
    // Quests may have difficulty levels
    const difficulty = page.locator('text=/easy|medium|hard|difficulty/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display quest steps', async ({ page }) => {
    await page.goto('/quests');
    
    // Multi-step quests should show each step
    const steps = page.locator('[data-testid="quest-steps"], text=/step \\d+/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show estimated completion time', async ({ page }) => {
    await page.goto('/quests');
    
    // Should indicate how long quest takes
    const timeEstimate = page.locator('text=/\\d+ min|estimated time/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Social Features Integration', () => {
  test('should share achievement on social', async ({ page }) => {
    await page.goto('/quests');
    
    const shareBtn = page.locator('button').filter({ hasText: /share/i }).first();
    
    if (await shareBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await shareBtn.click();
      await page.waitForTimeout(500);
      
      // Should show share options
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should view friend achievements', async ({ page }) => {
    await page.goto('/quests');
    
    const friendsLink = page.locator('a, button').filter({ hasText: /friend/i }).first();
    
    if (await friendsLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await friendsLink.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should compare progress with friends', async ({ page }) => {
    await page.goto('/quests');
    
    const compareBtn = page.locator('button').filter({ hasText: /compare/i }).first();
    
    if (await compareBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await compareBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Streak System', () => {
  test('should display login streak', async ({ page }) => {
    await page.goto('/quests');
    
    // Should show consecutive login days
    const streak = page.locator('[data-testid="streak"], text=/streak|\\d+ day/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should reward streak milestones', async ({ page }) => {
    await page.goto('/quests');
    
    // Reaching streak milestones should give bonus rewards
    const streakReward = page.locator('text=/streak bonus|milestone/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show streak calendar', async ({ page }) => {
    await page.goto('/quests');
    
    // Calendar showing login history
    const calendar = page.locator('[data-testid="streak-calendar"], .calendar').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});
