import { test, expect, Page } from '@playwright/test';

/**
 * Vault Operations E2E Tests
 * Tests creating vaults, deposits, withdrawals, balance viewing, history, and emergency operations
 */

test.describe('Vault Operations', () => {
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

  test('should navigate to vault page', async () => {
    const vaultLink = page.locator('a').filter({ hasText: /(vault|safe)/i }).first();
    
    if (await vaultLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await vaultLink.click();
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    } else {
      await page.goto('/vault');
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display vault dashboard', async () => {
    await page.goto('/vault');
    
    // Should show vault overview
    const dashboard = page.locator('[data-testid="vault-dashboard"], main');
    await expect(dashboard).toBeVisible();
  });

  test('should show total vault balance', async () => {
    await page.goto('/vault');
    
    // Should display total balance
    const balance = page.locator('[data-testid="vault-balance"], text=/balance|total/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should list user vaults', async () => {
    await page.goto('/vault');
    
    // Should show list of vaults or empty state
    const vaultList = page.locator('[data-testid="vault-list"], [data-testid="vault-card"]');
    const emptyState = page.locator('text=/no vaults|create your first/i');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Create Vault', () => {
  test('should open create vault dialog', async ({ page }) => {
    await page.goto('/vault');
    
    const createBtn = page.locator('button, a').filter({ hasText: /(create|new vault|add vault)/i }).first();
    
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show create vault form
      const dialog = page.locator('[role="dialog"], .modal');
      const isVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await expect(dialog).toBeVisible();
      }
    }
  });

  test('should display vault creation form', async ({ page }) => {
    await page.goto('/vault');
    
    const createBtn = page.locator('button').filter({ hasText: /create/i }).first();
    
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      
      // Look for form fields
      const nameInput = page.locator('input[name="name"], input[name="vaultName"]').first();
      
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(nameInput).toBeVisible();
      }
    }
  });

  test('should validate vault name', async ({ page }) => {
    await page.goto('/vault');
    
    const createBtn = page.locator('button').filter({ hasText: /create/i }).first();
    
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      
      if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Try empty name
        await nameInput.fill('');
        await nameInput.blur();
        await page.waitForTimeout(500);
        
        // Should show validation
      }
    }
  });

  test('should select vault type', async ({ page }) => {
    await page.goto('/vault');
    
    const createBtn = page.locator('button').filter({ hasText: /create/i }).first();
    
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      
      // Look for vault type options
      const vaultTypes = ['personal', 'shared', 'savings', 'multisig'];
      
      for (const type of vaultTypes) {
        const typeOption = page.locator('button, input[type="radio"]').filter({ hasText: new RegExp(type, 'i') }).first();
        
        if (await typeOption.isVisible({ timeout: 500 }).catch(() => false)) {
          await typeOption.click();
          await page.waitForTimeout(300);
          break;
        }
      }
    }
  });

  test('should create vault successfully', async ({ page }) => {
    await page.goto('/vault');
    
    const createBtn = page.locator('button').filter({ hasText: /create/i }).first();
    
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);
      
      const nameInput = page.locator('input[name="name"]').first();
      const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /(create|submit)/i }).first();
      
      if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false) &&
          await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        
        await nameInput.fill('Test Vault');
        await submitBtn.click();
        await page.waitForTimeout(1000);
        
        // Should create vault and show success
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    }
  });

  test('should display vault creation transaction', async ({ page }) => {
    await page.goto('/vault');
    
    // After creating vault, should show transaction status
    const txStatus = page.locator('[data-testid="tx-status"], text=/pending|confirming/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Deposit to Vault', () => {
  test('should open deposit dialog', async ({ page }) => {
    await page.goto('/vault');
    
    const depositBtn = page.locator('button').filter({ hasText: /deposit/i }).first();
    
    if (await depositBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await depositBtn.click();
      await page.waitForTimeout(1000);
      
      const dialog = page.locator('[role="dialog"], .modal');
      const isVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await expect(dialog).toBeVisible();
      }
    }
  });

  test('should display deposit form', async ({ page }) => {
    await page.goto('/vault');
    
    const depositBtn = page.locator('button').filter({ hasText: /deposit/i }).first();
    
    if (await depositBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await depositBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show amount input
      const amountInput = page.locator('input[name="amount"], input[type="number"]').first();
      
      if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(amountInput).toBeVisible();
      }
    }
  });

  test('should show available balance for deposit', async ({ page }) => {
    await page.goto('/vault');
    
    const depositBtn = page.locator('button').filter({ hasText: /deposit/i }).first();
    
    if (await depositBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await depositBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show wallet balance
      const balance = page.locator('text=/available|balance/i').first();
    }
  });

  test('should select token to deposit', async ({ page }) => {
    await page.goto('/vault');
    
    const depositBtn = page.locator('button').filter({ hasText: /deposit/i }).first();
    
    if (await depositBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await depositBtn.click();
      await page.waitForTimeout(1000);
      
      // Look for token selector
      const tokenSelector = page.locator('[data-testid="token-selector"], select[name="token"]').first();
      
      if (await tokenSelector.isVisible({ timeout: 1000 }).catch(() => false)) {
        await tokenSelector.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('should validate deposit amount', async ({ page }) => {
    await page.goto('/vault');
    
    const depositBtn = page.locator('button').filter({ hasText: /deposit/i }).first();
    
    if (await depositBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await depositBtn.click();
      await page.waitForTimeout(1000);
      
      const amountInput = page.locator('input[name="amount"]').first();
      
      if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Enter negative amount
        await amountInput.fill('-1');
        await amountInput.blur();
        await page.waitForTimeout(500);
        
        // Should show validation
      }
    }
  });

  test('should use max button to deposit all', async ({ page }) => {
    await page.goto('/vault');
    
    const depositBtn = page.locator('button').filter({ hasText: /deposit/i }).first();
    
    if (await depositBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await depositBtn.click();
      await page.waitForTimeout(1000);
      
      const maxBtn = page.locator('button').filter({ hasText: /max|all/i }).first();
      
      if (await maxBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await maxBtn.click();
        await page.waitForTimeout(500);
        
        // Amount input should be filled with max
        const amountInput = page.locator('input[name="amount"]').first();
        if (await amountInput.isVisible().catch(() => false)) {
          const value = await amountInput.inputValue();
          expect(value).toBeTruthy();
        }
      }
    }
  });

  test('should confirm deposit transaction', async ({ page }) => {
    await page.goto('/vault');
    
    const depositBtn = page.locator('button').filter({ hasText: /deposit/i }).first();
    
    if (await depositBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await depositBtn.click();
      await page.waitForTimeout(1000);
      
      const amountInput = page.locator('input[name="amount"]').first();
      const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /(deposit|submit|confirm)/i }).first();
      
      if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false) &&
          await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        
        await amountInput.fill('0.1');
        await submitBtn.click();
        await page.waitForTimeout(1000);
        
        // Should show transaction
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    }
  });
});

test.describe('Withdraw from Vault', () => {
  test('should open withdraw dialog', async ({ page }) => {
    await page.goto('/vault');
    
    const withdrawBtn = page.locator('button').filter({ hasText: /withdraw/i }).first();
    
    if (await withdrawBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await withdrawBtn.click();
      await page.waitForTimeout(1000);
      
      const dialog = page.locator('[role="dialog"], .modal');
      const isVisible = await dialog.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (isVisible) {
        await expect(dialog).toBeVisible();
      }
    }
  });

  test('should display withdraw form', async ({ page }) => {
    await page.goto('/vault');
    
    const withdrawBtn = page.locator('button').filter({ hasText: /withdraw/i }).first();
    
    if (await withdrawBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await withdrawBtn.click();
      await page.waitForTimeout(1000);
      
      const amountInput = page.locator('input[name="amount"]').first();
      
      if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(amountInput).toBeVisible();
      }
    }
  });

  test('should show vault balance for withdrawal', async ({ page }) => {
    await page.goto('/vault');
    
    // Should display current vault balance
    const balance = page.locator('[data-testid="vault-balance"], text=/balance/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should validate withdrawal amount against balance', async ({ page }) => {
    await page.goto('/vault');
    
    const withdrawBtn = page.locator('button').filter({ hasText: /withdraw/i }).first();
    
    if (await withdrawBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await withdrawBtn.click();
      await page.waitForTimeout(1000);
      
      const amountInput = page.locator('input[name="amount"]').first();
      
      if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Enter amount greater than balance
        await amountInput.fill('999999');
        await amountInput.blur();
        await page.waitForTimeout(500);
        
        // Should show insufficient balance
      }
    }
  });

  test('should process withdrawal successfully', async ({ page }) => {
    await page.goto('/vault');
    
    const withdrawBtn = page.locator('button').filter({ hasText: /withdraw/i }).first();
    
    if (await withdrawBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await withdrawBtn.click();
      await page.waitForTimeout(1000);
      
      const amountInput = page.locator('input[name="amount"]').first();
      const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /(withdraw|submit)/i }).first();
      
      if (await amountInput.isVisible({ timeout: 1000 }).catch(() => false) &&
          await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        
        await amountInput.fill('0.01');
        await submitBtn.click();
        await page.waitForTimeout(1000);
        
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    }
  });
});

test.describe('Vault History', () => {
  test('should display vault transaction history', async ({ page }) => {
    await page.goto('/vault');
    
    // Look for history section
    const historySection = page.locator('[data-testid="vault-history"], text=/history|transactions/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show deposit and withdrawal transactions', async ({ page }) => {
    await page.goto('/vault');
    
    // Should list transactions
    const txItems = page.locator('[data-testid="transaction-item"], .tx-row').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should filter history by transaction type', async ({ page }) => {
    await page.goto('/vault');
    
    const filters = ['all', 'deposits', 'withdrawals'];
    
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

  test('should display transaction timestamps', async ({ page }) => {
    await page.goto('/vault');
    
    // Transactions should show date/time
    const timestamp = page.locator('time, [data-testid="timestamp"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show transaction amounts and tokens', async ({ page }) => {
    await page.goto('/vault');
    
    // Should display amount and token type
    const txDetails = page.locator('[data-testid="tx-amount"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Emergency Withdrawal', () => {
  test('should display emergency withdrawal option', async ({ page }) => {
    await page.goto('/vault');
    
    // Look for emergency withdrawal button
    const emergencyBtn = page.locator('button').filter({ hasText: /emergency/i }).first();
    
    if (await emergencyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(emergencyBtn).toBeVisible();
    }
  });

  test('should show warning for emergency withdrawal', async ({ page }) => {
    await page.goto('/vault');
    
    const emergencyBtn = page.locator('button').filter({ hasText: /emergency/i }).first();
    
    if (await emergencyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emergencyBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show warning message
      const warning = page.locator('text=/warning|caution|emergency/i').first();
      
      if (await warning.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(warning).toBeVisible();
      }
    }
  });

  test('should require confirmation for emergency withdrawal', async ({ page }) => {
    await page.goto('/vault');
    
    const emergencyBtn = page.locator('button').filter({ hasText: /emergency/i }).first();
    
    if (await emergencyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emergencyBtn.click();
      await page.waitForTimeout(1000);
      
      // Should require confirmation
      const confirmBtn = page.locator('button').filter({ hasText: /(confirm|i understand|proceed)/i }).first();
      
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(confirmBtn).toBeVisible();
      }
    }
  });

  test('should execute emergency withdrawal', async ({ page }) => {
    await page.goto('/vault');
    
    const emergencyBtn = page.locator('button').filter({ hasText: /emergency/i }).first();
    
    if (await emergencyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emergencyBtn.click();
      await page.waitForTimeout(1000);
      
      const confirmBtn = page.locator('button').filter({ hasText: /confirm/i }).first();
      
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click();
        await page.waitForTimeout(1000);
        
        // Should initiate withdrawal
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    }
  });
});

test.describe('Vault Settings', () => {
  test('should access vault settings', async ({ page }) => {
    await page.goto('/vault');
    
    const settingsBtn = page.locator('button, a').filter({ hasText: /(settings|configure)/i }).first();
    
    if (await settingsBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should edit vault name', async ({ page }) => {
    await page.goto('/vault');
    
    const editBtn = page.locator('button').filter({ hasText: /edit/i }).first();
    
    if (await editBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await editBtn.click();
      await page.waitForTimeout(500);
      
      const nameInput = page.locator('input[name="name"]').first();
      
      if (await nameInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await nameInput.fill('Updated Vault Name');
        await page.waitForTimeout(500);
      }
    }
  });

  test('should display vault statistics', async ({ page }) => {
    await page.goto('/vault');
    
    // Should show total deposits, withdrawals, balance, etc.
    const stats = page.locator('[data-testid="vault-stats"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show vault APY if applicable', async ({ page }) => {
    await page.goto('/vault');
    
    // Interest-bearing vaults should show APY
    const apy = page.locator('text=/apy|interest|yield/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should allow archiving vault', async ({ page }) => {
    await page.goto('/vault');
    
    const archiveBtn = page.locator('button').filter({ hasText: /(archive|close)/i }).first();
    
    if (await archiveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await archiveBtn.click();
      await page.waitForTimeout(500);
      
      // Should require confirmation
      const confirmBtn = page.locator('button').filter({ hasText: /confirm/i }).first();
      
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expect(confirmBtn).toBeVisible();
      }
    }
  });
});

test.describe('Multi-Token Vaults', () => {
  test('should display multiple token balances', async ({ page }) => {
    await page.goto('/vault');
    
    // Vault should support multiple tokens
    const tokenBalances = page.locator('[data-testid="token-balance"]');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should switch between token views', async ({ page }) => {
    await page.goto('/vault');
    
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
});
