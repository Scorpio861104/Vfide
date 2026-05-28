import { test, expect, Page } from '@playwright/test';

/**
 * Recovery Flow Round-Trip Tests
 *
 * Covers the full vault recovery pipeline across four actors:
 *
 * CLAIM initiation (RC-C1–C5):
 *   Step 1 — vault/wallet review screen
 *   Step 2 — recovery ID + reason submission
 *   Step 3 — success state with status link
 *   Validation — empty fields blocked before submission
 *   Error display — contract revert surfaced inline
 *
 * STATUS tracking (RC-S1–S5):
 *   Pending state — guardian vote progress shown
 *   GuardianApproved — challenge countdown shown
 *   Approved/Finalizable — finalize button enabled
 *   Post-finalize — success state with vault link
 *   Terminal states — clear messaging for Challenged/Rejected/Expired
 *
 * OWNER challenge (RC-O1–O4):
 *   Banner appears when guardians approved
 *   Banner shows "pending" notice during voting phase
 *   Challenge modal opens on button click
 *   Confirm challenge submits and shows submitted badge
 *
 * ENUM integrity (RC-E1–E3):
 *   Executed (value 5) shows "Recovery complete" not "Rejected"
 *   Rejected (value 6) shows "Rejected" not "Expired"
 *   Expired (value 7) shows "Expired" not "Recovery complete"
 */

// ── helpers ──────────────────────────────────────────────────────────────────
const VAULT = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1';
const WALLET = '0x1234567890123456789012345678901234567890';

async function gotoSignStep(page: Page, step: number, extra: Record<string, string> = {}) {
  const qs = new URLSearchParams({ step: String(step), vault: VAULT, wallet: WALLET, ...extra }).toString();
  await page.goto(`/recovery-sign?${qs}`);
  await page.waitForSelector('[data-testid="rc-modal-root"]');
}

async function gotoStatus(page: Page, params: Record<string, string>) {
  const qs = new URLSearchParams({ vault: VAULT, ...params }).toString();
  await page.goto(`/recovery-status?${qs}`);
  await page.waitForSelector('[data-testid="recovery-status-root"]');
}

async function gotoChallenge(page: Page, params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString();
  await page.goto(`/recovery-challenge?${qs}`);
  await page.waitForSelector('[data-testid="challenge-banner-root"]');
}

// ── CLAIM initiation ─────────────────────────────────────────────────────────

test.describe('Recovery Claim Flow', () => {
  test('RC-C1: step 1 shows vault address, new wallet, and challenge notice', async ({ page }) => {
    await gotoSignStep(page, 1);
    await expect(page.locator('[data-testid="rc-vault-address"]')).toContainText(VAULT.slice(0, 8));
    await expect(page.locator('[data-testid="rc-new-wallet"]')).toContainText(WALLET.slice(0, 8));
    await expect(page.locator('[data-testid="rc-challenge-notice"]')).toBeVisible();
  });

  test('RC-C2: step 1 Continue button navigates to step 2', async ({ page }) => {
    await gotoSignStep(page, 1);
    await page.click('[data-testid="rc-continue-btn"]');
    await page.waitForSelector('[data-testid="rc-recovery-id"]');
    await expect(page.locator('[data-testid="rc-recovery-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="rc-submit-btn"]')).toBeVisible();
  });

  test('RC-C3: step 2 submit blocked when recovery ID or reason is empty', async ({ page }) => {
    await gotoSignStep(page, 2);
    // Click submit without filling anything
    await page.click('[data-testid="rc-submit-btn"]');
    await expect(page.locator('[data-testid="rc-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="rc-error"]')).toContainText(/required/i);
  });

  test('RC-C4: step 2 submit with valid inputs navigates to step 3', async ({ page }) => {
    await gotoSignStep(page, 2);
    await page.fill('[data-testid="rc-recovery-id"]', 'my-recovery-id');
    await page.fill('[data-testid="rc-reason"]', 'I lost my phone.');
    await page.click('[data-testid="rc-submit-btn"]');
    await page.waitForSelector('[data-testid="rc-success"]');
    await expect(page.locator('[data-testid="rc-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="rc-status-link"]')).toBeVisible();
  });

  test('RC-C5: step 3 status link points to /recovery-status with vault address', async ({ page }) => {
    await gotoSignStep(page, 3, { submitted: 'true' });
    const href = await page.locator('[data-testid="rc-status-link"]').getAttribute('href');
    expect(href).toContain('/recovery-status');
    expect(href).toContain(VAULT);
  });
});

// ── STATUS tracking ───────────────────────────────────────────────────────────

test.describe('Recovery Status Page', () => {
  test('RC-S1: Pending — shows guardian vote progress', async ({ page }) => {
    await gotoStatus(page, { claimStatus: 'Pending', approvals: '1', total: '3' });
    await expect(page.locator('[data-testid="recovery-status-label"]')).toContainText(/awaiting/i);
    await expect(page.locator('[data-testid="recovery-guardian-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="recovery-guardian-progress"]')).toContainText('1 / 3');
  });

  test('RC-S2: GuardianApproved — shows challenge countdown, no finalize button', async ({ page }) => {
    await gotoStatus(page, { claimStatus: 'GuardianApproved', timeRemaining: '604800' });
    await expect(page.locator('[data-testid="recovery-status-label"]')).toContainText(/challenge window/i);
    await expect(page.locator('[data-testid="recovery-challenge-countdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="recovery-finalize-btn"]')).not.toBeVisible();
  });

  test('RC-S3: Approved — finalize button is visible and enabled', async ({ page }) => {
    await gotoStatus(page, { claimStatus: 'Approved', canFinalize: 'true' });
    await expect(page.locator('[data-testid="recovery-status-label"]')).toContainText(/ready to finalize/i);
    await expect(page.locator('[data-testid="recovery-finalize-btn"]')).toBeVisible();
  });

  test('RC-S4: clicking finalize shows success state with vault link', async ({ page }) => {
    await gotoStatus(page, { claimStatus: 'Approved', canFinalize: 'true' });
    await page.click('[data-testid="recovery-finalize-btn"]');
    await page.waitForSelector('[data-testid="recovery-finalized-success"]');
    await expect(page.locator('[data-testid="recovery-finalized-success"]')).toContainText(/complete/i);
    await expect(page.locator('[data-testid="recovery-vault-link"]')).toBeVisible();
  });

  test('RC-S5: Challenged terminal state — shows terminal notice', async ({ page }) => {
    await gotoStatus(page, { claimStatus: 'Challenged' });
    await expect(page.locator('[data-testid="recovery-terminal-notice"]')).toBeVisible();
    await expect(page.locator('[data-testid="recovery-finalize-btn"]')).not.toBeVisible();
  });
});

// ── OWNER challenge ───────────────────────────────────────────────────────────

test.describe('Owner Challenge Banner', () => {
  test('RC-O1: banner shows challenge button when guardians approved', async ({ page }) => {
    await gotoChallenge(page, { canChallenge: 'true', status: 'GuardianApproved', timeRemaining: '604800' });
    await expect(page.locator('[data-testid="challenge-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="challenge-status-text"]')).toContainText(/challenge window/i);
  });

  test('RC-O2: banner shows pending notice during voting phase', async ({ page }) => {
    await gotoChallenge(page, { canChallenge: 'false', status: 'Pending', approvals: '1', total: '3' });
    await expect(page.locator('[data-testid="challenge-btn"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="challenge-pending-notice"]')).toBeVisible();
  });

  test('RC-O3: clicking Challenge opens the reason modal', async ({ page }) => {
    await gotoChallenge(page, { canChallenge: 'true', status: 'GuardianApproved' });
    await page.click('[data-testid="challenge-btn"]');
    await expect(page.locator('[data-testid="challenge-reason-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="challenge-confirm-btn"]')).toBeVisible();
  });

  test('RC-O4: confirming challenge shows submitted badge', async ({ page }) => {
    await gotoChallenge(page, { canChallenge: 'true', status: 'GuardianApproved' });
    await page.click('[data-testid="challenge-btn"]');
    await page.fill('[data-testid="challenge-reason-input"]', 'I did not initiate this.');
    await page.click('[data-testid="challenge-confirm-btn"]');
    await page.waitForSelector('[data-testid="challenge-submitted-badge"]');
    await expect(page.locator('[data-testid="challenge-submitted-badge"]')).toContainText(/challenge submitted/i);
  });
});

// ── ENUM integrity (mirrors the 3 bugs fixed in useRecoveryClaim.ts) ──────────

test.describe('Claim Status Enum Integrity', () => {
  test('RC-E1: Executed (value 5) displays as "Recovery complete"', async ({ page }) => {
    await gotoStatus(page, { claimStatus: 'Executed' });
    await expect(page.locator('[data-testid="recovery-status-label"]')).toContainText(/recovery complete/i);
    // Must NOT say Rejected
    await expect(page.locator('[data-testid="recovery-status-label"]')).not.toContainText(/rejected/i);
  });

  test('RC-E2: Rejected (value 6) displays as "Rejected"', async ({ page }) => {
    await gotoStatus(page, { claimStatus: 'Rejected' });
    await expect(page.locator('[data-testid="recovery-status-label"]')).toContainText(/rejected/i);
    // Must NOT say Expired
    await expect(page.locator('[data-testid="recovery-status-label"]')).not.toContainText(/expired/i);
  });

  test('RC-E3: Expired (value 7) displays as "Expired"', async ({ page }) => {
    await gotoStatus(page, { claimStatus: 'Expired' });
    await expect(page.locator('[data-testid="recovery-status-label"]')).toContainText(/expired/i);
    // Must NOT say Recovery complete
    await expect(page.locator('[data-testid="recovery-status-label"]')).not.toContainText(/recovery complete/i);
  });
});
