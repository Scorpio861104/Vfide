# Vfide E2E Test Suite

Comprehensive end-to-end test suite for the Vfide application using Playwright.

## Overview

This test suite provides extensive coverage of all critical user journeys in the Vfide platform, including wallet integration, transactions, governance, payments, vaults, cross-chain transfers, gamification, social features, and mobile responsiveness.

## Test Files

### 1. **user-registration.spec.ts** (261 lines)
Tests user onboarding and registration flows:
- Complete registration flow
- Onboarding wizard navigation
- Profile setup
- First transaction guidance
- Error handling
- Preference persistence

### 2. **wallet-flows.spec.ts** (504 lines)
Tests comprehensive wallet connection functionality:
- MetaMask connection
- WalletConnect integration
- Hardware wallet support (Ledger, Trezor)
- Multi-wallet switching
- Network switching
- Wallet disconnection/reconnection
- Error handling (missing provider, user rejection, unsupported networks)

### 3. **transaction-flows.spec.ts** (545 lines)
Tests transaction operations:
- Send transactions
- Transaction confirmation
- Transaction status tracking
- Failed transaction handling
- Gas estimation and optimization
- Transaction history
- Gas price warnings
- Block confirmations

### 4. **governance-flows.spec.ts** (574 lines)
Tests governance and voting functionality:
- View proposals list
- Create proposals
- Vote on proposals
- Delegate voting power
- View voting history
- Proposal execution
- Vote delegation/revocation
- Error handling (insufficient tokens, double voting)

### 5. **payment-flows.spec.ts** (647 lines)
Tests payment and transfer features:
- Create payment requests
- Send payments
- Receive payments
- Payment history
- QR code payments
- Multi-token payments (ETH, USDC, DAI, USDT)
- Recurring payments
- Payment validation

### 6. **vault-operations.spec.ts** (678 lines)
Tests vault functionality:
- Create vaults
- Deposit to vaults
- Withdraw from vaults
- View vault balance
- Vault transaction history
- Emergency withdrawals
- Multi-token vault support
- Vault settings and statistics

### 7. **cross-chain-flows.spec.ts** (604 lines)
Tests cross-chain bridge operations:
- Initiate cross-chain transfers
- Bridge assets between chains
- Track transfer status
- Handle failed transfers
- Route selection
- Fee estimation
- Security validations

### 8. **gamification-quests.spec.ts** (581 lines)
Tests gamification features:
- Complete daily quests
- Complete weekly quests
- Earn achievements
- View leaderboard
- Claim rewards
- Track XP and levels
- Streak system

### 9. **social-features.spec.ts** (696 lines)
Tests social networking features:
- Send messages
- Create groups
- Join/leave groups
- View notifications
- Social feed interaction
- Like/comment/share posts
- Follow users

### 10. **mobile-responsive.spec.ts** (643 lines)
Tests mobile experience:
- Mobile navigation
- Mobile wallet connection
- Mobile transactions
- Touch gestures (tap, swipe, pinch, long-press)
- Responsive layouts
- Bottom navigation
- Android and iOS testing
- Tablet support

### Legacy Tests (11 lines)
- **homepage.spec.ts** - Basic homepage smoke tests

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run specific test file
```bash
npx playwright test wallet-flows.spec.ts
```

### Run tests in UI mode
```bash
npm run test:e2e:ui
```

### Run tests in specific browser
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

### Run mobile tests only
```bash
npm run test:e2e:mobile
```

### Debug tests
```bash
npm run test:e2e:debug
```

## Test Configuration

### Browser Projects
- **chromium** - Desktop Chrome
- **firefox** - Desktop Firefox
- **webkit** - Desktop Safari
- **mobile-chrome** - Pixel 5 emulation
- **mobile-safari** - iPhone 12 emulation
- **tablet** - iPad Pro emulation

### Test Settings
- **Base URL**: http://127.0.0.1:3000
- **Retries**: 2 (CI), 0 (local)
- **Workers**: 1 (CI), auto (local)
- **Screenshots**: Only on failure
- **Trace**: On first retry

## Test Structure

Each test file follows a consistent structure:

```typescript
import { test, expect, Page } from '@playwright/test';

test.describe('Feature Name', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    // Setup code (mock Web3, navigate, etc.)
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should perform specific action', async () => {
    // Test implementation
  });
});
```

## Web3 Mocking

Tests include Web3 provider mocking to avoid requiring actual wallet connections:

```typescript
await page.addInitScript(() => {
  window.ethereum = {
    isMetaMask: true,
    request: async ({ method }) => {
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
```

## Best Practices

### 1. Graceful Degradation
Tests check if elements exist before interacting with them:
```typescript
if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
  await element.click();
}
```

### 2. Realistic Timeouts
All element waits use reasonable timeouts (1-2 seconds) to fail fast.

### 3. Minimal Assumptions
Tests don't assume specific UI text or structure, instead using flexible selectors:
```typescript
page.locator('button').filter({ hasText: /(send|transfer)/i }).first()
```

### 4. Error Scenarios
Each test suite includes error handling test cases:
- Network errors
- Invalid inputs
- Insufficient balances
- User rejections

### 5. Mobile-First
Mobile tests use device emulation and test touch interactions specifically.

## Test Coverage

Total test count: **5,744 lines** of E2E test code covering:

- ✅ User registration and onboarding
- ✅ Wallet connection (MetaMask, WalletConnect, hardware wallets)
- ✅ Transactions (send, receive, status tracking)
- ✅ Governance (proposals, voting, delegation)
- ✅ Payments (requests, QR codes, multi-token)
- ✅ Vaults (deposits, withdrawals, emergency operations)
- ✅ Cross-chain transfers (bridging, status tracking)
- ✅ Gamification (quests, achievements, leaderboards)
- ✅ Social features (messages, groups, notifications)
- ✅ Mobile responsiveness (iOS, Android, tablets)

## Continuous Integration

Tests are configured to run in CI with:
- 2 retry attempts
- Single worker (sequential execution)
- HTML and list reporters
- Screenshot capture on failure
- Trace recording on retry

## Visual Testing

For visual regression testing, use:
```bash
npm run test:visual
```

This runs Playwright tests with Percy for visual comparison.

## Accessibility Testing

Tests include accessibility checks via `@axe-core/playwright`. Run:
```bash
npm run test:a11y
```

## Performance Testing

For performance metrics, run:
```bash
npm run test:performance
```

This uses Lighthouse CI for performance auditing.

## Contributing

When adding new tests:

1. Follow the existing structure with `test.describe` blocks
2. Include both success and failure scenarios
3. Add graceful fallbacks for optional UI elements
4. Mock Web3 interactions to avoid external dependencies
5. Use flexible selectors that work across UI changes
6. Add proper TypeScript types
7. Document complex test scenarios

## Troubleshooting

### Tests timing out
- Increase timeout in specific tests: `test('name', async ({ page }) => { ... }, { timeout: 10000 })`
- Check if test server is running: `curl http://127.0.0.1:3000/e2e`

### Web3 mocking not working
- Ensure `addInitScript` is called before `page.goto()`
- Check browser console for errors

### Element not found
- Verify element exists in current UI
- Check if element is behind authentication
- Adjust selectors to be more flexible

### Mobile tests failing
- Verify device emulation is working
- Check viewport size expectations
- Test touch event handling

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Patterns](https://playwright.dev/docs/test-patterns)
- [Mobile Emulation](https://playwright.dev/docs/emulation)
- [Web3 Testing](https://ethereum.org/en/developers/docs/testing/)

## License

Same as parent project (check root LICENSE file).
