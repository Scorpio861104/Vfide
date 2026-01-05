import { test, expect } from '@playwright/test';

test.describe('Homepage E2E Tests', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VFIDE|Vfide/i);
    await expect(page.locator('main')).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should render hero section', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('h1');
    await expect(hero).toBeVisible();
  });
});

test.describe('Navigation E2E Tests', () => {
  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    
    // Click on vault link if exists
    const vaultLink = page.locator('a[href*="vault"]').first();
    if (await vaultLink.isVisible()) {
      await vaultLink.click();
      await expect(page).toHaveURL(/vault/);
    }
  });
});

test.describe('Wallet Connection Tests', () => {
  test('should have connect wallet button', async ({ page }) => {
    await page.goto('/');
    
    // Look for web3 connect button
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    if (await connectBtn.isVisible()) {
      await expect(connectBtn).toBeEnabled();
    }
  });
});
