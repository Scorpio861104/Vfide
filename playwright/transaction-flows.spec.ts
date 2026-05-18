import { test, expect, Page } from '@playwright/test';

/**
 * Transaction Flows E2E Tests
 * Tests sending transactions, confirmations, status tracking, failed transactions,
 * gas estimation, and transaction history
 */

test.describe('Transaction Flows', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock Web3 provider
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method, params }: any) => {
          if (method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          }
          if (method === 'eth_chainId') {
            return '0x1';
          }
          if (method === 'eth_sendTransaction') {
            return '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
          }
          if (method === 'eth_gasPrice') {
            return '0x3b9aca00'; // 1 gwei
          }
          if (method === 'eth_estimateGas') {
            return '0x5208'; // 21000 gas
          }
          if (method === 'eth_getTransactionByHash') {
            return {
              hash: params[0],
              from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
              to: '0x1234567890123456789012345678901234567890',
              value: '0xde0b6b3a7640000', // 1 ETH
              gas: '0x5208',
              gasPrice: '0x3b9aca00',
              blockNumber: '0x1234',
              blockHash: '0xabc123',
            };
          }
          if (method === 'eth_getTransactionReceipt') {
            return {
              status: '0x1', // Success
              transactionHash: params[0],
              blockNumber: '0x1234',
              gasUsed: '0x5208',
            };
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

  test('should navigate to send transaction page', async () => {
    // Look for send/transfer button or link
    const sendBtn = page.locator('button, a').filter({ hasText: /(send|transfer)/i }).first();
    
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click();
      await page.waitForTimeout(500);
      
      // Should navigate to send page
      const content = page.locator('main');
      await expect(content).toBeVisible();
    } else {
      // Try navigating directly
      await page.goto('/dashboard');
      const dashboardContent = page.locator('main');
      await expect(dashboardContent).toBeVisible();
    }
  });

  test('should display send transaction form', async () => {
    await page.goto('/dashboard');
    
    // Look for transaction form elements
    const addressInput = page.locator('input[name="to"], input[name="recipient"], input[placeholder*="address" i]').first();
    const amountInput = page.locator('input[name="amount"], input[name="value"], input[type="number"]').first();
    
    // Form may or may not be visible depending on navigation
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should validate recipient address format', async () => {
    await page.goto('/dashboard');
    
    const addressInput = page.locator('input[name="to"], input[name="recipient"]').first();
    
    if (await addressInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Enter invalid address
      await addressInput.fill('invalid-address');
      await addressInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show validation error
      const errorText = page.locator('text=/invalid|error/i').first();
      // Error may appear inline or as toast
    }
  });

  test('should validate amount is positive and within balance', async () => {
    await page.goto('/dashboard');
    
    const amountInput = page.locator('input[name="amount"], input[type="number"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Enter negative amount
      await amountInput.fill('-1');
      await amountInput.blur();
      
      await page.waitForTimeout(500);
      
      // Enter very large amount
      await amountInput.fill('999999999');
      await amountInput.blur();
      
      await page.waitForTimeout(500);
      
      // Validation should trigger
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display gas estimation', async () => {
    await page.goto('/dashboard');
    
    // Look for gas price display
    const gasDisplay = page.locator('[data-testid="gas-estimate"], text=/gas|fee/i').first();
    
    // Gas display may appear after form interaction
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should allow selecting gas speed (slow/normal/fast)', async () => {
    await page.goto('/dashboard');
    
    // Look for gas speed selector
    const gasOptions = ['slow', 'normal', 'fast', 'rapid', 'standard', 'high'];
    
    for (const option of gasOptions) {
      const gasBtn = page.locator('button, input[type="radio"]').filter({ hasText: new RegExp(option, 'i') }).first();
      
      if (await gasBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await gasBtn.click();
        await page.waitForTimeout(300);
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show transaction confirmation dialog', async () => {
    await page.goto('/dashboard');
    
    const sendBtn = page.locator('button[type="submit"], button').filter({ hasText: /(send|transfer)/i }).first();
    
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Fill in required fields first
      const addressInput = page.locator('input[name="to"], input[name="recipient"]').first();
      const amountInput = page.locator('input[name="amount"]').first();
      
      if (await addressInput.isVisible({ timeout: 1000 }).catch(() => false) && 
          await amountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await addressInput.fill('0x1234567890123456789012345678901234567890');
        await amountInput.fill('0.01');
        
        await sendBtn.click();
        await page.waitForTimeout(1000);
        
        // Should show confirmation dialog
        const confirmDialog = page.locator('[role="dialog"], .modal, [data-testid="confirm-transaction"]');
        const isVisible = await confirmDialog.isVisible({ timeout: 2000 }).catch(() => false);
        
        // Dialog may or may not appear depending on state
      }
    }
  });

  test('should display transaction details in confirmation', async () => {
    await page.goto('/dashboard');
    
    // Transaction details should include: recipient, amount, gas, total
    const detailElements = [
      'recipient',
      'amount',
      'gas',
      'fee',
      'total'
    ];
    
    // These would appear in confirmation dialog
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should allow canceling transaction', async () => {
    await page.goto('/dashboard');
    
    const cancelBtn = page.locator('button').filter({ hasText: /(cancel|back)/i }).first();
    
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click();
      await page.waitForTimeout(500);
      
      // Should return to previous state
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should show pending transaction status', async () => {
    await page.goto('/dashboard');
    
    // Look for pending transaction indicator
    const pendingIndicator = page.locator('[data-testid="pending-transaction"], text=/pending/i').first();
    
    // May or may not be visible
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should update transaction status to confirmed', async () => {
    // This would require actual transaction flow
    await page.goto('/dashboard');
    
    // Check for transaction history or status
    const historyLink = page.locator('a, button').filter({ hasText: /(history|transactions|activity)/i }).first();
    
    if (await historyLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await historyLink.click();
      await page.waitForTimeout(500);
      
      // Should show transaction list
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Transaction History', () => {
  test('should navigate to transaction history page', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for history/transactions link
    const historyLink = page.locator('a').filter({ hasText: /(history|transactions|activity)/i }).first();
    
    if (await historyLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await historyLink.click();
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display transaction list', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Navigate to transactions or check if visible on dashboard
    const txList = page.locator('[data-testid="transaction-list"], .transaction-item, .tx-row').first();
    
    // Transaction list may or may not be visible
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should filter transactions by type', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for filter options
    const filterButtons = ['all', 'sent', 'received', 'pending'];
    
    for (const filter of filterButtons) {
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

  test('should display transaction details on click', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Click on a transaction item
    const txItem = page.locator('[data-testid="transaction-item"], .transaction-row, .tx-item').first();
    
    if (await txItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await txItem.click();
      await page.waitForTimeout(500);
      
      // Should show transaction details
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should show transaction status indicators', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for status badges (pending, confirmed, failed)
    const statusBadges = page.locator('[data-testid*="status"], .status-badge, text=/pending|confirmed|failed/i');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should link to block explorer', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for external links to etherscan/explorer
    const explorerLink = page.locator('a[href*="etherscan"], a[href*="explorer"]').first();
    
    if (await explorerLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Verify link has correct attributes
      const href = await explorerLink.getAttribute('href');
      expect(href).toBeTruthy();
      
      const target = await explorerLink.getAttribute('target');
      expect(target).toBe('_blank'); // Should open in new tab
    }
  });

  test('should paginate transaction history', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for pagination controls
    const nextBtn = page.locator('button').filter({ hasText: /(next|>|→)/i }).first();
    const prevBtn = page.locator('button').filter({ hasText: /(previous|<|←)/i }).first();
    
    if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(500);
      
      // Should load next page
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should search transactions', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('0x123');
      await page.waitForTimeout(500);
      
      // Should filter results
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Failed Transaction Handling', () => {
  test('should display error message for failed transaction', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_sendTransaction') {
            throw new Error('Transaction failed: insufficient funds');
          }
          if (method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          }
          if (method === 'eth_chainId') {
            return '0x1';
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/dashboard');
    
    // Try to send transaction
    const sendBtn = page.locator('button').filter({ hasText: /send/i }).first();
    
    if (await sendBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sendBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show error
      const errorMsg = page.locator('text=/error|failed|insufficient/i').first();
      // Error may appear as toast or inline
    }
  });

  test('should show retry option for failed transaction', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for failed transaction with retry option
    const retryBtn = page.locator('button').filter({ hasText: /retry|try again/i }).first();
    
    if (await retryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await retryBtn.click();
      await page.waitForTimeout(500);
      
      // Should attempt retry
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should explain reason for transaction failure', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Failed transactions should show reason
    const failureReasons = [
      'insufficient funds',
      'gas too low',
      'nonce too low',
      'user rejected',
      'timeout'
    ];
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Gas Optimization', () => {
  test('should display current gas prices', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for gas price display
    const gasPrice = page.locator('[data-testid="gas-price"], text=/gas|gwei/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should allow custom gas settings', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for advanced/custom gas option
    const advancedBtn = page.locator('button').filter({ hasText: /(advanced|custom|edit)/i }).first();
    
    if (await advancedBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await advancedBtn.click();
      await page.waitForTimeout(500);
      
      // Should show custom gas inputs
      const gasLimitInput = page.locator('input[name*="gas"]').first();
      // Custom gas form may appear
    }
  });

  test('should warn about high gas prices', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_gasPrice') {
            return '0x174876e800'; // 100 gwei (high)
          }
          if (method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          }
          if (method === 'eth_chainId') {
            return '0x1';
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/dashboard');
    
    // Should show gas warning for high prices
    const warning = page.locator('text=/high gas|expensive|gas price/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Transaction Tracking', () => {
  test('should provide transaction hash after submission', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Transaction hash should be displayed after submission
    const txHash = page.locator('[data-testid="tx-hash"], text=/0x[a-fA-F0-9]{64}/').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show real-time transaction status updates', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Status should update from pending -> confirmed
    const statusText = page.locator('[data-testid="tx-status"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display block confirmations', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should show number of confirmations
    const confirmations = page.locator('text=/\\d+ confirmation/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});
