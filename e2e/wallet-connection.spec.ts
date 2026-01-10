import { expect, test } from '@playwright/test'

/**
 * Wallet Connection E2E Tests
 * Tests wallet connection flows (mocked for CI)
 */
test.describe('Wallet Connection', () => {
  test('should open wallet connection modal', async ({ page }) => {
    await page.goto('/')
    
    // Click connect wallet button
    await page.click('button:has-text("Connect Wallet")')
    
    // Modal should appear
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Should show wallet options
    await expect(page.locator('text=MetaMask')).toBeVisible()
    await expect(page.locator('text=Coinbase Wallet')).toBeVisible()
    await expect(page.locator('text=WalletConnect')).toBeVisible()
  })

  test('should close wallet modal on escape', async ({ page }) => {
    await page.goto('/')
    
    // Open modal
    await page.click('button:has-text("Connect Wallet")')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Press escape
    await page.keyboard.press('Escape')
    
    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })

  test('should close modal on backdrop click', async ({ page }) => {
    await page.goto('/')
    
    // Open modal
    await page.click('button:has-text("Connect Wallet")')
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    
    // Click backdrop
    await page.locator('[data-testid="backdrop"]').click({ force: true })
    
    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })
})
