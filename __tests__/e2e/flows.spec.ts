/**
 * Sample E2E Tests for User Flows
 */

import { test, expect } from '@playwright/test';

test.describe('Badge System E2E', () => {
  test('should display badge progress page', async ({ page }) => {
    await page.goto('/badge-progress');
    
    // Check for page title
    await expect(page.locator('h1')).toContainText('Badge Progress');
    
    // Check for badge categories
    await expect(page.locator('[data-testid="badge-category"]')).toBeVisible();
  });
  
  test('should filter badges by category', async ({ page }) => {
    await page.goto('/badge-progress');
    
    // Click a category filter
    await page.click('[data-testid="filter-activity"]');
    
    // Verify filtered badges are shown
    await expect(page.locator('[data-testid="badge-card"]')).toHaveCount(6);
  });
});

test.describe('Merchant Flow E2E', () => {
  test('should navigate to merchant registration', async ({ page }) => {
    await page.goto('/merchant');
    
    // Check for merchant registration form
    await expect(page.locator('h1')).toContainText('Merchant');
  });
});

test.describe('Social Features E2E', () => {
  test('should display social hub', async ({ page }) => {
    await page.goto('/social');
    
    // Check for social tabs
    await expect(page.locator('[data-testid="social-tabs"]')).toBeVisible();
  });
});
