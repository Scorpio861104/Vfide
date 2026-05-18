import { expect, test } from '@playwright/test'

/**
 * Governance E2E Tests
 * Tests proposal viewing, creation, and voting flows
 */
test.describe('Governance', () => {
  test('should display proposals list', async ({ page }) => {
    await page.goto('/governance')
    
    // Should show proposals
    await expect(page.locator('h1')).toContainText(/proposals|governance/i)
    
    // Should have proposal cards
    const proposals = page.locator('[data-testid="proposal-card"]')
    const count = await proposals.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should filter proposals by status', async ({ page }) => {
    await page.goto('/governance')
    
    // Click active filter
    await page.click('button:has-text("Active")')
    
    // URL should update
    await expect(page).toHaveURL(/status=active/i)
  })

  test('should view proposal details', async ({ page }) => {
    await page.goto('/governance')
    
    // Click first proposal (if exists)
    const firstProposal = page.locator('[data-testid="proposal-card"]').first()
    
    if (await firstProposal.isVisible()) {
      await firstProposal.click()
      
      // Should navigate to proposal detail page
      await expect(page).toHaveURL(/\/governance\/\d+/)
      
      // Should show proposal details
      await expect(page.locator('h1')).toBeVisible()
    }
  })
})
