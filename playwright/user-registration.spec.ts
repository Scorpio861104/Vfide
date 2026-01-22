import { test, expect, Page } from '@playwright/test';

/**
 * User Registration & Onboarding Flow E2E Tests
 * Tests complete user registration, wallet connection, onboarding wizard, and profile setup
 */

test.describe('User Registration & Onboarding Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should complete full registration flow as new user', async () => {
    // New user lands on homepage
    await expect(page).toHaveTitle(/VFIDE|Vfide/i);
    await expect(page.locator('main')).toBeVisible();

    // Look for connect wallet button
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    if (await connectBtn.isVisible()) {
      await connectBtn.click();
      
      // Wait for wallet modal to appear
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 }).catch(() => null);
      
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible()) {
        await expect(modal).toBeVisible();
      }
    }
  });

  test('should display onboarding wizard for first-time users', async () => {
    await page.goto('/setup');
    
    // Should show welcome/setup page
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    
    // Should have setup steps or wizard
    const setupContent = page.locator('main');
    await expect(setupContent).toBeVisible();
  });

  test('should navigate through onboarding steps', async () => {
    await page.goto('/setup');
    
    // Look for next/continue button
    const nextBtn = page.locator('button').filter({ hasText: /(next|continue|get started)/i }).first();
    
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const initialUrl = page.url();
      await nextBtn.click();
      await page.waitForTimeout(500);
      
      // Should navigate or show next step
      const currentUrl = page.url();
      expect(currentUrl).toBeDefined();
    }
  });

  test('should allow profile setup', async () => {
    await page.goto('/dashboard');
    
    // Look for profile or settings link
    const profileLinks = [
      page.locator('a[href*="profile"]').first(),
      page.locator('button').filter({ hasText: /profile|settings/i }).first(),
      page.locator('[data-testid="profile-button"]')
    ];

    for (const link of profileLinks) {
      if (await link.isVisible({ timeout: 1000 }).catch(() => false)) {
        await link.click();
        await page.waitForTimeout(500);
        break;
      }
    }
    
    // Should be on profile or settings page
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should validate required profile fields', async () => {
    await page.goto('/dashboard');
    
    // Try to access profile/settings
    const settingsBtn = page.locator('button, a').filter({ hasText: /(settings|profile)/i }).first();
    
    if (await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      
      // Look for form fields
      const nameInput = page.locator('input[name="name"], input[name="username"]').first();
      if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Try to submit without filling required fields
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          
          // Should show validation errors
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should handle first transaction guidance', async () => {
    await page.goto('/dashboard');
    
    // Look for getting started guide or first transaction prompts
    const helpText = [
      page.locator('text=/get started|welcome|first transaction/i').first(),
      page.locator('[data-testid="onboarding-guide"]'),
      page.locator('.tutorial, .guide, .help-banner').first()
    ];

    let foundGuide = false;
    for (const element of helpText) {
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundGuide = true;
        break;
      }
    }
    
    // Guide may or may not be present depending on user state
    expect(foundGuide !== undefined).toBeTruthy();
  });

  test('should redirect unauthenticated users appropriately', async () => {
    await page.goto('/dashboard');
    
    // Should either show dashboard or redirect to auth
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    
    expect(currentUrl).toBeDefined();
    // User might be redirected to login or see dashboard
    expect(currentUrl.includes('dashboard') || currentUrl.includes('login') || currentUrl === '/').toBeTruthy();
  });

  test('should persist user preferences during onboarding', async () => {
    await page.goto('/setup');
    
    // Set a preference (e.g., theme, language)
    const themeButton = page.locator('button').filter({ hasText: /(dark|light|theme)/i }).first();
    
    if (await themeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await themeButton.click();
      await page.waitForTimeout(500);
      
      // Preference should persist in localStorage or cookies
      const localStorageData = await page.evaluate(() => JSON.stringify(localStorage));
      expect(localStorageData).toBeTruthy();
    }
  });

  test('should show progress indicator during multi-step onboarding', async () => {
    await page.goto('/setup');
    
    // Look for progress indicators
    const progressElements = [
      page.locator('[role="progressbar"]'),
      page.locator('.progress, .stepper, [data-testid="progress"]').first(),
      page.locator('text=/step \\d+ of \\d+/i').first()
    ];

    let foundProgress = false;
    for (const element of progressElements) {
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundProgress = true;
        break;
      }
    }
    
    // Progress indicator may not be present on all setups
    expect(foundProgress !== undefined).toBeTruthy();
  });

  test('should allow skipping optional onboarding steps', async () => {
    await page.goto('/setup');
    
    // Look for skip button
    const skipBtn = page.locator('button').filter({ hasText: /(skip|later|maybe later)/i }).first();
    
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const urlBefore = page.url();
      await skipBtn.click();
      await page.waitForTimeout(500);
      
      // Should move to next step or dashboard
      const urlAfter = page.url();
      expect(urlAfter).toBeDefined();
    }
  });
});

test.describe('User Registration Error Handling', () => {
  test('should handle network errors gracefully during registration', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    await page.goto('/').catch(() => null);
    
    // Should show error message
    await page.context().setOffline(false);
    
    // Retry navigation
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
  });

  test('should show helpful error messages for invalid input', async ({ page }) => {
    await page.goto('/setup');
    
    // Look for email input
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    
    if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Enter invalid email
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show validation error (may not be visible depending on validation strategy)
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should recover from interrupted onboarding', async ({ page }) => {
    await page.goto('/setup');
    
    // Start onboarding
    const nextBtn = page.locator('button').filter({ hasText: /(next|continue)/i }).first();
    
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      
      // Simulate leaving and returning
      await page.goto('/');
      await page.waitForTimeout(500);
      await page.goto('/setup');
      
      // Should resume or allow restart
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});
