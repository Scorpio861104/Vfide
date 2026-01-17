# 🧪 Testing Guide

Complete testing documentation for the VFIDE frontend application.

## 📊 Test Coverage

**Current Status: 736 tests passing (100%)**

- **Total Tests:** 736
- **Test Suites:** 36
- **Coverage:** 98.76% statements, 95.58% branches, 100% functions, 99.55% lines
- **E2E Tests:** 3 test suites (Playwright)

## 🚀 Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run specific test category
npm run test:mobile
npm run test:contract
npm run test:security
```

## 📁 Test Structure

```
frontend/
├── __tests__/                    # Integration & specialized tests
│   ├── contract-interactions.test.tsx    # 16 tests
│   ├── network-resilience.test.tsx       # 14 tests
│   ├── security.test.tsx                 # 19 tests
│   ├── integration.test.tsx              # 11 tests
│   ├── multi-chain.test.tsx              # 20 tests
│   ├── load-stress.test.tsx              # 14 tests
│   ├── websocket.test.tsx                # 20 tests
│   ├── storage.test.tsx                  # 25 tests
│   └── error-boundary.test.tsx           # 21 tests
├── components/
│   └── **/__tests__/            # Component unit tests
├── hooks/
│   └── __tests__/               # Hook tests
├── lib/
│   └── __tests__/               # Utility tests
└── e2e/                         # End-to-end tests
    ├── homepage.spec.ts
    ├── wallet-connection.spec.ts
    └── governance.spec.ts
```

## 🎯 Test Categories

### 1. Unit Tests (665 tests)
Component-level tests for UI, hooks, and utilities.

```bash
# Run all unit tests
npm test

# Run specific component tests
npm test Button
npm test useVaultHooks
```

### 2. Contract Interaction Tests (16 tests)
Test Web3 integration and smart contract calls.

```bash
npm run test:contract
```

**Coverage:**
- ✅ Transaction success scenarios (vote, transfer)
- ✅ Transaction failure handling (gas errors, reverts, rejections)
- ✅ Gas estimation
- ✅ Transaction state management (pending → confirmed)
- ✅ Multi-chain contract calls (Base, Polygon, zkSync)
- ✅ Contract event handling
- ✅ Approval flow (ERC20 approve + transfer)

### 3. Network Resilience Tests (14 tests)
Test network failure handling and recovery.

```bash
npm run test:network
```

**Coverage:**
- ✅ RPC provider failover (primary → secondary → tertiary)
- ✅ Request timeout handling
- ✅ Exponential backoff retry logic
- ✅ Offline mode detection
- ✅ Transaction queueing when offline
- ✅ Rate limiting (429 errors)
- ✅ Connection recovery
- ✅ Block confirmation delays

### 4. Security Tests (19 tests)
Validate security measures and input sanitization.

```bash
npm run test:security
```

**Coverage:**
- ✅ XSS prevention (script tags, event handlers)
- ✅ Input validation (addresses, amounts)
- ✅ Address validation (checksum, zero address)
- ✅ Transaction safety (parameter validation)
- ✅ Content Security Policy
- ✅ Rate limiting
- ✅ Session management
- ✅ Replay attack prevention (nonce tracking)

### 5. Integration Tests (11 tests)
End-to-end workflow testing.

```bash
npm run test:integration
```

**Coverage:**
- ✅ Complete voting workflow
- ✅ Proposal creation workflow
- ✅ Token delegation workflow
- ✅ Token transfer workflow
- ✅ Multi-chain switching
- ✅ Error recovery with retry
- ✅ Concurrent operations
- ✅ Session persistence
- ✅ Real-time updates

### 6. Multi-Chain Tests (20 tests)
Test multi-chain functionality.

```bash
npm run test:multichain
```

**Coverage:**
- ✅ Chain switching (Base, Polygon, zkSync)
- ✅ Chain-specific contract addresses
- ✅ Chain-specific gas settings
- ✅ Block confirmation times per chain
- ✅ Chain-specific features (Coinbase integration, Account Abstraction)
- ✅ RPC provider failover
- ✅ Cross-chain bridging
- ✅ Transaction format differences

### 7. Load/Stress Tests (14 tests)
Performance testing under heavy load.

```bash
npm run test:load
```

**Coverage:**
- ✅ Large dataset rendering (1000-10000 items)
- ✅ Efficient filtering (< 100ms)
- ✅ Concurrent operations (10+ simultaneous)
- ✅ Memory management
- ✅ WebSocket stress (1000 messages)
- ✅ Chart rendering (1000+ data points)
- ✅ Search performance (10000 records)
- ✅ Transaction queue management

### 8. WebSocket Tests (20 tests)
Real-time messaging infrastructure.

```bash
npm run test:websocket
```

**Coverage:**
- ✅ Connection lifecycle
- ✅ Message sending/receiving
- ✅ Reconnection logic
- ✅ Heartbeat mechanism
- ✅ Subscription management
- ✅ Error handling
- ✅ Multiple handlers per event type

### 9. Storage Tests (25 tests)
Browser storage management.

```bash
npm run test:storage
```

**Coverage:**
- ✅ localStorage operations
- ✅ TTL (time-to-live) support
- ✅ Array limiting
- ✅ Quota management
- ✅ Error handling
- ✅ Storage availability checks
- ✅ Batch operations
- ✅ Private browsing mode fallbacks

### 10. Error Boundary Tests (21 tests)
Error handling and crash prevention.

```bash
npm run test:error-boundary
```

**Coverage:**
- ✅ Error catching
- ✅ Custom fallback UI
- ✅ Error recovery (Try Again)
- ✅ Nested boundaries
- ✅ useErrorHandler hook
- ✅ Development vs production modes
- ✅ Error callbacks

### 11. Mobile Tests (94 tests)
Mobile-specific responsive behavior.

```bash
npm run test:mobile
```

**Coverage:**
- ✅ 5 viewport sizes (320px to 1024px)
- ✅ Touch interactions
- ✅ Responsive layouts
- ✅ Mobile navigation
- ✅ Gesture handling

### 12. E2E Tests (Playwright)
Browser automation testing.

```bash
npm run test:e2e              # All browsers
npm run test:e2e:chromium     # Chromium only
npm run test:e2e:firefox      # Firefox only
npm run test:e2e:webkit       # Safari/WebKit
npm run test:e2e:mobile       # Mobile browsers
npm run test:e2e:ui           # Interactive UI mode
npm run test:e2e:debug        # Debug mode
```

**Coverage:**
- ✅ Homepage navigation
- ✅ Wallet connection flow
- ✅ Governance interactions

## 🛠️ Writing Tests

### Component Test Template

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Hook Test Template

```tsx
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '@/hooks/useMyHook';

describe('useMyHook', () => {
  it('returns expected value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe('expected');
  });

  it('updates on action', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.update('new value');
    });
    
    expect(result.current.value).toBe('new value');
  });
});
```

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test('completes workflow', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Button');
    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

## 🎭 Mocking

### Wagmi/Web3 Mocking

```tsx
jest.mock('wagmi', () => ({
  useAccount: () => ({ address: '0x123...', isConnected: true }),
  useBalance: () => ({ data: { value: 1000n } }),
  useContractWrite: () => ({ write: jest.fn(), isLoading: false }),
}));
```

### API Mocking

```tsx
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ data: 'mock data' }),
  })
) as jest.Mock;
```

### LocalStorage Mocking

```tsx
Storage.prototype.getItem = jest.fn((key) => 'mock value');
Storage.prototype.setItem = jest.fn();
```

## 📈 Coverage Reports

### Generate HTML Report

```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Coverage Thresholds

Configured in `jest.config.js`:
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

## 🚨 Debugging Tests

### Debug in VSCode

1. Add breakpoint in test file
2. Run "Jest: Debug" from command palette
3. Or add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/frontend/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "cwd": "${workspaceFolder}/frontend",
  "console": "integratedTerminal"
}
```

### Debug Specific Test

```bash
npm test -- --testNamePattern="test name" --no-coverage
```

### Debug Playwright Tests

```bash
npm run test:e2e:debug
```

## 🔧 Troubleshooting

### Tests Timing Out

Increase timeout:
```tsx
it('long test', async () => {
  // test code
}, 10000); // 10 second timeout
```

### Mock Not Working

Clear module cache:
```tsx
jest.resetModules();
jest.clearAllMocks();
```

### Coverage Not Updating

```bash
rm -rf coverage
npm test -- --coverage
```

## 📊 CI/CD Integration

Tests run automatically on:
- Push to main/develop
- Pull request creation
- GitHub Actions workflow: `.github/workflows/test.yml`

## 🎯 Best Practices

1. **Test behavior, not implementation**
2. **Use descriptive test names**
3. **One assertion per test** (when possible)
4. **Arrange, Act, Assert** pattern
5. **Clean up after tests** (afterEach, beforeEach)
6. **Mock external dependencies**
7. **Test edge cases and error paths**
8. **Keep tests fast** (< 100ms per test)
9. **Avoid test interdependencies**
10. **Use data-testid for stable selectors**

## 📚 Resources

- [Testing Library Docs](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Docs](https://playwright.dev/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated:** January 8, 2026  
**Test Suite Version:** 1.0.0  
**Total Tests:** 736 ✅
