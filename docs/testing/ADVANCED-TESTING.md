# Advanced Testing Infrastructure

This document describes the advanced testing tools and infrastructure added to VFIDE.

## Testing Tools

### 1. Hardhat (Smart Contract Testing)
**Purpose**: Comprehensive smart contract testing with mainnet forking and time manipulation

**Usage**:
```bash
# Run all contract tests
npx hardhat test

# Run tests with gas reporting
REPORT_GAS=true npx hardhat test

# Run tests with coverage
npx hardhat coverage

# Fork mainnet for testing
MAINNET_RPC_URL=<your_rpc_url> npx hardhat test
```

**Features**:
- Unit tests for all contracts
- Mainnet fork testing
- Time travel for long-term scenarios
- Gas optimization analysis
- Coverage reporting

**Configuration**: `hardhat.config.ts`

### 2. Playwright (Cross-Browser E2E Testing)
**Purpose**: End-to-end testing across multiple browsers and devices

**Usage**:
```bash
# Run all E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run specific browser
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Run mobile tests
npm run test:e2e:mobile

# Debug mode
npm run test:e2e:debug
```

**Features**:
- Cross-browser testing (Chrome, Firefox, Safari, Edge)
- Mobile device testing
- Visual regression testing
- Network simulation
- Screenshot and video recording on failure

**Configuration**: `playwright.config.ts`
**Tests**: `test/e2e/`

### 3. Lighthouse CI (Performance Monitoring)
**Purpose**: Automated performance, accessibility, and SEO testing

**Usage**:
```bash
# Run Lighthouse CI
npm run test:performance

# Run with custom URLs
lhci autorun --config=lighthouserc.json
```

**Metrics Monitored**:
- Performance score (target: 90+)
- Accessibility score (target: 95+)
- Best practices score (target: 90+)
- SEO score (target: 90+)
- Core Web Vitals:
  - FCP < 2s
  - LCP < 2.5s
  - CLS < 0.1
  - TBT < 300ms

**Configuration**: `lighthouserc.json`

### 4. Pa11y (Accessibility Testing)
**Purpose**: Automated accessibility testing against WCAG 2.0 AA standards

**Usage**:
```bash
# Run accessibility tests
npx pa11y-ci

# Run single URL
npx pa11y http://localhost:3000

# Run with specific standard
npx pa11y --standard WCAG2AAA http://localhost:3000
```

**Features**:
- WCAG 2.0 AA compliance testing
- Multiple runner support (axe, htmlcs)
- CI/CD integration
- Detailed error reporting

**Configuration**: `.pa11yci.json`

### 5. k6 (Load Testing)
**Purpose**: Performance and load testing to identify system limits

**Usage**:
```bash
# Install k6 first
# macOS: brew install k6
# Linux: https://k6.io/docs/getting-started/installation/

# Run load test
k6 run k6-load-test.js

# Run with environment variables
BASE_URL=https://your-site.com k6 run k6-load-test.js

# Run with custom VUs
k6 run --vus 500 --duration 10m k6-load-test.js
```

**Test Stages**:
1. Ramp up to 100 users (2 min)
2. Steady state at 100 users (5 min)
3. Ramp up to 200 users (2 min)
4. Steady state at 200 users (5 min)
5. Ramp down to 0 users (2 min)

**Performance Thresholds**:
- 95% of requests < 500ms
- < 1% request failure rate
- < 10% error rate

**Configuration**: `k6-load-test.js`

## Running All Tests

### Quick Test Suite
```bash
npm run test:comprehensive:quick
```
Runs: Unit tests, E2E tests (Chromium only), Lighthouse

### Full Test Suite
```bash
npm run test:comprehensive:full
```
Runs: All unit tests, All E2E tests (all browsers), Lighthouse, Pa11y, Load tests

### Advanced Test Suite
```bash
./scripts/run-advanced-tests.sh
```
Comprehensive testing including:
- Playwright E2E tests
- Lighthouse performance tests
- Pa11y accessibility tests
- k6 load tests
- Hardhat contract tests (if configured)

## CI/CD Integration

All tests are configured to run in CI/CD pipelines:

**GitHub Actions** (`.github/workflows/ci.yml`):
- Unit tests
- Type checking
- Linting
- Build verification
- E2E tests (can be extended)

**Add to your CI**:
```yaml
- name: Run advanced tests
  run: ./scripts/run-advanced-tests.sh
```

## Test Reports

Test results are stored in:
- `test-results/` - Playwright reports
- `.lighthouseci/` - Lighthouse reports  
- `coverage/` - Code coverage reports
- `load-test-results.json` - k6 results

## Best Practices

### 1. Run Tests Locally Before Pushing
```bash
npm run validate && npm run test:e2e
```

### 2. Check Performance Impact
```bash
npm run test:performance
```

### 3. Verify Accessibility
```bash
npx pa11y-ci
```

### 4. Load Test Before Launch
```bash
k6 run k6-load-test.js
```

### 5. Contract Testing
```bash
npx hardhat test
REPORT_GAS=true npx hardhat test
```

## Additional Tools to Consider

### Future Enhancements:
1. **Chromatic/Percy** - Visual regression testing
2. **Cypress** - Alternative E2E testing
3. **Storybook** - Component testing
4. **Bundle Analyzer** - Bundle size monitoring
5. **Knip** - Dead code detection
6. **Slither** - Solidity static analysis
7. **Echidna** - Property-based fuzzing

## Troubleshooting

### Tests Failing Locally
```bash
# Clean and reinstall
npm run clean:all
npm install

# Rebuild
npm run build

# Check if dev server is running
npm run dev
```

### Playwright Installation Issues
```bash
# Install browsers
npx playwright install

# Install system dependencies
npx playwright install-deps
```

### k6 Not Found
```bash
# macOS
brew install k6

# Linux
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Contributing

When adding new tests:
1. Follow existing patterns in `test/` directories
2. Update this README with new test documentation
3. Add npm scripts to `package.json`
4. Update CI/CD configuration if needed
5. Include test data and mocks in `test/fixtures/`

## Resources

- [Hardhat Documentation](https://hardhat.org/docs)
- [Playwright Documentation](https://playwright.dev/)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Pa11y Documentation](https://github.com/pa11y/pa11y)
- [k6 Documentation](https://k6.io/docs/)
