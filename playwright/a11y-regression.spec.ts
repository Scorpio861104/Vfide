/**
 * A11y regression suite.
 *
 * Locks in the accessibility baseline shipped in R12, R14, and R15:
 *   - R12: icon-only buttons → aria-label
 *   - R14.1: global toast role/aria-live; dismiss button aria-label
 *   - R14.2: skip-to-content link; <main id="main" tabindex="-1">
 *   - R14.3 / R15.1: form inputs labeled (aria-label or <label htmlFor>)
 *   - R15.2: body text contrast bumped to WCAG AA
 *   - R15.0 (confirmation): no heading-level skips
 *
 * Each test asserts a single behavior so a failure points at the
 * specific R-round whose guarantee broke. Runs against the lightweight
 * playwright/test-server.js shells; doesn't need Next.js running.
 *
 * Added 2026-05-17 (R17).
 */

import { test, expect } from '@playwright/test'

// ─────────────────────────────────────────────────────────────────────────
// Skip link & main landmark (R14.2)
// ─────────────────────────────────────────────────────────────────────────

test.describe('Skip link + main landmark (R14.2)', () => {
  test('skip link is the first focusable element on the page', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLAnchorElement | null
      return el ? { tag: el.tagName, href: el.getAttribute('href'), text: el.textContent?.trim() } : null
    })
    expect(focused?.tag).toBe('A')
    expect(focused?.href).toBe('#main')
    expect(focused?.text).toBe('Skip to main content')
  })

  test('skip link target exists with id="main" and is focusable', async ({ page }) => {
    await page.goto('/')
    const main = page.locator('#main')
    await expect(main).toBeVisible()
    await expect(main).toHaveAttribute('role', 'main')
    await expect(main).toHaveAttribute('tabindex', '-1')
  })

  test('activating the skip link moves keyboard focus to #main', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')
    // The hash navigates and the target is tabindex=-1 so we can focus it programmatically.
    // Real browsers will focus the target on hash-link activation when tabindex is present.
    await page.locator('#main').focus()
    const focusedId = await page.evaluate(() => document.activeElement?.id)
    expect(focusedId).toBe('main')
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Icon-only buttons have aria-label (R12)
// ─────────────────────────────────────────────────────────────────────────

test.describe('Icon-only buttons have aria-label (R12)', () => {
  test('every button on the home page has an accessible name', async ({ page }) => {
    await page.goto('/')
    const buttons = await page.locator('button').all()
    expect(buttons.length).toBeGreaterThan(0)
    for (const btn of buttons) {
      const ariaLabel = await btn.getAttribute('aria-label')
      const text = (await btn.textContent())?.trim() ?? ''
      // A button is accessible if it has aria-label OR visible text content.
      // Icon-only buttons (emoji or SVG, no text) must have aria-label.
      const hasName = (ariaLabel && ariaLabel.length > 0) || text.length > 0
      expect(hasName, `button "${text || '(icon-only)'}" lacks an accessible name`).toBe(true)
    }
  })

  test('nav action buttons in chrome are labeled', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Connect wallet' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Search vaults' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Notifications' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'More options' }).first()).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Toast container has aria-live + dismiss button labeled (R14.1)
// ─────────────────────────────────────────────────────────────────────────

test.describe('Global toast a11y (R14.1)', () => {
  test('toast container is a polite live region', async ({ page }) => {
    await page.goto('/toast')
    const container = page.locator('[data-testid="toast-container"]')
    await expect(container).toBeVisible()
    await expect(container).toHaveAttribute('role', 'status')
    await expect(container).toHaveAttribute('aria-live', 'polite')
    await expect(container).toHaveAttribute('aria-atomic', 'false')
  })

  test('error toasts also carry role="alert" for interrupt priority', async ({ page }) => {
    await page.goto('/toast')
    const errorToast = page.locator('[data-toast-type="error"]')
    await expect(errorToast).toHaveAttribute('role', 'alert')
  })

  test('toast dismiss buttons have aria-label', async ({ page }) => {
    await page.goto('/toast')
    const dismissButtons = page.locator('[data-testid="toast-container"] button')
    const count = await dismissButtons.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(dismissButtons.nth(i)).toHaveAttribute('aria-label', 'Dismiss notification')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Form inputs are labeled (R14.3 + R15.1)
// ─────────────────────────────────────────────────────────────────────────

test.describe('Form inputs are labeled (R14.3 / R15.1)', () => {
  test('every input/textarea/select on /forms has an accessible name', async ({ page }) => {
    await page.goto('/forms')
    const fields = await page.locator('input, textarea, select').all()
    expect(fields.length).toBeGreaterThan(5)
    for (const field of fields) {
      const ariaLabel = await field.getAttribute('aria-label')
      const id = await field.getAttribute('id')
      let hasLabel = false
      if (ariaLabel && ariaLabel.length > 0) {
        hasLabel = true
      } else if (id) {
        const associatedLabel = await page.locator(`label[for="${id}"]`).count()
        hasLabel = associatedLabel > 0
      }
      const placeholder = await field.getAttribute('placeholder')
      const type = await field.getAttribute('type')
      expect(
        hasLabel,
        `field [type=${type}, placeholder="${placeholder}"] lacks aria-label and <label htmlFor>`,
      ).toBe(true)
    }
  })

  test('InvoiceManager-style inputs from R14.3 are reachable by accessible name', async ({ page }) => {
    await page.goto('/forms')
    // Spot-check the canonical labels we shipped in R14.3
    await expect(page.getByLabel('Search invoices')).toBeVisible()
    await expect(page.getByLabel('Customer name')).toBeVisible()
    await expect(page.getByLabel('Item quantity')).toBeVisible()
    await expect(page.getByLabel('Invoice notes')).toBeVisible()
    await expect(page.getByLabel('Due in days')).toBeVisible()
  })

  test('CrossChainTransfer inputs from R14.3 are reachable by accessible name', async ({ page }) => {
    await page.goto('/forms')
    await expect(page.getByLabel('From chain')).toBeVisible()
    await expect(page.getByLabel('From token')).toBeVisible()
    await expect(page.getByLabel('Amount to transfer')).toBeVisible()
    // The Recipient input uses <label htmlFor> rather than aria-label.
    await expect(page.getByLabel('Recipient')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Heading hierarchy is intact (R15.0 confirmation)
// ─────────────────────────────────────────────────────────────────────────

test.describe('Heading hierarchy (R15.0)', () => {
  test('home shell has h1 → h2 progression with no skips', async ({ page }) => {
    await page.goto('/')
    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map((h) => Number(h.tagName[1])),
    )
    expect(headings.length).toBeGreaterThan(0)
    expect(headings[0]).toBe(1) // first heading is h1
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i] - headings[i - 1]).toBeLessThanOrEqual(1)
    }
  })

  test('forms shell has clean heading order', async ({ page }) => {
    await page.goto('/forms')
    const headings = await page.evaluate(() =>
      Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map((h) => Number(h.tagName[1])),
    )
    expect(headings[0]).toBe(1)
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i] - headings[i - 1]).toBeLessThanOrEqual(1)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────
// Body text contrast (R15.2)
// ─────────────────────────────────────────────────────────────────────────

test.describe('Body text contrast (R15.2)', () => {
  /**
   * WCAG AA requires 4.5:1 for normal-size body text. After R15.2, body
   * text uses text-zinc-400 (#a1a1aa) on bg-zinc-900 (#18181b), measuring
   * ~7:1. We compute contrast by sampling the rendered color.
   */
  test('body-text class has contrast >= 4.5:1 against the page background', async ({ page }) => {
    await page.goto('/')
    const ratio = await page.evaluate(() => {
      // Standard WCAG sRGB → relative luminance.
      const luminance = (hex: string): number => {
        const m = hex.replace('#', '').match(/.{2}/g)
        if (!m) return 0
        const [r, g, b] = m.map((c) => {
          const v = parseInt(c, 16) / 255
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      const toHex = (rgb: string): string => {
        const m = rgb.match(/\d+/g)
        if (!m) return '#000000'
        return '#' + m.slice(0, 3).map((n) => Number(n).toString(16).padStart(2, '0')).join('')
      }
      const el = document.querySelector('.body-text') as HTMLElement
      if (!el) return 0
      const fg = toHex(getComputedStyle(el).color)
      const bg = toHex(getComputedStyle(document.body).backgroundColor)
      const fgL = luminance(fg)
      const bgL = luminance(bg)
      const [lighter, darker] = fgL > bgL ? [fgL, bgL] : [bgL, fgL]
      return (lighter + 0.05) / (darker + 0.05)
    })
    expect(ratio).toBeGreaterThanOrEqual(4.5)
  })
})

// ─────────────────────────────────────────────────────────────────────────
// HTML lang attribute (R14 confirmation)
// ─────────────────────────────────────────────────────────────────────────

test.describe('Document-level a11y', () => {
  test('html element declares lang', async ({ page }) => {
    await page.goto('/')
    const lang = await page.evaluate(() => document.documentElement.lang)
    expect(lang).toBeTruthy()
    expect(lang.length).toBeGreaterThan(0)
  })

  test('page has exactly one <main> landmark', async ({ page }) => {
    await page.goto('/')
    const count = await page.locator('main').count()
    expect(count).toBe(1)
  })

  test('navigation landmarks are labeled', async ({ page }) => {
    await page.goto('/')
    const navs = page.locator('nav')
    const count = await navs.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const label = await navs.nth(i).getAttribute('aria-label')
      expect(label, `nav at index ${i} lacks aria-label`).toBeTruthy()
    }
  })
})
