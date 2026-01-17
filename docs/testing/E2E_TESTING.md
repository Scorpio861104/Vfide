# Playwright E2E Tests Guide

## Setup

Playwright tests are configured in `playwright.config.ts` and run against multiple browsers (Chrome, Firefox, Safari, Mobile).

## Running Tests

```bash
# Run all E2E tests (auto-starts dev server)
npm run test:e2e

# Run only Chromium tests (faster, recommended)
npm run test:e2e:chromium

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode with inspector
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/homepage.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in specific browser
npx playwright test --project=chromium
```

## Writing Tests

Create test files in `e2e/` directory with `.spec.ts` extension:

```typescript
import { test, expect } from '@playwright/test';

test('page title is correct', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('VFIDE');
});
```

## Visual Regression

Percy snapshots are captured in E2E tests:

```bash
npm run test:visual
```

Set `PERCY_TOKEN` environment variable for Percy CI integration.

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Key Features

- **Multi-browser testing** - Chrome, Firefox, Safari, Mobile
- **Visual snapshots** - Percy integration for visual regression
- **Screenshots** - Automatic on failure
- **Tracing** - Debug traces on retry
- **Accessibility** - Integrate with a11y tests

## CI/CD Integration

Tests run with:
- Retries: 2 on CI, 0 locally
- Workers: 1 on CI, parallel locally
- Screenshots: Only on failure
