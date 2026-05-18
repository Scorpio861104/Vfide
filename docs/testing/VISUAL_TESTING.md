# Visual Regression Testing Guide

## Overview

Visual regression testing uses **Percy** to catch unintended UI changes across browsers and devices.

## Setup

### 1. Percy CLI

Percy is configured in `.percy.yml`. To use Percy:

```bash
# Install Percy CLI globally (optional)
npm install -g @percy/cli

# Or use via npx
npx percy exec -- npm run test:e2e
```

### 2. Environment Setup

```bash
# Set Percy token for CI/CD
export PERCY_TOKEN=<your-percy-token>
```

Get your token from [Percy Dashboard](https://percy.io).

## Running Visual Tests

```bash
# Run visual regression tests with Percy
npm run test:visual

# Or manually
npx percy exec -- npm run test:e2e
```

## Snapshots in E2E Tests

Snapshots are captured in E2E tests using:

```typescript
import percySnapshot from '@percy/playwright';

test('visual snapshot', async ({ page }) => {
  await page.goto('/');
  await percySnapshot(page, 'Homepage');
});
```

## Percy Dashboard Features

- **Visual diffs** - Side-by-side comparison
- **Multi-browser** - Chrome, Firefox, Safari
- **Device testing** - Mobile, tablet, desktop
- **Approval workflow** - Review and approve changes
- **CI integration** - Auto-check in pull requests

## Best Practices

1. **Snapshot naming** - Use descriptive names
   ```typescript
   // Good
   await percySnapshot(page, 'Vault - Empty State');
   
   // Avoid
   await percySnapshot(page, 'snap1');
   ```

2. **Wait for content** - Ensure data is loaded
   ```typescript
   await page.waitForLoadState('networkidle');
   await percySnapshot(page, 'Page After Load');
   ```

3. **Consistent state** - Use fixed data/timestamps
   ```typescript
   // Mock dates if tests run at different times
   cy.clock().freeze(new Date('2024-01-03'));
   ```

4. **Organize snapshots** - Group by feature
   ```
   Homepage
   ├── Hero Section
   ├── Feature Cards
   └── Footer
   
   Vault
   ├── Empty State
   ├── With Funds
   └── Security Section
   ```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No Percy token" | Set `PERCY_TOKEN` env var |
| "Flaky snapshots" | Wait for dynamic content to load |
| "Too many diffs" | Review changes in Percy dashboard |
| "Timeout" | Increase timeout in config |

## CI/CD Integration

Add to GitHub Actions:

```yaml
- name: Visual Regression
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
  run: npm run test:visual
```

## Devices Tested

- Desktop Chrome (1280x720)
- Desktop Firefox (1280x720)
- Desktop Safari (1280x720)
- Mobile iPhone (375x667)
- Tablet iPad (768x1024)
