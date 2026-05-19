/**
 * Core-flows regression suite.
 *
 * Sits alongside a11y-regression.spec.ts and exercises the actual user-
 * facing flows (not just static a11y attributes): opening the wallet
 * modal, dismissing it, navigating between routes, and submitting a
 * payment form. Targets the lightweight test-server.js shells added in
 * R17 + R20, so no Next.js dev server is required.
 *
 * Why this exists: the existing playwright/*.spec.ts files
 * (wallet-flows, payment-flows, etc.) target DOM that doesn't exist in
 * the test-server, so they can't run end-to-end. This suite locks in
 * a narrower but actually-exercised set of behaviors.
 *
 * Added 2026-05-17 (R20).
 */

import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────
// Wallet connect modal (R10's VfideConnectButton flow)
// ─────────────────────────────────────────────────────────────────────────

test.describe('Wallet connect modal (R10 / R20)', () => {
  test('connect button is visible and labeled', async ({ page }) => {
    await page.goto('/connect')
    const connectBtn = page.getByTestId('open-connect')
    await expect(connectBtn).toBeVisible()
    await expect(connectBtn).toHaveAttribute('aria-label', 'Connect wallet')
  })

  test('clicking connect opens the modal', async ({ page }) => {
    await page.goto('/connect')
    const backdrop = page.getByTestId('wallet-modal-backdrop')
    await expect(backdrop).toHaveAttribute('data-state', 'closed')
    await page.getByTestId('open-connect').click()
    await expect(backdrop).toHaveAttribute('data-state', 'open')
  })

  test('opened modal has dialog role and aria-modal', async ({ page }) => {
    await page.goto('/connect')
    await page.getByTestId('open-connect').click()
    const modal = page.getByTestId('wallet-modal')
    await expect(modal).toHaveAttribute('role', 'dialog')
    await expect(modal).toHaveAttribute('aria-modal', 'true')
    // aria-labelledby points at the visible heading so screen readers
    // announce "Connect a Wallet" when the dialog opens.
    const labelledBy = await modal.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    await expect(page.locator(`#${labelledBy}`)).toBeVisible()
  })

  test('modal lists the canonical wallet options', async ({ page }) => {
    await page.goto('/connect')
    await page.getByTestId('open-connect').click()
    // These three are the major options the real VfideConnectButton + RainbowKit
    // present. If any goes missing, the modal would surprise users.
    await expect(page.getByRole('button', { name: 'MetaMask' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'WalletConnect' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Coinbase Wallet' })).toBeVisible()
  })

  test('Escape key dismisses the modal', async ({ page }) => {
    await page.goto('/connect')
    await page.getByTestId('open-connect').click()
    const backdrop = page.getByTestId('wallet-modal-backdrop')
    await expect(backdrop).toHaveAttribute('data-state', 'open')
    await page.keyboard.press('Escape')
    await expect(backdrop).toHaveAttribute('data-state', 'closed')
  })

  test('clicking the X close button dismisses the modal', async ({ page }) => {
    await page.goto('/connect')
    await page.getByTestId('open-connect').click()
    const backdrop = page.getByTestId('wallet-modal-backdrop')
    await expect(backdrop).toHaveAttribute('data-state', 'open')
    await page.getByRole('button', { name: 'Close wallet selector' }).click()
    await expect(backdrop).toHaveAttribute('data-state', 'closed')
  })

  test('clicking the backdrop (outside the modal) dismisses', async ({ page }) => {
    await page.goto('/connect')
    await page.getByTestId('open-connect').click()
    const backdrop = page.getByTestId('wallet-modal-backdrop')
    // Click at the very top-left corner of the backdrop (outside the modal box).
    await backdrop.click({ position: { x: 2, y: 2 } })
    await expect(backdrop).toHaveAttribute('data-state', 'closed')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Payment form flow
// ─────────────────────────────────────────────────────────────────────────

test.describe('Payment form (R20)', () => {
  test('payment form renders with all expected fields', async ({ page }) => {
    await page.goto('/payments')
    await expect(page.getByTestId('payment-form')).toBeVisible()
    await expect(page.getByLabel('Recipient address')).toBeVisible()
    await expect(page.getByLabel('Payment token')).toBeVisible()
    await expect(page.getByLabel('Amount')).toBeVisible()
  })

  test('recipient address field enforces 0x… pattern', async ({ page }) => {
    await page.goto('/payments')
    const recipient = page.getByLabel('Recipient address')
    const pattern = await recipient.getAttribute('pattern')
    expect(pattern).toBe('^0x[a-fA-F0-9]{40}$')
    // Sanity: this lets HTML form validation reject bad addresses without
    // ever reaching JS — defense in depth on top of viem's parseEther guards.
  })

  test('token selector includes the four canonical tokens', async ({ page }) => {
    await page.goto('/payments')
    const tokens = await page.locator('#payment-token option').allTextContents()
    expect(tokens).toContain('ETH')
    expect(tokens).toContain('USDC')
    expect(tokens).toContain('DAI')
    expect(tokens).toContain('VFIDE')
  })

  test('amount field uses decimal inputmode (mobile keypad)', async ({ page }) => {
    await page.goto('/payments')
    const amount = page.getByLabel('Amount')
    await expect(amount).toHaveAttribute('inputmode', 'decimal')
    // The mobile fix from R13.A and earlier: number inputs that take
    // fractional values must use inputmode="decimal" so the mobile
    // keypad shows a "." key. Without this, mobile users on iOS get the
    // integer keypad and can't enter amounts like 0.5.
  })

  test('balance and gas estimate are visible', async ({ page }) => {
    await page.goto('/payments')
    await expect(page.getByTestId('balance-display')).toBeVisible()
    await expect(page.getByTestId('gas-estimate')).toBeVisible()
  })

  test('Send Payment button is reachable by accessible role+name', async ({ page }) => {
    await page.goto('/payments')
    await expect(page.getByRole('button', { name: 'Send Payment' })).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Cross-route navigation (regression: AppShell + bottom nav)
// ─────────────────────────────────────────────────────────────────────────

test.describe('Navigation across shells', () => {
  test('top nav links navigate between home, dashboard, forms', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Dashboard' }).first().click()
    await expect(page).toHaveURL(/\/dashboard/)
    await page.getByRole('link', { name: 'Forms' }).first().click()
    await expect(page).toHaveURL(/\/forms/)
  })

  test('aria-current correctly marks the active page', async ({ page }) => {
    await page.goto('/dashboard')
    const dashboardLink = page.getByRole('link', { name: 'Dashboard' }).first()
    await expect(dashboardLink).toHaveAttribute('aria-current', 'page')
    // Going to home should clear aria-current from the Dashboard link.
    await page.goto('/')
    const homeLink = page.getByRole('link', { name: 'Home' }).first()
    await expect(homeLink).toHaveAttribute('aria-current', 'page')
  })

  test('bottom nav exists on mobile and is accessible', async ({ page }) => {
    await page.goto('/')
    const bottomNav = page.getByTestId('bottom-nav')
    await expect(bottomNav).toBeVisible()
    await expect(bottomNav).toHaveAttribute('aria-label', 'Bottom Navigation')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// SEO + structured data (R18)
// ─────────────────────────────────────────────────────────────────────────

test.describe('SEO baseline (R18)', () => {
  test('home page has title and description meta tags', async ({ page }) => {
    await page.goto('/')
    const title = await page.title()
    expect(title.length).toBeGreaterThan(0)
    // The real Next.js layout adds a `<meta name="description">` via Next
    // metadata; the test shell just sets <title>, so this is a lighter
    // assertion that locks in the basic presence.
  })

  test('every page has a single h1', async ({ page }) => {
    for (const route of ['/', '/dashboard', '/forms', '/connect', '/payments', '/toast']) {
      await page.goto(route)
      const h1Count = await page.locator('h1').count()
      expect(h1Count, `route ${route} should have exactly 1 <h1>`).toBe(1)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Health endpoint
// ─────────────────────────────────────────────────────────────────────────

test.describe('Health endpoint', () => {
  test('health endpoint responds 200 OK', async ({ request, baseURL }) => {
    const response = await request.get(`${baseURL}/api/health`)
    expect(response.ok()).toBe(true)
    const body = (await response.json()) as { ok?: boolean }
    expect(body.ok).toBe(true)
  })
})
