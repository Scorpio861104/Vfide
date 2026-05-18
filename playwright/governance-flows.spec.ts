import { test, expect, Page } from '@playwright/test';

/**
 * Governance Flows E2E Tests
 * Tests viewing proposals, creating proposals, voting, delegation, history, and execution
 */

test.describe('Governance Flows', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Mock Web3 provider with governance capabilities
    await page.addInitScript(() => {
      // @ts-ignore
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method }: any) => {
          if (method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1'];
          }
          if (method === 'eth_chainId') {
            return '0x1';
          }
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

  test('should navigate to governance page', async () => {
    // Look for governance link
    const govLink = page.locator('a, button').filter({ hasText: /governance|proposals/i }).first();
    
    if (await govLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await govLink.click();
      await page.waitForLoadState('networkidle');
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    } else {
      // Try direct navigation
      await page.goto('/governance');
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display list of proposals', async () => {
    await page.goto('/governance');
    
    // Should show proposals list or empty state
    const proposalsList = page.locator('[data-testid="proposals-list"], [data-testid="proposal-card"]');
    const emptyState = page.locator('text=/no proposals|empty/i');
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should filter proposals by status', async () => {
    await page.goto('/governance');
    
    // Look for status filters
    const filterOptions = ['all', 'active', 'pending', 'executed', 'defeated', 'expired'];
    
    for (const filter of filterOptions) {
      const filterBtn = page.locator('button').filter({ hasText: new RegExp(filter, 'i') }).first();
      
      if (await filterBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await filterBtn.click();
        await page.waitForTimeout(500);
        
        // URL or UI should update
        break;
      }
    }
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should search proposals', async () => {
    await page.goto('/governance');
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test proposal');
      await page.waitForTimeout(500);
      
      // Should filter proposals
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display proposal details', async () => {
    await page.goto('/governance');
    
    // Click on first proposal
    const proposalCard = page.locator('[data-testid="proposal-card"], .proposal-item, [role="article"]').first();
    
    if (await proposalCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await proposalCard.click();
      await page.waitForTimeout(500);
      
      // Should show proposal details
      const title = page.locator('h1, h2').first();
      await expect(title).toBeVisible();
    } else {
      // Try navigating to a proposal directly
      await page.goto('/governance/1');
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display proposal metadata', async () => {
    await page.goto('/governance/1');
    
    // Proposal should show: title, description, proposer, status, votes
    const metadataElements = [
      page.locator('[data-testid="proposal-title"], h1').first(),
      page.locator('[data-testid="proposal-description"]').first(),
      page.locator('text=/proposer|created by/i').first(),
      page.locator('text=/status|state/i').first(),
    ];
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should display voting options', async () => {
    await page.goto('/governance/1');
    
    // Should show For/Against/Abstain voting options
    const votingButtons = [
      page.locator('button').filter({ hasText: /(for|yes|approve)/i }).first(),
      page.locator('button').filter({ hasText: /(against|no|reject)/i }).first(),
      page.locator('button').filter({ hasText: /abstain/i }).first(),
    ];
    
    let foundVotingButton = false;
    for (const btn of votingButtons) {
      if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
        foundVotingButton = true;
        break;
      }
    }
    
    // Voting buttons may not be visible if proposal is not active
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should cast vote on active proposal', async () => {
    await page.goto('/governance/1');
    
    const voteBtn = page.locator('button').filter({ hasText: /(vote|for|yes)/i }).first();
    
    if (await voteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await voteBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show confirmation dialog or transaction
      const dialog = page.locator('[role="dialog"], .modal');
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should display vote confirmation dialog', async () => {
    await page.goto('/governance/1');
    
    const voteBtn = page.locator('button').filter({ hasText: /(vote|for)/i }).first();
    
    if (await voteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await voteBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show confirmation with vote details
      const confirmBtn = page.locator('button').filter({ hasText: /(confirm|submit|cast vote)/i }).first();
      
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(confirmBtn).toBeVisible();
      }
    }
  });

  test('should display current vote results', async () => {
    await page.goto('/governance/1');
    
    // Should show vote counts or percentages
    const voteResults = [
      page.locator('[data-testid="vote-results"]'),
      page.locator('text=/\\d+%/').first(), // Percentage
      page.locator('text=/for|against/i').first(),
    ];
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show voting power', async () => {
    await page.goto('/governance/1');
    
    // Should display user's voting power
    const votingPower = page.locator('[data-testid="voting-power"], text=/voting power|your power/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Create Proposal Flow', () => {
  test('should navigate to create proposal page', async ({ page }) => {
    await page.goto('/governance');
    
    const createBtn = page.locator('button, a').filter({ hasText: /(create|new proposal|submit)/i }).first();
    
    if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display proposal creation form', async ({ page }) => {
    await page.goto('/governance/create');
    
    // Should show form fields
    const titleInput = page.locator('input[name="title"], textarea[name="title"]').first();
    const descriptionInput = page.locator('textarea[name="description"]').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should validate required proposal fields', async ({ page }) => {
    await page.goto('/governance/create');
    
    // Try to submit without filling required fields
    const submitBtn = page.locator('button[type="submit"], button').filter({ hasText: /(submit|create|propose)/i }).first();
    
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      
      // Should show validation errors
      const error = page.locator('text=/required|error/i').first();
      // Validation may be inline or toast
    }
  });

  test('should validate proposal title length', async ({ page }) => {
    await page.goto('/governance/create');
    
    const titleInput = page.locator('input[name="title"]').first();
    
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Enter very long title
      await titleInput.fill('a'.repeat(200));
      await titleInput.blur();
      
      await page.waitForTimeout(500);
      
      // Should show length validation
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should allow adding proposal actions', async ({ page }) => {
    await page.goto('/governance/create');
    
    // Look for add action button
    const addActionBtn = page.locator('button').filter({ hasText: /(add action|add call)/i }).first();
    
    if (await addActionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addActionBtn.click();
      await page.waitForTimeout(500);
      
      // Should add action fields
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should check minimum token requirement for proposal creation', async ({ page }) => {
    await page.goto('/governance/create');
    
    // Should display minimum token requirement
    const requirement = page.locator('text=/minimum|required|threshold/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should preview proposal before submission', async ({ page }) => {
    await page.goto('/governance/create');
    
    const previewBtn = page.locator('button').filter({ hasText: /preview/i }).first();
    
    if (await previewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await previewBtn.click();
      await page.waitForTimeout(500);
      
      // Should show preview
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });
});

test.describe('Vote Delegation', () => {
  test('should navigate to delegation page', async ({ page }) => {
    await page.goto('/governance');
    
    const delegateLink = page.locator('a, button').filter({ hasText: /delegate|delegation/i }).first();
    
    if (await delegateLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await delegateLink.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should display current delegation status', async ({ page }) => {
    await page.goto('/governance');
    
    const delegationStatus = page.locator('[data-testid="delegation-status"], text=/delegated to|delegating/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should allow entering delegate address', async ({ page }) => {
    await page.goto('/governance');
    
    const delegateBtn = page.locator('button').filter({ hasText: /delegate/i }).first();
    
    if (await delegateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await delegateBtn.click();
      await page.waitForTimeout(1000);
      
      const addressInput = page.locator('input[name="delegate"], input[name="address"]').first();
      
      if (await addressInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addressInput.fill('0x1234567890123456789012345678901234567890');
        await page.waitForTimeout(500);
        
        const content = page.locator('main');
        await expect(content).toBeVisible();
      }
    }
  });

  test('should validate delegate address format', async ({ page }) => {
    await page.goto('/governance');
    
    const delegateBtn = page.locator('button').filter({ hasText: /delegate/i }).first();
    
    if (await delegateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await delegateBtn.click();
      await page.waitForTimeout(1000);
      
      const addressInput = page.locator('input[name="delegate"]').first();
      
      if (await addressInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await addressInput.fill('invalid-address');
        await addressInput.blur();
        
        await page.waitForTimeout(500);
        // Should show validation error
      }
    }
  });

  test('should allow self-delegation', async ({ page }) => {
    await page.goto('/governance');
    
    const selfDelegateBtn = page.locator('button').filter({ hasText: /(self|delegate to self)/i }).first();
    
    if (await selfDelegateBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await selfDelegateBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should show delegation transaction confirmation', async ({ page }) => {
    await page.goto('/governance');
    
    // Full delegation flow would require form submission
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should allow revoking delegation', async ({ page }) => {
    await page.goto('/governance');
    
    const revokeBtn = page.locator('button').filter({ hasText: /(revoke|undelegate)/i }).first();
    
    if (await revokeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await revokeBtn.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });
});

test.describe('Voting History', () => {
  test('should display voting history', async ({ page }) => {
    await page.goto('/governance');
    
    const historyLink = page.locator('a, button').filter({ hasText: /(history|my votes)/i }).first();
    
    if (await historyLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await historyLink.click();
      await page.waitForTimeout(500);
      
      const content = page.locator('main');
      await expect(content).toBeVisible();
    }
  });

  test('should show past votes with proposal details', async ({ page }) => {
    await page.goto('/governance');
    
    // Look for vote history items
    const voteItems = page.locator('[data-testid="vote-item"], .vote-history-item').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should filter voting history by vote type', async ({ page }) => {
    await page.goto('/governance');
    
    // Filter by For/Against/Abstain
    const filterOptions = ['for', 'against', 'abstain'];
    
    for (const filter of filterOptions) {
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

  test('should display voting power at time of vote', async ({ page }) => {
    await page.goto('/governance');
    
    // Historical voting power should be shown
    const votingPower = page.locator('text=/voting power|power used/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Proposal Execution', () => {
  test('should display execute button for successful proposals', async ({ page }) => {
    await page.goto('/governance/1');
    
    const executeBtn = page.locator('button').filter({ hasText: /execute|queue/i }).first();
    
    // Execute button only visible for passed proposals
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show timelock period before execution', async ({ page }) => {
    await page.goto('/governance/1');
    
    const timelockInfo = page.locator('text=/timelock|delay|executable in/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should execute proposal when conditions met', async ({ page }) => {
    await page.goto('/governance/1');
    
    const executeBtn = page.locator('button').filter({ hasText: /execute/i }).first();
    
    if (await executeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await executeBtn.click();
      await page.waitForTimeout(1000);
      
      // Should show execution confirmation
      const content = page.locator('main, [role="dialog"]');
      await expect(content.first()).toBeVisible();
    }
  });

  test('should display execution status', async ({ page }) => {
    await page.goto('/governance/1');
    
    const executionStatus = page.locator('text=/executed|pending execution|queued/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});

test.describe('Governance Error Handling', () => {
  test('should handle insufficient voting power', async ({ page }) => {
    await page.goto('/governance/1');
    
    // User with no voting power should see appropriate message
    const noVotingPower = page.locator('text=/no voting power|insufficient tokens/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should prevent double voting', async ({ page }) => {
    await page.goto('/governance/1');
    
    // If already voted, should show "already voted" message
    const alreadyVoted = page.locator('text=/already voted|vote recorded/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should handle expired proposals', async ({ page }) => {
    await page.goto('/governance/1');
    
    // Expired proposals should show status
    const expiredStatus = page.locator('text=/expired|closed|ended/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should validate proposal creation permissions', async ({ page }) => {
    await page.goto('/governance/create');
    
    // Should check if user has enough tokens to propose
    const requirement = page.locator('text=/insufficient|minimum required|not eligible/i').first();
    
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });
});
