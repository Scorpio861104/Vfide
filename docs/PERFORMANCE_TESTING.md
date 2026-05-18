# Performance Test Suite Documentation

## Overview

This comprehensive performance test suite ensures optimal performance across all aspects of the Vfide Next.js application. The tests cover Core Web Vitals, bundle sizes, render performance, API response times, and memory management.

## Test Structure

### Unit Tests (`__tests__/performance/`)

1. **lighthouse-budgets.test.ts** - Lighthouse CI performance budgets
2. **core-web-vitals.test.ts** - Core Web Vitals metrics testing
3. **bundle-size.test.ts** - Bundle size and code splitting verification
4. **render-performance.test.ts** - Component render times and optimization
5. **api-performance.test.ts** - API endpoint response times
6. **memory-leaks.test.ts** - Memory leak detection and cleanup verification

### E2E Tests (`e2e/performance/`)

1. **lighthouse-e2e.spec.ts** - End-to-end Lighthouse testing
2. **web-vitals-e2e.spec.ts** - Real-world Core Web Vitals testing

## Performance Thresholds

### Core Web Vitals

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5s - 4.0s | > 4.0s |
| FID (First Input Delay) | < 100ms | 100ms - 300ms | > 300ms |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1 - 0.25 | > 0.25 |
| TTFB (Time to First Byte) | < 800ms | 800ms - 1800ms | > 1800ms |
| INP (Interaction to Next Paint) | < 200ms | 200ms - 500ms | > 500ms |

### Additional Metrics

| Metric | Target |
|--------|--------|
| Performance Score | > 90 |
| Accessibility Score | > 90 |
| Best Practices Score | > 90 |
| SEO Score | > 90 |
| Total Bundle Size | < 500 KB |
| Main Page Bundle | < 150 KB |
| API Response Time | < 500ms |
| Component Render Time | < 16ms (60fps) |

## Running the Tests

### All Performance Tests
```bash
npm run test:performance
```

### Individual Test Suites

#### Lighthouse Tests
```bash
npm test -- __tests__/performance/lighthouse-budgets.test.ts
```

#### Core Web Vitals Tests
```bash
npm test -- __tests__/performance/core-web-vitals.test.ts
```

#### Bundle Size Tests
```bash
npm test -- __tests__/performance/bundle-size.test.ts
```

#### Render Performance Tests
```bash
npm test -- __tests__/performance/render-performance.test.ts
```

#### API Performance Tests
```bash
npm test -- __tests__/performance/api-performance.test.ts
```

#### Memory Leak Tests
```bash
npm test -- __tests__/performance/memory-leaks.test.ts
```

### E2E Performance Tests

#### Lighthouse E2E Tests
```bash
npm run test:e2e -- e2e/performance/lighthouse-e2e.spec.ts
```

#### Web Vitals E2E Tests
```bash
npm run test:e2e -- e2e/performance/web-vitals-e2e.spec.ts
```

### Run All Performance Tests
```bash
npm test -- __tests__/performance/
npm run test:e2e -- e2e/performance/
```

## CI/CD Integration

### GitHub Actions

Add to your `.github/workflows/ci.yml`:

```yaml
name: Performance Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build application
        run: npm run build
        
      - name: Run performance tests
        run: npm test -- __tests__/performance/
        
      - name: Run Lighthouse CI
        run: npm run test:performance
        
      - name: Run E2E performance tests
        run: npm run test:e2e -- e2e/performance/
        
      - name: Upload performance reports
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: |
            .lighthouseci/
            playwright-report/
            coverage/
```

### Performance Budget Monitoring

The tests automatically enforce performance budgets defined in:
- `lighthouse-budget.json` - Resource size budgets
- `lighthouserc.json` - Lighthouse CI configuration
- `.size-limit.json` - Bundle size limits

### Automated Alerts

Tests will fail if:
- Performance score drops below 90
- LCP exceeds 2.5s
- CLS exceeds 0.1
- Bundle size exceeds limits
- API response times exceed 500ms
- Memory leaks are detected

## Test Coverage

### Pages Tested

1. **Homepage** (`/`)
   - Performance score > 90
   - LCP < 2.5s
   - CLS < 0.1
   - Bundle size < 150KB

2. **Dashboard** (`/dashboard`)
   - Performance score > 90
   - LCP < 2.5s
   - Interactive components optimized

3. **Wallet** (`/wallet`)
   - Performance score > 90
   - Bundle size < 200KB
   - Fast Web3 interactions

4. **Governance** (`/governance`)
   - Performance score > 90
   - Efficient data loading
   - Smooth scrolling

### Components Tested

- UI Components (Button, Card, Progress, etc.)
- Form Components
- List Components (with virtualization)
- Navigation Components
- Dynamic Content

### API Endpoints Tested

- Health check endpoints
- User data endpoints
- Dashboard APIs
- Wallet APIs
- Governance APIs
- WebSocket connections

## Debugging Failed Tests

### Lighthouse Tests Failing

1. Check Lighthouse reports in `.lighthouseci/` directory
2. Review individual metric scores
3. Use Chrome DevTools Performance panel
4. Check for unused JavaScript/CSS

```bash
# Generate detailed Lighthouse report
npx lhci autorun --collect.settings.output=html
```

### Bundle Size Tests Failing

1. Run bundle analyzer:
```bash
npm run analyze
```

2. Check size-limit output:
```bash
npm run size
```

3. Identify large dependencies:
```bash
npm run size:why
```

### Performance Regression

1. Compare with previous baseline
2. Check recent code changes
3. Review added dependencies
4. Verify lazy loading

### Memory Leak Detection

1. Run tests with garbage collection:
```bash
node --expose-gc node_modules/.bin/jest __tests__/performance/memory-leaks.test.ts
```

2. Use Chrome DevTools Memory profiler
3. Check component cleanup
4. Verify event listener removal

## Best Practices

### Component Performance

1. **Memoization**
   - Use `React.memo()` for expensive components
   - Use `useMemo()` for expensive calculations
   - Use `useCallback()` for stable function references

2. **Lazy Loading**
   - Use dynamic imports for heavy components
   - Implement code splitting by route
   - Lazy load images below the fold

3. **Virtualization**
   - Use virtual scrolling for long lists
   - Implement pagination for large datasets
   - Lazy load off-screen content

### API Performance

1. **Caching**
   - Implement response caching
   - Use stale-while-revalidate
   - Cache static data aggressively

2. **Optimization**
   - Minimize database queries
   - Use database indexes
   - Implement query pagination
   - Optimize JOIN operations

3. **Rate Limiting**
   - Implement rate limiting
   - Use request batching
   - Optimize concurrent requests

### Bundle Optimization

1. **Code Splitting**
   - Split code by route
   - Extract common vendors
   - Use dynamic imports

2. **Tree Shaking**
   - Use ES6 imports
   - Avoid default exports for libraries
   - Check bundle analysis regularly

3. **Asset Optimization**
   - Compress images
   - Use modern image formats (WebP, AVIF)
   - Minify CSS and JavaScript
   - Use text compression (gzip, brotli)

## Monitoring & Reporting

### Continuous Monitoring

1. **Real User Monitoring (RUM)**
   - Integrate with Sentry Performance
   - Track Core Web Vitals in production
   - Monitor API response times

2. **Synthetic Monitoring**
   - Schedule Lighthouse CI runs
   - Monitor from multiple locations
   - Track performance trends

### Performance Reports

1. **Lighthouse Reports**
   - Generated in `.lighthouseci/` directory
   - View in Lighthouse CI server
   - Compare across builds

2. **Bundle Analysis**
   - View bundle composition
   - Identify optimization opportunities
   - Track size trends

3. **Test Reports**
   - Jest HTML reports
   - Playwright HTML reports
   - Coverage reports

## Troubleshooting

### Common Issues

#### Tests Timing Out
- Increase timeout in test configuration
- Check network connectivity
- Verify server is running

#### Inconsistent Results
- Run tests multiple times
- Use consistent network conditions
- Disable browser extensions

#### Memory Tests Failing
- Run with `--expose-gc` flag
- Increase memory allocation
- Check for actual leaks in code

## Contributing

When adding new features:

1. Add performance tests for new components
2. Verify bundle size impact
3. Test on slow networks
4. Check mobile performance
5. Update performance budgets if needed

## Resources

- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Bundle Analysis](https://nextjs.org/docs/advanced-features/measuring-performance#bundle-analysis)

## Support

For issues or questions:
1. Check existing test output
2. Review documentation
3. Open GitHub issue
4. Contact development team
