import { test, expect, Page } from '@playwright/test';

/**
 * QR Payment Round-Trip Tests
 *
 * Covers the full sign → encode → scan → verify → pay pipeline:
 *
 * SIGN side  (PaymentQR.tsx / MerchantPOS):
 *   QR-S1  Sign button disabled when amount is empty
 *   QR-S2  Sign button enabled once a valid positive amount is entered
 *   QR-S3  Payment link input shows placeholder (not a raw URL) before signing
 *   QR-S4  orderId input has a visible auto-generated default value
 *
 * PAY side  (PayContent.tsx — /pay route):
 *   QR-P1  Non-QR source skips sig validation → pay button enabled
 *   QR-P2  QR source + valid sig + future expiry → pay button enabled
 *   QR-P3  QR source + missing sig → pay button disabled + warning shown
 *   QR-P4  QR source + expired timestamp → pay button disabled + expiry message
 *   QR-P5  QR source + invalid sig string → pay button disabled + invalid message
 *   QR-P6  QR source + zero amount → pay button disabled regardless of sig
 *
 * ROUND-TRIP integrity:
 *   QR-R1  orderId written into URL is preserved verbatim on the pay page
 *   QR-R2  Unsigned payment link input is blank / non-copyable
 *   QR-R3  Changing amount after signing clears the signed state
 */

// ── helpers ─────────────────────────────────────────────────────────────────

const MERCHANT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
const FUTURE_EXP = String(Math.floor(Date.now() / 1000) + 900);   // 15 min from now
const PAST_EXP   = String(Math.floor(Date.now() / 1000) - 60);    // 1 min ago
const VALID_SIG  = '0x' + 'ab'.repeat(32) + 'cd'.repeat(1) + '1c'; // 65-byte mock sig
const INVALID_SIG = '0x' + 'de'.repeat(32) + 'ef'.repeat(1) + '1b';

/** Navigate to the QR sign fixture page */
async function gotoSignPage(page: Page) {
  await page.goto('/qr-sign');
  await page.waitForSelector('[data-testid="qr-sign-root"]');
}

/** Navigate to the pay page with given query params */
async function gotoPayPage(page: Page, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  await page.goto(`/pay?${qs}`);
  await page.waitForSelector('[data-testid="pay-root"]');
}

// ── SIGN side ────────────────────────────────────────────────────────────────

test.describe('QR Sign Page', () => {
  test.beforeEach(async ({ page }) => {
    await gotoSignPage(page);
  });

  test('QR-S1: sign button is disabled when amount is empty', async ({ page }) => {
    const signBtn = page.locator('[data-testid="qr-sign-btn"]');
    await expect(signBtn).toBeDisabled();
  });

  test('QR-S2: sign button enables once a valid positive amount is entered', async ({ page }) => {
    const amountInput = page.locator('[data-testid="qr-amount-input"]');
    const signBtn     = page.locator('[data-testid="qr-sign-btn"]');

    await amountInput.fill('50');
    await expect(signBtn).toBeEnabled();
  });

  test('QR-S2b: sign button stays disabled for zero amount', async ({ page }) => {
    const amountInput = page.locator('[data-testid="qr-amount-input"]');
    const signBtn     = page.locator('[data-testid="qr-sign-btn"]');

    await amountInput.fill('0');
    await expect(signBtn).toBeDisabled();
  });

  test('QR-S3: payment link input shows placeholder before signing', async ({ page }) => {
    const linkInput = page.locator('[data-testid="qr-link-input"]');
    // value should be empty (unsigned state)
    await expect(linkInput).toHaveValue('');
    // placeholder should mention signing
    const placeholder = await linkInput.getAttribute('placeholder');
    expect(placeholder?.toLowerCase()).toMatch(/sign/);
  });

  test('QR-S4: orderId input has a non-empty auto-generated default', async ({ page }) => {
    const orderInput = page.locator('[data-testid="qr-orderid-input"]');
    const value = await orderInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });
});

// ── PAY side ─────────────────────────────────────────────────────────────────

test.describe('QR Pay Page — signature validation states', () => {
  test('QR-P1: non-QR source skips validation — pay button enabled', async ({ page }) => {
    await gotoPayPage(page, {
      merchant: MERCHANT,
      amount: '50',
      source: 'checkout',
      settlement: 'escrow',
      orderId: 'INV-001',
    });
    const payBtn = page.locator('[data-testid="pay-submit-btn"]');
    await expect(payBtn).toBeEnabled();
    // no signature warning visible
    await expect(page.locator('[data-testid="sig-warning"]')).not.toBeVisible();
  });

  test('QR-P2: QR source + valid future exp → pay button enabled', async ({ page }) => {
    await gotoPayPage(page, {
      merchant: MERCHANT,
      amount: '50',
      source: 'qr',
      settlement: 'instant',
      orderId: 'QR-123',
      exp: FUTURE_EXP,
      sig: VALID_SIG,
      sigState: 'valid',   // fixture hint: pre-render as valid
    });
    await expect(page.locator('[data-testid="pay-submit-btn"]')).toBeEnabled();
    await expect(page.locator('[data-testid="sig-badge-valid"]')).toBeVisible();
  });

  test('QR-P3: QR source + missing sig → pay button disabled, warning shown', async ({ page }) => {
    await gotoPayPage(page, {
      merchant: MERCHANT,
      amount: '50',
      source: 'qr',
      settlement: 'instant',
      orderId: 'QR-123',
      exp: FUTURE_EXP,
      // no sig param
    });
    await expect(page.locator('[data-testid="pay-submit-btn"]')).toBeDisabled();
    await expect(page.locator('[data-testid="sig-warning"]')).toBeVisible();
  });

  test('QR-P4: QR source + expired timestamp → pay button disabled, expiry message', async ({ page }) => {
    await gotoPayPage(page, {
      merchant: MERCHANT,
      amount: '50',
      source: 'qr',
      settlement: 'instant',
      orderId: 'QR-123',
      exp: PAST_EXP,
      sig: VALID_SIG,
      sigState: 'expired',
    });
    await expect(page.locator('[data-testid="pay-submit-btn"]')).toBeDisabled();
    const warning = page.locator('[data-testid="sig-warning"]');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/expired/i);
  });

  test('QR-P5: QR source + invalid sig → pay button disabled, invalid message', async ({ page }) => {
    await gotoPayPage(page, {
      merchant: MERCHANT,
      amount: '50',
      source: 'qr',
      settlement: 'instant',
      orderId: 'QR-123',
      exp: FUTURE_EXP,
      sig: INVALID_SIG,
      sigState: 'invalid',
    });
    await expect(page.locator('[data-testid="pay-submit-btn"]')).toBeDisabled();
    const warning = page.locator('[data-testid="sig-warning"]');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(/invalid/i);
  });

  test('QR-P6: QR source + zero amount → pay button disabled', async ({ page }) => {
    await gotoPayPage(page, {
      merchant: MERCHANT,
      amount: '0',
      source: 'qr',
      settlement: 'instant',
      orderId: 'QR-123',
      exp: FUTURE_EXP,
      sig: VALID_SIG,
      sigState: 'valid',
    });
    await expect(page.locator('[data-testid="pay-submit-btn"]')).toBeDisabled();
  });
});

// ── ROUND-TRIP integrity ──────────────────────────────────────────────────────

test.describe('QR Round-Trip Integrity', () => {
  test('QR-R1: orderId in URL is shown verbatim on pay page', async ({ page }) => {
    const testOrderId = 'QR-1748123456';
    await gotoPayPage(page, {
      merchant: MERCHANT,
      amount: '25',
      source: 'qr',
      settlement: 'instant',
      orderId: testOrderId,
      exp: FUTURE_EXP,
      sig: VALID_SIG,
      sigState: 'valid',
    });
    await expect(page.locator('[data-testid="pay-order-display"]')).toContainText(testOrderId);
  });

  test('QR-R2: unsigned sign page — link input value is blank', async ({ page }) => {
    await gotoSignPage(page);
    const linkInput = page.locator('[data-testid="qr-link-input"]');
    await expect(linkInput).toHaveValue('');
  });

  test('QR-R3: changing amount after sign resets sign state', async ({ page }) => {
    // Simulate signed state by loading the fixture with signed=true
    await page.goto('/qr-sign?signed=true&amount=50');
    await page.waitForSelector('[data-testid="qr-sign-root"]');

    const signedBadge = page.locator('[data-testid="qr-signed-badge"]');
    await expect(signedBadge).toBeVisible();

    // Change the amount — should clear the signed badge
    const amountInput = page.locator('[data-testid="qr-amount-input"]');
    await amountInput.fill('99');
    await amountInput.dispatchEvent('input');

    await expect(signedBadge).not.toBeVisible();
    await expect(page.locator('[data-testid="qr-link-input"]')).toHaveValue('');
  });
});
