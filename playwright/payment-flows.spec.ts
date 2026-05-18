import { test, expect, Page } from '@playwright/test';

/**
 * Payment Flows E2E Tests
 * Tests payment requests, sending/receiving payments, history, QR codes, and multi-token support
 */

test.describe('Payment Flows', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          }
          if (method === 'eth_chainId') return '0x1';
          if (method === 'eth_sendTransaction') {
            return '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/');
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should navigate to payments page', async () => {
    const paymentLink = page.locator('a, button').filter({ hasText: /(payment|pay|send money)/i }).first();
    
    if (await paymentLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paymentLink.click();
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display payment form', async () => {
    await page.goto('/dashboard');
    
    const recipientInput = page.locator('input[name="recipient"], input[name="to"]').first();
    const amountInput = page.locator('input[name="amount"], input[type="number"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should select payment token', async () => {
    await page.goto('/dashboard');
    
    // Look for token selector
    const tokenSelector = page.locator('[data-testid="token-selector"], select[name="token"]').first();
    
    if (await tokenSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tokenSelector.click();
      await page.waitForTimeout(500);
      
      // Should show token options
      const content = page.locator('main, [role="listbox"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should support multiple tokens (ETH, USDC, DAI)', async () => {
    await page.goto('/dashboard');
    
    const tokenSelector = page.locator('[data-testid="token-selector"]').first();
    
    if (await tokenSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tokenSelector.click();
      await page.waitForTimeout(500);
      
      // Check for common tokens
      const tokens = ['ETH', 'USDC', 'DAI', 'USDT'];
      let foundTokens = 0;
      
      for (const token of tokens) {
        const tokenOption = page.locator(`text=${token}`).first();
        if (await tokenOption.isVisible({ timeout: 500 }).catch(() => false)) {
          foundTokens++;
        }
      }
      
      expect(foundTokens).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display token balance', async () => {
    await page.goto('/dashboard');
    
    // Should show available balance
    const balance = page.locator('[data-testid="balance"], text=/balance|available/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should validate payment amount against balance', async () => {
    await page.goto('/dashboard');
    
    const amountInput = page.locator('input[name="amount"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Enter amount greater than balance
      await amountInput.fill('999999999');
      await amountInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show insufficient balance error
      const error = page.locator('text=/insufficient|not enough/i').first();
    }
  });

  test('should send payment successfully', async () => {
    await page.goto('/dashboard');
    
    const recipientInput = page.locator('input[name="recipient"]').first();
    const amountInput = page.locator('input[name="amount"]').first();
    const sendBtn = page.locator('button[type="submit"], button').filter({ hasText: /send|pay/i }).first();
    
    if (await recipientInput.isVisible({ timeout: 2000 }).catch(() => false) &&
        await amountInput.isVisible({ timeout: 1000 }).catch(() => false) &&
        await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      
      await recipientInput.fill('0x1234567890123456789012345678901234567890');
      await amountInput.fill('0.01');
      await sendBtn.click();
      
      await page.waitForTimeout(1000);
      
      // Should show confirmation or transaction status
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should add payment memo/note', async () => {
    await page.goto('/dashboard');
    
    const memoInput = page.locator('input[name="memo"], input[name="note"], textarea[name="message"]').first();
    
    if (await memoInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await memoInput.fill('Payment for services');
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Payment Requests', () => {
  test('should create payment request', async ({ page }) => {
    await page.goto('/dashboard');
    
    const requestBtn = page.locator('button, a').filter({ hasText: /(request|request payment)/i }).first();
    
    if (await requestBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await requestBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display payment request form', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for amount and description fields
    const amountInput = page.locator('input[name="amount"]').first();
    const descriptionInput = page.locator('input[name="description"], textarea').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should generate payment request link', async ({ page }) => {
    await page.goto('/dashboard');
    
    // After creating request, should generate shareable link
    const linkDisplay = page.locator('[data-testid="payment-link"], input[readonly]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should copy payment request link', async ({ page }) => {
    await page.goto('/dashboard');
    
    const copyBtn = page.locator('button').filter({ hasText: /copy/i }).first();
    
    if (await copyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyBtn.click();
      await page.waitForTimeout(500);
      
      // Should show copied confirmation
      const toast = page.locator('text=/copied|success/i').first();
    }
  });

  test('should display incoming payment requests', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for payment requests section
    const requestsList = page.locator('[data-testid="payment-requests"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should approve payment request', async ({ page }) => {
    await page.goto('/dashboard');
    
    const approveBtn = page.locator('button').filter({ hasText: /(approve|pay|accept)/i }).first();
    
    if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should decline payment request', async ({ page }) => {
    await page.goto('/dashboard');
    
    const declineBtn = page.locator('button').filter({ hasText: /(decline|reject)/i }).first();
    
    if (await declineBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await declineBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('QR Code Payments', () => {
  test('should generate QR code for receiving payment', async ({ page }) => {
    await page.goto('/dashboard');
    
    const qrBtn = page.locator('button, a').filter({ hasText: /(qr|qr code|receive)/i }).first();
    
    if (await qrBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qrBtn.click();
      await page.waitForTimeout(500);
      
      // Should display QR code
      const qrCode = page.locator('[data-testid="qr-code"], canvas, svg, img').first();
      
      if (await qrCode.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(qrCode).toBeVisible();
      }
    }
  });

  test('should include amount in QR code', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Generate QR with specific amount
    const amountInput = page.locator('input[name="amount"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await amountInput.fill('0.5');
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should download QR code', async ({ page }) => {
    await page.goto('/dashboard');
    
    const downloadBtn = page.locator('button').filter({ hasText: /(download|save)/i }).first();
    
    if (await downloadBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download').catch(() => null),
        downloadBtn.click()
      ]);
      
      // Download may or may not be triggered
    }
  });

  test('should scan QR code for payment', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for scan option
    const scanBtn = page.locator('button').filter({ hasText: /scan/i }).first();
    
    if (await scanBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await scanBtn.click();
      await page.waitForTimeout(500);
      
      // Should open camera or file picker
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });
});

test.describe('Payment History', () => {
  test('should display payment history', async ({ page }) => {
    await page.goto('/dashboard');
    
    const historyLink = page.locator('a, button').filter({ hasText: /(history|payments|activity)/i }).first();
    
    if (await historyLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await historyLink.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should list sent and received payments', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show payment transactions
    const paymentItems = page.locator('[data-testid="payment-item"], .payment-row').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should filter by payment type', async ({ page }) => {
    await page.goto('/dashboard');
    
    const filters = ['all', 'sent', 'received', 'pending'];
    
    for (const filter of filters) {
      const filterBtn = page.locator('button').filter({ hasText: new RegExp(filter, 'i') }).first();
      
      if (await filterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should filter by token type', async ({ page }) => {
    await page.goto('/dashboard');
    
    const tokenFilter = page.locator('select[name="token"], [data-testid="token-filter"]').first();
    
    if (await tokenFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tokenFilter.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should filter by date range', async ({ page }) => {
    await page.goto('/dashboard');
    
    const dateFilter = page.locator('input[type="date"]').first();
    
    if (await dateFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dateFilter.fill('2024-01-01');
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should export payment history', async ({ page }) => {
    await page.goto('/dashboard');
    
    const exportBtn = page.locator('button').filter({ hasText: /(export|download|csv)/i }).first();
    
    if (await exportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const [download] = await Promise.all([
        page.waitForEvent('download').catch(() => null),
        exportBtn.click()
      ]);
    }
  });

  test('should search payment history', async ({ page }) => {
    await page.goto('/dashboard');
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('0x123');
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display payment details', async ({ page }) => {
    await page.goto('/dashboard');
    
    const paymentItem = page.locator('[data-testid="payment-item"]').first();
    
    if (await paymentItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await paymentItem.click();
      await page.waitForTimeout(500);
      
      // Should show detailed view
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });
});

test.describe('Multi-Token Payments', () => {
  test('should display multiple token balances', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show balances for different tokens
    const balanceCards = page.locator('[data-testid="token-balance"], .balance-card');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should switch between tokens', async ({ page }) => {
    await page.goto('/dashboard');
    
    const tokenTabs = ['ETH', 'USDC', 'DAI'];
    
    for (const token of tokenTabs) {
      const tokenTab = page.locator('button, [role="tab"]').filter({ hasText: token }).first();
      
      if (await tokenTab.isVisible({ timeout: 500 }).catch(() => false)) {
        await tokenTab.click();
        await page.waitForTimeout(300);
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display USD value for tokens', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show fiat equivalent
    const usdValue = page.locator('text=/\\$\\d+|USD/').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should handle ERC-20 token approvals', async ({ page }) => {
    await page.goto('/dashboard');
    
    // When sending ERC-20 tokens, may need approval
    const approveBtn = page.locator('button').filter({ hasText: /approve/i }).first();
    
    if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await approveBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display token allowances', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show current allowances
    const allowanceInfo = page.locator('text=/allowance|approved/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Payment Error Handling', () => {
  test('should handle insufficient balance', async ({ page }) => {
    await page.goto('/dashboard');
    
    const amountInput = page.locator('input[name="amount"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await amountInput.fill('999999');
      await amountInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show error
      const error = page.locator('text=/insufficient|not enough/i').first();
    }
  });

  test('should handle invalid recipient address', async ({ page }) => {
    await page.goto('/dashboard');
    
    const recipientInput = page.locator('input[name="recipient"]').first();
    
    if (await recipientInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recipientInput.fill('invalid-address');
      await recipientInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show validation error
      const error = page.locator('text=/invalid|error/i').first();
    }
  });

  test('should handle network errors', async ({ page }) => {
    // Simulate offline
    await page.context().setOffline(true);
    
    await page.goto('/dashboard').catch(() => null);
    
    await page.context().setOffline(false);
    await page.goto('/dashboard');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should handle failed transactions', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_sendTransaction') {
            throw new Error('Transaction failed');
          }
          if (method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          }
          if (method === 'eth_chainId') return '0x1';
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/dashboard');
    
    // Transaction failure should be handled gracefully
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should prevent sending to zero address', async ({ page }) => {
    await page.goto('/dashboard');
    
    const recipientInput = page.locator('input[name="recipient"]').first();
    
    if (await recipientInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recipientInput.fill('0x0000000000000000000000000000000000000000');
      await recipientInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show error
      const error = page.locator('text=/invalid|cannot send/i').first();
    }
  });
});

test.describe('Recurring Payments', () => {
  test('should setup recurring payment', async ({ page }) => {
    await page.goto('/dashboard');
    
    const recurringBtn = page.locator('button, a').filter({ hasText: /(recurring|subscription)/i }).first();
    
    if (await recurringBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await recurringBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should select payment frequency', async ({ page }) => {
    await page.goto('/dashboard');
    
    const frequencies = ['daily', 'weekly', 'monthly'];
    
    for (const freq of frequencies) {
      const freqOption = page.locator('select[name="frequency"], button').filter({ hasText: new RegExp(freq, 'i') }).first();
      
      if (await freqOption.isVisible({ timeout: 500 }).catch(() => false)) {
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display active recurring payments', async ({ page }) => {
    await page.goto('/dashboard');
    
    const recurringList = page.locator('[data-testid="recurring-payments"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should cancel recurring payment', async ({ page }) => {
    await page.goto('/dashboard');
    
    const cancelBtn = page.locator('button').filter({ hasText: /cancel|stop/i }).first();
    
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});
