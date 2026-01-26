# Live Testing Guide - Function by Function Testing

This guide covers all tools and approaches for interactive, live testing of the VFIDE website during development.

## Table of Contents
1. [Component-Level Testing](#component-level-testing)
2. [End-to-End Interactive Testing](#end-to-end-interactive-testing)
3. [Unit Test Live Feedback](#unit-test-live-feedback)
4. [API & Integration Testing](#api--integration-testing)
5. [Performance Profiling](#performance-profiling)
6. [Recommended Workflow](#recommended-workflow)

---

## Component-Level Testing

### 1. Storybook (✅ Already Installed)

**Purpose:** Test React components in isolation with live hot-reload

**Usage:**
```bash
npm run storybook
# Opens http://localhost:6006
```

**Features:**
- 🔥 Hot reload on file changes
- 🎨 Visual component explorer
- 📱 Viewport testing (mobile, tablet, desktop)
- ♿ Built-in accessibility checks
- 🎛️ Interactive props/controls
- 📸 Visual regression testing (via Chromatic)

**Example Workflow:**
1. Start Storybook: `npm run storybook`
2. Navigate to your component in the sidebar
3. Adjust props using the Controls panel
4. Test different states (loading, error, success)
5. Check accessibility violations in the Accessibility tab
6. Test responsive behavior with viewport addon

**Creating Stories:**
```typescript
// components/Button/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Click me',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Loading...',
    disabled: true,
  },
};
```

---

## End-to-End Interactive Testing

### 2. Playwright UI Mode (✅ Already Installed)

**Purpose:** Run E2E tests with live browser inspection and debugging

**Usage:**
```bash
# Interactive test runner with browser
npm run test:e2e:ui

# Debug mode with step-through
npm run test:e2e:debug

# Specific test file in UI mode
npx playwright test e2e/wallet-flows.spec.ts --ui
```

**Features:**
- 🎥 Watch tests run in real browser
- 🔍 Inspect DOM at any step
- 🐛 Set breakpoints in test code
- 📸 Screenshots and videos
- 🔄 Re-run tests instantly
- 🕐 Time-travel debugging

**Interactive Debugging:**
```typescript
// e2e/example.spec.ts
import { test, expect } from '@playwright/test';

test('test with debugging', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Add page.pause() to open inspector
  await page.pause();
  
  await page.click('button[type="submit"]');
  await expect(page.locator('.success-message')).toBeVisible();
});
```

**Workflow:**
1. Run `npm run test:e2e:ui`
2. Select test to run
3. Watch execution in browser
4. Click elements to inspect
5. Use time-travel to go back/forward
6. Modify test and re-run instantly

### 3. Playwright Trace Viewer

**Purpose:** Record and replay test sessions with full context

**Usage:**
```bash
# Run tests with tracing
npx playwright test --trace on

# View trace file
npx playwright show-trace trace.zip
```

**Features:**
- Full DOM snapshots at each step
- Network requests/responses
- Console logs
- Screenshots
- Timeline view

---

## Unit Test Live Feedback

### 4. Jest Watch Mode (✅ Already Installed)

**Purpose:** Automatically re-run unit tests on file changes

**Usage:**
```bash
# Watch mode with interactive menu
npm run test:watch

# Watch specific test pattern
npm test -- --watch --testPathPattern=Button
```

**Interactive Commands:**
- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `p` to filter by filename pattern
- Press `t` to filter by test name pattern
- Press `q` to quit
- Press `Enter` to trigger a test run

**Features:**
- 🔄 Auto-run on file save
- 🎯 Smart test selection (related files)
- 📊 Coverage on demand
- 🔍 Interactive filtering
- ⚡ Fast feedback loop

**Example Workflow:**
1. Run `npm run test:watch`
2. Edit component or test file
3. Tests auto-run on save
4. Press `f` to focus on failures
5. Fix issues and see results immediately

---

## API & Integration Testing

### 5. REST Client / Thunder Client

**Purpose:** Test API endpoints interactively in VS Code

**Installation:**
```bash
# VS Code extension
# Search for "Thunder Client" or "REST Client"
```

**Usage:**
Create `.http` files:
```http
### Get user profile
GET http://localhost:3000/api/user/profile
Authorization: Bearer {{token}}

### Create payment request
POST http://localhost:3000/api/crypto/payment-requests
Content-Type: application/json

{
  "amount": 100,
  "currency": "USD",
  "description": "Test payment"
}
```

**Features:**
- 🔄 Live request/response
- 📝 Save request collections
- 🔑 Environment variables
- 📊 Response formatting
- 🕐 Request history

### 6. Next.js Fast Refresh (✅ Built-in)

**Purpose:** Instant component updates without full page reload

**Usage:**
```bash
npm run dev
# Automatic on file save
```

**Features:**
- ⚡ < 1 second updates
- 🔄 Preserves component state
- 🎯 Error overlay with stack traces
- 🔥 No manual refresh needed

---

## Performance Profiling

### 7. React DevTools Profiler (Browser Extension)

**Purpose:** Live performance analysis per component

**Installation:**
- Chrome: https://chrome.google.com/webstore/detail/react-developer-tools
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/react-devtools/

**Usage:**
1. Install extension
2. Open DevTools → Profiler tab
3. Click record
4. Interact with your app
5. Stop recording
6. Analyze flame graph

**Metrics:**
- Component render times
- Why component re-rendered
- Props/state that triggered render
- Render phase vs commit phase
- Ranked by render time

### 8. Chrome DevTools Performance Tab

**Purpose:** Deep dive into runtime performance

**Usage:**
1. Open DevTools → Performance tab
2. Click record
3. Perform actions to test
4. Stop recording
5. Analyze timeline

**Shows:**
- JavaScript execution
- Style calculations
- Layout/reflow
- Paint operations
- Network requests
- FPS (frames per second)

---

## Additional Tools to Consider

### 9. Vitest UI (Optional)

**Purpose:** Modern alternative to Jest with built-in UI

**Installation:**
```bash
npm install -D vitest @vitest/ui
```

**Usage:**
```bash
npx vitest --ui
# Opens http://localhost:51204/__vitest__/
```

**Features:**
- 🎨 Beautiful UI with component tree
- 🔍 Search and filter tests
- 📊 Coverage visualization
- 🐛 Debug in browser
- ⚡ Extremely fast (uses Vite)

### 10. Testing Playground (Optional)

**Purpose:** Build testing-library queries interactively

**Installation:**
```bash
npm install -D @testing-library/react-devtools
```

**Usage:**
```typescript
import { screen } from '@testing-library/react';
screen.logTestingPlaygroundURL();
// Opens interactive query builder
```

**Features:**
- 🎯 Find best query for element
- 📝 Copy query to clipboard
- 🔍 Explore DOM structure
- ♿ Accessibility-first queries

### 11. MSW (Mock Service Worker) (Optional)

**Purpose:** Intercept and mock API calls in browser

**Installation:**
```bash
npm install -D msw
```

**Setup:**
```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    });
  }),
];

// mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

**Features:**
- 🌐 Works in browser dev tools
- 🧪 Same mocks for tests and dev
- 🔄 Hot reload on mock changes
- 📊 Request logging
- 🎯 Match by method, URL, headers

---

## Recommended Workflow for Function Testing

### Quick Iteration Cycle

1. **Component Development:**
   ```bash
   npm run storybook
   # Develop component in isolation with instant feedback
   ```

2. **Unit Testing:**
   ```bash
   npm run test:watch
   # Write tests with auto-run on save
   ```

3. **Integration Testing:**
   ```bash
   npm run dev
   # Test in actual app with Fast Refresh
   ```

4. **E2E Verification:**
   ```bash
   npm run test:e2e:ui
   # Verify user flows interactively
   ```

5. **Performance Check:**
   - Open React DevTools Profiler
   - Record interaction
   - Optimize slow components

### Complete Feature Testing Workflow

```bash
# Terminal 1: Development server with hot reload
npm run dev

# Terminal 2: Storybook for component testing
npm run storybook

# Terminal 3: Jest watch for unit tests
npm run test:watch

# When ready for E2E:
npm run test:e2e:ui
```

---

## Live Testing Checklist

For each new feature/function:

- [ ] Create Storybook story with all states
- [ ] Write unit tests (run in watch mode)
- [ ] Test in dev server (Fast Refresh)
- [ ] Run E2E test in UI mode
- [ ] Profile with React DevTools
- [ ] Check accessibility in Storybook
- [ ] Verify on mobile viewports
- [ ] Test error states
- [ ] Test loading states
- [ ] Verify performance metrics

---

## Tips for Effective Live Testing

### 1. Keep Dev Server Running
```bash
npm run dev
# Runs on http://localhost:3000
# Auto-refreshes on changes
```

### 2. Use Multiple Terminal Windows
- Terminal 1: `npm run dev`
- Terminal 2: `npm run storybook`
- Terminal 3: `npm run test:watch`

### 3. Browser DevTools Keyboard Shortcuts
- `Cmd/Ctrl + Shift + C` - Inspect element
- `Cmd/Ctrl + Shift + P` - Command palette
- `F12` - Open DevTools
- `Cmd/Ctrl + Shift + I` - Toggle DevTools

### 4. Hot Keys in Watch Mode
- `w` - Show watch menu
- `a` - Run all tests
- `f` - Run failed tests only
- `p` - Filter by filename
- `t` - Filter by test name

### 5. Playwright Debugging
```typescript
// Add anywhere in test
await page.pause(); // Opens inspector

// Or run with debug flag
npx playwright test --debug
```

---

## Comparison of Tools

| Tool | Purpose | Interaction Level | Setup Required |
|------|---------|------------------|----------------|
| **Storybook** | Component testing | High - visual UI | ✅ None |
| **Playwright UI** | E2E testing | High - browser + inspector | ✅ None |
| **Jest Watch** | Unit testing | Medium - CLI | ✅ None |
| **Fast Refresh** | Live reloading | Auto - no interaction | ✅ Built-in |
| **React DevTools** | Performance | High - visual profiler | Browser extension |
| **Vitest UI** | Modern test runner | High - visual UI | Manual install |
| **MSW** | API mocking | Medium - code-based | Manual install |

---

## Quick Reference Commands

```bash
# Component-level testing
npm run storybook              # Interactive component explorer

# E2E interactive testing
npm run test:e2e:ui           # Playwright UI mode
npm run test:e2e:debug        # Debug with breakpoints

# Unit test live feedback
npm run test:watch            # Auto-run tests on save

# Development with hot reload
npm run dev                   # Next.js Fast Refresh

# All testing tools running
npm run dev & npm run storybook & npm run test:watch
```

---

## Troubleshooting

### Storybook not loading
```bash
# Clear cache and restart
rm -rf node_modules/.cache
npm run storybook
```

### Playwright tests timing out
```bash
# Increase timeout in playwright.config.ts
timeout: 60000, // 60 seconds
```

### Jest watch not detecting changes
```bash
# Clear Jest cache
npm test -- --clearCache
npm run test:watch
```

---

## Next Steps

1. **Start with Storybook** - Best for rapid component development
2. **Add Jest Watch** - Continuous unit test feedback
3. **Use Playwright UI** - Verify user flows interactively
4. **Consider Vitest** - If you want modern UI for unit tests
5. **Add MSW** - For consistent API mocking

---

**Status:** ✅ Ready to use  
**Tools Available Immediately:** 4 (Storybook, Playwright UI, Jest Watch, Fast Refresh)  
**Browser Extensions:** 1 (React DevTools)  
**Optional Additions:** 3 (Vitest UI, Testing Playground, MSW)

For detailed setup of optional tools, see their respective documentation links above.

---

## NEW: Advanced Live Testing Tools

Four additional advanced tools have been added for even more powerful live testing capabilities.

### Vitest UI - Modern Test Runner

**Installation:** ✅ Ready to use

**Command:**
```bash
npm run test:ui
# Opens http://localhost:51204/__vitest__/
```

**Features:**
- Beautiful browser-based UI
- Real-time test execution
- Coverage visualization
- Debug in browser with breakpoints
- 2-5x faster than Jest

**When to Use:** Modern alternative to Jest with better DX

---

### Testing Playground - Query Builder

**Installation:** ✅ Ready to use

**Usage in Tests:**
```typescript
import { screen } from '@testing-library/react';

test('example', () => {
  render(<Component />);
  screen.logTestingPlaygroundURL(); // Click URL in console
});
```

**Features:**
- Find best accessibility queries
- Interactive DOM exploration
- One-click copy to clipboard
- Learn testing-library best practices

**When to Use:** Learning queries or finding best selectors

---

### MSW (Mock Service Worker) - API Mocking

**Installation:** ✅ Configured

**One-time Setup:**
```bash
npx msw init public/ --save
```

**Files Created:**
- `mocks/handlers.ts` - API mock handlers
- `mocks/browser.ts` - Browser setup
- `mocks/server.ts` - Test setup

**Features:**
- Network-level API interception
- Same mocks for dev and tests
- Simulate errors, delays, edge cases
- Works with Storybook

**Usage Example:**
```typescript
// Add to app/layout.tsx for development
if (process.env.NODE_ENV === 'development') {
  import('../mocks/browser').then(({ worker }) => worker.start());
}
```

**When to Use:** Develop without backend, consistent API responses

---

### React DevTools Profiler - Performance Analysis

**Installation:** Browser extension required

**Links:**
- Chrome: https://chrome.google.com/webstore (search "React Developer Tools")
- Firefox: https://addons.mozilla.org/firefox/addon/react-devtools/

**Usage:**
1. Install extension
2. Open DevTools → Profiler tab
3. Click Record
4. Interact with app
5. Stop and analyze

**Features:**
- Component render times
- Why component rendered
- Flame graphs
- Performance optimization insights

**When to Use:** Finding slow components, optimizing performance

---

## Updated Complete Workflow

```bash
# Terminal 1: Dev server with MSW
npm run dev

# Terminal 2: Vitest UI for modern testing
npm run test:ui

# Terminal 3: Storybook with components
npm run storybook

# Browser: React DevTools for profiling
# F12 → Profiler tab
```

---

## Tool Comparison Matrix (Updated)

| Tool | Purpose | Interaction | Setup |
|------|---------|------------|-------|
| **Storybook** | Component testing | High - visual UI | ✅ None |
| **Playwright UI** | E2E testing | High - browser | ✅ None |
| **Jest Watch** | Unit testing | Medium - CLI | ✅ None |
| **Vitest UI** ⭐ | Modern testing | High - browser UI | ✅ None |
| **Testing Playground** ⭐ | Query builder | High - interactive | ✅ None |
| **MSW** ⭐ | API mocking | Medium - code | One command |
| **React DevTools** ⭐ | Performance | High - visual | Extension |
| **Fast Refresh** | Live reload | Auto | ✅ Built-in |

---

## Complete Tool Suite (8 Tools)

1. ✅ **Storybook** - Component explorer
2. ✅ **Playwright UI** - E2E with debugging
3. ✅ **Jest Watch** - Unit test auto-run
4. ✅ **Next.js Fast Refresh** - Hot reload
5. ⭐ **Vitest UI** - Modern test runner
6. ⭐ **Testing Playground** - Query builder
7. ⭐ **MSW** - API mocking
8. ⭐ **React DevTools Profiler** - Performance

---

For complete setup instructions, examples, and best practices for the 4 new tools, see:

📘 **[LIVE_TESTING_TOOLS_SETUP.md](./LIVE_TESTING_TOOLS_SETUP.md)**

