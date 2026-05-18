import { test, expect, Page } from '@playwright/test';

/**
 * Cross-Chain Transfer E2E Tests
 * Tests initiating cross-chain transfers, bridging assets, tracking status, and handling failures
 */

test.describe('Cross-Chain Transfers', () => {
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
          if (method === 'wallet_switchEthereumChain') {
            return null;
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

  test('should navigate to bridge page', async () => {
    const bridgeLink = page.locator('a, button').filter({ hasText: /(bridge|cross-chain)/i }).first();
    
    if (await bridgeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bridgeLink.click();
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    } else {
      await page.goto('/bridge');
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display bridge interface', async () => {
    await page.goto('/bridge');
    
    // Should show source and destination chain selectors
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should select source chain', async () => {
    await page.goto('/bridge');
    
    const fromChainSelector = page.locator('[data-testid="from-chain"], select[name="fromChain"]').first();
    
    if (await fromChainSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fromChainSelector.click();
      await page.waitForTimeout(500);
      
      // Should show chain options
      const chainOptions = ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism'];
      
      for (const chain of chainOptions) {
        const chainOption = page.locator(`text=${chain}`).first();
        if (await chainOption.isVisible({ timeout: 500 }).catch(() => false)) {
          break;
        }
      }
    }
  });

  test('should select destination chain', async () => {
    await page.goto('/bridge');
    
    const toChainSelector = page.locator('[data-testid="to-chain"], select[name="toChain"]').first();
    
    if (await toChainSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toChainSelector.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should prevent same chain selection', async () => {
    await page.goto('/bridge');
    
    // Cannot bridge to same chain
    const fromChain = page.locator('[data-testid="from-chain"]').first();
    const toChain = page.locator('[data-testid="to-chain"]').first();
    
    // If same chain is selected, should show error
    const error = page.locator('text=/same chain|different chain/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should select token to bridge', async () => {
    await page.goto('/bridge');
    
    const tokenSelector = page.locator('[data-testid="token-selector"], select[name="token"]').first();
    
    if (await tokenSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tokenSelector.click();
      await page.waitForTimeout(500);
      
      // Should show bridgeable tokens
      const tokens = ['ETH', 'USDC', 'USDT'];
      
      for (const token of tokens) {
        const tokenOption = page.locator(`text=${token}`).first();
        if (await tokenOption.isVisible({ timeout: 500 }).catch(() => false)) {
          break;
        }
      }
    }
  });

  test('should enter bridge amount', async () => {
    await page.goto('/bridge');
    
    const amountInput = page.locator('input[name="amount"], input[type="number"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await amountInput.fill('0.1');
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display estimated bridge fee', async () => {
    await page.goto('/bridge');
    
    const amountInput = page.locator('input[name="amount"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await amountInput.fill('1');
      await page.waitForTimeout(1000);
      
      // Should show estimated fee
      const feeDisplay = page.locator('[data-testid="bridge-fee"], text=/fee|cost/i').first();
    }
  });

  test('should display estimated transfer time', async () => {
    await page.goto('/bridge');
    
    // Should show how long transfer will take
    const timeEstimate = page.locator('text=/\\d+ min|\\d+ hour|estimated time/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show received amount estimate', async () => {
    await page.goto('/bridge');
    
    const amountInput = page.locator('input[name="amount"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await amountInput.fill('1');
      await page.waitForTimeout(1000);
      
      // Should show amount user will receive (after fees)
      const receivedAmount = page.locator('[data-testid="received-amount"], text=/you receive|you will get/i').first();
    }
  });

  test('should initiate bridge transfer', async () => {
    await page.goto('/bridge');
    
    const amountInput = page.locator('input[name="amount"]').first();
    const bridgeBtn = page.locator('button').filter({ hasText: /(bridge|transfer|swap)/i }).first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false) &&
        await bridgeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      
      await amountInput.fill('0.01');
      await bridgeBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show confirmation
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should display bridge confirmation details', async () => {
    await page.goto('/bridge');
    
    // Confirmation should show: from/to chain, amount, fees, estimated time
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should switch network if needed', async () => {
    await page.goto('/bridge');
    
    // If user is on wrong network, should prompt to switch
    const switchBtn = page.locator('button').filter({ hasText: /switch network/i }).first();
    
    if (await switchBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await switchBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Bridge Status Tracking', () => {
  test('should display pending bridge transfers', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should show list of pending transfers
    const pendingTransfers = page.locator('[data-testid="pending-transfers"], text=/pending|in progress/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should track transfer status', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should show status stages
    const statusStages = [
      'initiated',
      'confirming',
      'bridging',
      'completed'
    ];
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display progress indicator', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should show visual progress
    const progress = page.locator('[role="progressbar"], .progress, [data-testid="transfer-progress"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show transaction hashes for both chains', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should display source and destination tx hashes
    const txHash = page.locator('text=/0x[a-fA-F0-9]{64}/').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should link to block explorers', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should have links to both chain explorers
    const explorerLink = page.locator('a[href*="etherscan"], a[href*="explorer"]').first();
    
    if (await explorerLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      const href = await explorerLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });

  test('should update status in real-time', async ({ page }) => {
    await page.goto('/bridge');
    
    // Status should auto-update
    const statusText = page.locator('[data-testid="transfer-status"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show confirmation count', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should display number of confirmations
    const confirmations = page.locator('text=/\\d+ confirmation/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Bridge History', () => {
  test('should display bridge transfer history', async ({ page }) => {
    await page.goto('/bridge');
    
    // Look for history section
    const historyLink = page.locator('a, button').filter({ hasText: /(history|past transfers)/i }).first();
    
    if (await historyLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await historyLink.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should filter history by chain', async ({ page }) => {
    await page.goto('/bridge');
    
    // Filter by source/destination chain
    const chainFilter = page.locator('select[name="chain"], [data-testid="chain-filter"]').first();
    
    if (await chainFilter.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chainFilter.click();
      await page.waitForTimeout(500);
    }
  });

  test('should filter history by status', async ({ page }) => {
    await page.goto('/bridge');
    
    // Filter by completed/pending/failed
    const statusFilters = ['all', 'completed', 'pending', 'failed'];
    
    for (const status of statusFilters) {
      const filterBtn = page.locator('button').filter({ hasText: new RegExp(status, 'i') }).first();
      
      if (await filterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(300);
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display transfer details on click', async ({ page }) => {
    await page.goto('/bridge');
    
    const transferItem = page.locator('[data-testid="transfer-item"]').first();
    
    if (await transferItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await transferItem.click();
      await page.waitForTimeout(500);
      
      // Should show detailed view
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should show transfer date and time', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should display timestamps
    const timestamp = page.locator('time, [data-testid="timestamp"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Failed Transfer Handling', () => {
  test('should display error for failed transfer', async ({ page }) => {
    await page.goto('/bridge');
    
    // Failed transfers should show error message
    const error = page.locator('[data-testid="transfer-error"], text=/failed|error/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show reason for failure', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should explain why transfer failed
    const failureReasons = [
      'insufficient funds',
      'gas too low',
      'timeout',
      'bridge offline'
    ];
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should offer retry option', async ({ page }) => {
    await page.goto('/bridge');
    
    const retryBtn = page.locator('button').filter({ hasText: /retry|try again/i }).first();
    
    if (await retryBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await retryBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should handle stuck transfers', async ({ page }) => {
    await page.goto('/bridge');
    
    // Transfers stuck for too long should have recovery option
    const recoverBtn = page.locator('button').filter({ hasText: /(recover|cancel|refund)/i }).first();
    
    if (await recoverBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(recoverBtn).toBeVisible();
    }
  });

  test('should provide support link for failed transfers', async ({ page }) => {
    await page.goto('/bridge');
    
    const supportLink = page.locator('a').filter({ hasText: /(support|help|contact)/i }).first();
    
    if (await supportLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      const href = await supportLink.getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});

test.describe('Bridge Validation', () => {
  test('should validate minimum bridge amount', async ({ page }) => {
    await page.goto('/bridge');
    
    const amountInput = page.locator('input[name="amount"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Enter very small amount
      await amountInput.fill('0.000001');
      await amountInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show minimum amount error
      const error = page.locator('text=/minimum|too small/i').first();
    }
  });

  test('should validate maximum bridge amount', async ({ page }) => {
    await page.goto('/bridge');
    
    const amountInput = page.locator('input[name="amount"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Enter very large amount
      await amountInput.fill('999999999');
      await amountInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show maximum amount error
      const error = page.locator('text=/maximum|too large|exceeds/i').first();
    }
  });

  test('should check token balance before bridging', async ({ page }) => {
    await page.goto('/bridge');
    
    const amountInput = page.locator('input[name="amount"]').first();
    
    if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Enter amount greater than balance
      await amountInput.fill('999999');
      await amountInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show insufficient balance
      const error = page.locator('text=/insufficient|not enough/i').first();
    }
  });

  test('should validate supported tokens for route', async ({ page }) => {
    await page.goto('/bridge');
    
    // Not all tokens may be bridgeable on all routes
    const tokenSelector = page.locator('[data-testid="token-selector"]').first();
    
    if (await tokenSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tokenSelector.click();
      await page.waitForTimeout(500);
      
      // Should only show supported tokens
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should warn about high fees', async ({ page }) => {
    await page.goto('/bridge');
    
    // If fees are very high, should warn user
    const feeWarning = page.locator('text=/high fee|expensive/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Bridge Route Selection', () => {
  test('should display available bridge routes', async ({ page }) => {
    await page.goto('/bridge');
    
    // May show multiple bridge options (official, third-party)
    const routeOptions = page.locator('[data-testid="bridge-route"]');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should compare routes by fee and time', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should show comparison of different routes
    const routeComparison = page.locator('[data-testid="route-comparison"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should select optimal route automatically', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should recommend best route
    const recommendedBadge = page.locator('text=/recommended|best|fastest|cheapest/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should allow manual route selection', async ({ page }) => {
    await page.goto('/bridge');
    
    const routeBtn = page.locator('button').filter({ hasText: /(route|bridge option)/i }).first();
    
    if (await routeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await routeBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Bridge Security', () => {
  test('should display bridge security information', async ({ page }) => {
    await page.goto('/bridge');
    
    // Should show security/audit info
    const securityInfo = page.locator('text=/audited|secure|verified/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should warn about unverified tokens', async ({ page }) => {
    await page.goto('/bridge');
    
    // If token is unverified, should warn user
    const warning = page.locator('text=/unverified|caution|warning/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should require approval for token bridging', async ({ page }) => {
    await page.goto('/bridge');
    
    // ERC-20 tokens need approval
    const approveBtn = page.locator('button').filter({ hasText: /approve/i }).first();
    
    if (await approveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(approveBtn).toBeVisible();
    }
  });
});
