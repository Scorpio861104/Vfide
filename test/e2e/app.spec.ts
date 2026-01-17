import { expect, test } from '@playwright/test';

test.describe('Wallet Connection E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display wallet connection modal', async ({ page }) => {
    // Click connect wallet button
    await page.click('button:has-text("Connect Wallet")');
    
    // Check if modal appears
    await expect(page.locator('text=Connect a Wallet')).toBeVisible();
    
    // Check if wallet options are visible
    await expect(page.locator('text=MetaMask')).toBeVisible();
    await expect(page.locator('text=Coinbase Wallet')).toBeVisible();
    await expect(page.locator('text=Browser Wallet')).toBeVisible();
  });

  test('should navigate between pages', async ({ page }) => {
    // Test navigation
    await page.click('a[href="/transfer"]');
    await expect(page).toHaveURL(/.*transfer/);
    
    await page.click('a[href="/stake"]');
    await expect(page).toHaveURL(/.*stake/);
    
    await page.click('a[href="/governance"]');
    await expect(page).toHaveURL(/.*governance/);
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check if mobile menu toggle is visible
    const mobileMenu = page.locator('[aria-label="Mobile menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('nav')).toBeVisible();
    }
  });

  test('should have accessible color contrast', async ({ page }) => {
    // This is a placeholder - actual accessibility testing
    // would use axe-core or similar
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Transfer Page E2E Tests', () => {
  test('should load transfer page', async ({ page }) => {
    await page.goto('/transfer');
    await expect(page.locator('h1, h2').first()).toContainText(/transfer/i);
  });

  test('should display transfer form fields', async ({ page }) => {
    await page.goto('/transfer');
    
    // Check for form elements
    const amountInput = page.locator('input[type="text"], input[type="number"]').first();
    await expect(amountInput).toBeVisible();
  });
});

test.describe('Staking Page E2E Tests', () => {
  test('should load staking page', async ({ page }) => {
    await page.goto('/stake');
    await expect(page.locator('h1, h2').first()).toContainText(/stak/i);
  });

  test('should display staking options', async ({ page }) => {
    await page.goto('/stake');
    
    // Check for staking interface elements
    const stakingContainer = page.locator('main');
    await expect(stakingContainer).toBeVisible();
  });
});

test.describe('Governance Page E2E Tests', () => {
  test('should load governance page', async ({ page }) => {
    await page.goto('/governance');
    await expect(page.locator('h1, h2').first()).toContainText(/governance/i);
  });
});

test.describe('Performance Tests', () => {
  test('should load homepage quickly', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Homepage should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('should have no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors (like wallet connection failures in test env)
    const criticalErrors = errors.filter(
      (error) => !error.includes('wallet') && !error.includes('MetaMask')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});
