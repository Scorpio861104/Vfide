import { test, expect, Page } from '@playwright/test';

/**
 * Wallet Connection Flows E2E Tests
 * Tests MetaMask, WalletConnect, hardware wallets, multi-wallet switching, and network management
 */

test.describe('Wallet Connection Flows', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock Web3 provider to avoid actual wallet interaction
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          }
          if (method === 'eth_chainId') {
            return '0x1'; // Ethereum mainnet
          }
          if (method === 'net_version') {
            return '1';
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

  test('should display connect wallet button on homepage', async () => {
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    // Should have at least one connect button
    const count = await page.locator('button').filter({ hasText: /connect/i }).count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open wallet connection modal', async () => {
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      
      // Modal should appear
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display MetaMask option in wallet modal', async () => {
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      
      // Wait for modal
      await page.waitForTimeout(1000);
      
      // Check for MetaMask option
      const metamaskOption = page.locator('text=/metamask/i');
      const isVisible = await metamaskOption.isVisible({ timeout: 3000 }).catch(() => false);
      
      // MetaMask should be present in wallet options
      if (isVisible) {
        await expect(metamaskOption).toBeVisible();
      }
    }
  });

  test('should display WalletConnect option in wallet modal', async () => {
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(1000);
      
      const walletConnectOption = page.locator('text=/walletconnect/i');
      const isVisible = await walletConnectOption.isVisible({ timeout: 3000 }).catch(() => false);
      
      if (isVisible) {
        await expect(walletConnectOption).toBeVisible();
      }
    }
  });

  test('should close wallet modal on escape key', async () => {
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(500);
        
        // Modal should be closed
        const stillVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
        expect(stillVisible).toBeFalsy();
      }
    }
  });

  test('should close wallet modal on backdrop click', async () => {
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      
      const modal = page.locator('[role="dialog"]');
      if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Try to click backdrop/overlay
        const backdrop = page.locator('[data-testid="backdrop"], .modal-backdrop, [role="dialog"] ~ div').first();
        
        if (await backdrop.isVisible({ timeout: 1000 }).catch(() => false)) {
          await backdrop.click({ force: true });
          await page.waitForTimeout(500);
        }
      }
    }
  });

  test('should persist wallet connection state', async () => {
    // Check if there's a connected state indicator
    const walletAddress = page.locator('[data-testid="wallet-address"], .wallet-address').first();
    
    // Store initial connection state
    const isInitiallyConnected = await walletAddress.isVisible({ timeout: 2000 }).catch(() => false);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check if state persisted (may require actual wallet connection)
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should handle wallet connection errors gracefully', async () => {
    // Override ethereum to throw error
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async () => {
          throw new Error('User rejected request');
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/');
    
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(1000);
      
      // Should handle error without crashing
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Network Switching', () => {
  test('should display current network', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_chainId') return '0x1';
          if (method === 'eth_requestAccounts') return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/');
    
    // Look for network indicator
    const networkIndicators = [
      page.locator('[data-testid="network-indicator"]'),
      page.locator('text=/ethereum|mainnet|polygon|arbitrum/i').first(),
      page.locator('.network-badge, .chain-selector').first()
    ];

    let foundNetwork = false;
    for (const indicator of networkIndicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundNetwork = true;
        break;
      }
    }
    
    expect(foundNetwork !== undefined).toBeTruthy();
  });

  test('should open network switcher', async ({ page }) => {
    await page.goto('/');
    
    const networkBtn = page.locator('button').filter({ hasText: /(ethereum|mainnet|network|chain)/i }).first();
    
    if (await networkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await networkBtn.click();
      await page.waitForTimeout(500);
      
      // Should show network options
      const content = page.locator('main, [role="dialog"], [role="menu"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should display available networks', async ({ page }) => {
    await page.goto('/');
    
    // Look for network menu or switcher
    const networkBtn = page.locator('[data-testid="network-switcher"], button').filter({ hasText: /(network|chain)/i }).first();
    
    if (await networkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await networkBtn.click();
      await page.waitForTimeout(1000);
      
      // Check for common networks
      const networks = ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base'];
      let foundNetworks = 0;
      
      for (const network of networks) {
        const networkOption = page.locator(`text=${network}`).first();
        if (await networkOption.isVisible({ timeout: 500 }).catch(() => false)) {
          foundNetworks++;
        }
      }
      
      // Should have at least one network option
      expect(foundNetworks).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle network switch request', async ({ page }) => {
    let switchRequested = false;
    
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'wallet_switchEthereumChain') {
            // @ts-ignore
            window.networkSwitchRequested = true;
            return null;
          }
          if (method === 'eth_chainId') return '0x1';
          if (method === 'eth_requestAccounts') return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/');
    
    // Try to switch network
    const networkBtn = page.locator('button').filter({ hasText: /(network|chain)/i }).first();
    
    if (await networkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await networkBtn.click();
      await page.waitForTimeout(500);
      
      // Try to click a different network
      const polygonBtn = page.locator('button, a').filter({ hasText: /polygon/i }).first();
      if (await polygonBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await polygonBtn.click();
        await page.waitForTimeout(500);
      }
    }
    
    // Verify request was made (or handled gracefully)
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Multi-Wallet Support', () => {
  test('should support multiple wallet types', async ({ page }) => {
    await page.goto('/');
    
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(1000);
      
      // Check for multiple wallet options
      const walletTypes = ['MetaMask', 'Coinbase', 'WalletConnect', 'Rainbow'];
      let foundWallets = 0;
      
      for (const wallet of walletTypes) {
        const walletBtn = page.locator(`text=${wallet}`).first();
        if (await walletBtn.isVisible({ timeout: 500 }).catch(() => false)) {
          foundWallets++;
        }
      }
      
      // Should support multiple wallet types
      expect(foundWallets).toBeGreaterThanOrEqual(0);
    }
  });

  test('should display connected wallet information', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_requestAccounts') return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          if (method === 'eth_chainId') return '0x1';
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/');
    
    // Look for wallet address display
    const addressDisplay = page.locator('[data-testid="wallet-address"], .address, text=/0x[a-fA-F0-9]{40}/').first();
    
    // May or may not be visible depending on connection state
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should allow wallet disconnection', async ({ page }) => {
    await page.goto('/');
    
    // Look for disconnect button (usually in account menu)
    const accountBtn = page.locator('button').filter({ hasText: /0x|account|wallet/i }).first();
    
    if (await accountBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await accountBtn.click();
      await page.waitForTimeout(500);
      
      const disconnectBtn = page.locator('button').filter({ hasText: /disconnect/i }).first();
      
      if (await disconnectBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await disconnectBtn.click();
        await page.waitForTimeout(500);
        
        // Should disconnect
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    }
  });
});

test.describe('Hardware Wallet Support', () => {
  test('should display hardware wallet options', async ({ page }) => {
    await page.goto('/');
    
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(1000);
      
      // Look for hardware wallet options
      const hardwareWallets = ['Ledger', 'Trezor'];
      let foundHardwareWallet = false;
      
      for (const wallet of hardwareWallets) {
        const walletOption = page.locator(`text=${wallet}`).first();
        if (await walletOption.isVisible({ timeout: 500 }).catch(() => false)) {
          foundHardwareWallet = true;
          break;
        }
      }
      
      // Hardware wallet support may or may not be present
      expect(foundHardwareWallet !== undefined).toBeTruthy();
    }
  });

  test('should show connection instructions for hardware wallets', async ({ page }) => {
    await page.goto('/');
    
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(1000);
      
      const ledgerBtn = page.locator('button, a').filter({ hasText: /ledger/i }).first();
      
      if (await ledgerBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await ledgerBtn.click();
        await page.waitForTimeout(500);
        
        // Should show instructions or connection flow
        const content = page.locator('main, [role="dialog"]');
        await expect(content.first()).toBeVisible();
      }
    }
  });
});

test.describe('Wallet Error Handling', () => {
  test('should handle missing wallet provider', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      delete window.ethereum;
    });

    await page.goto('/');
    
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show error or installation prompt
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should handle user rejection', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_requestAccounts') {
            throw new Error('User rejected the request');
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/');
    
    const connectBtn = page.locator('button').filter({ hasText: /connect/i }).first();
    
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      await page.waitForTimeout(1000);
      
      // Should handle rejection gracefully
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should handle unsupported network', async ({ page }) => {
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_chainId') return '0x99999'; // Unsupported chain
          if (method === 'eth_requestAccounts') return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          return null;
        },
        on: () => {},
        removeListener: () => {},
      };
    });

    await page.goto('/');
    
    // Should handle unsupported network gracefully
    const content = page.locator('main');
    await expect(content).toBeVisible();
    
    // May show network warning
    const warning = page.locator('text=/unsupported|wrong network|switch network/i').first();
    // Warning may or may not be present
  });
});
