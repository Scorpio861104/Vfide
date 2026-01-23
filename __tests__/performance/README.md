# Performance Test Suite

Comprehensive performance testing for the Vfide Next.js application.

## Quick Start

```bash
# Run all performance tests
npm run test:performance:all

# Run unit performance tests only
npm run test:performance:unit

# Run E2E performance tests only
npm run test:performance:e2e

# Run Lighthouse CI
npm run test:performance
```

## Test Coverage

### 1. Lighthouse Performance Budgets
- **File**: `__tests__/performance/lighthouse-budgets.test.ts`
- **Tests**: Performance scores, resource budgets, best practices, SEO
- **Thresholds**: Performance > 90, Accessibility > 90, Best Practices > 90, SEO > 90

### 2. Core Web Vitals
- **File**: `__tests__/performance/core-web-vitals.test.ts`
- **Tests**: LCP, FID, CLS, TTFB, INP, FCP, Speed Index, TTI
- **Thresholds**: LCP < 2.5s, CLS < 0.1, FID < 100ms, TTFB < 800ms

### 3. Bundle Size
- **File**: `__tests__/performance/bundle-size.test.ts`
- **Tests**: Total bundle size, code splitting, tree shaking, chunk sizes
- **Thresholds**: Total < 500KB, Main page < 150KB, No chunk > 250KB

### 4. Render Performance
- **File**: `__tests__/performance/render-performance.test.ts`
- **Tests**: Component render times, re-render frequency, hydration, memoization
- **Thresholds**: Component render < 16ms, State updates < 50ms

### 5. API Performance
- **File**: `__tests__/performance/api-performance.test.ts`
- **Tests**: Response times, database queries, caching, rate limiting, WebSocket
- **Thresholds**: API response < 500ms, Health check < 100ms, Concurrent handling

### 6. Memory & Resource Management
- **File**: `__tests__/performance/memory-leaks.test.ts`
- **Tests**: Memory leaks, event listener cleanup, timer cleanup, subscription management
- **Thresholds**: No memory leaks, proper cleanup, memory growth < 20%

## E2E Performance Tests

### 7. Lighthouse E2E
- **File**: `e2e/performance/lighthouse-e2e.spec.ts`
- **Tests**: Real-world Lighthouse audits, network conditions, resource loading
- **Coverage**: Desktop, mobile, slow 3G, image optimization, third-party resources

### 8. Web Vitals E2E
- **File**: `e2e/performance/web-vitals-e2e.spec.ts`
- **Tests**: Real user Core Web Vitals, interaction performance, layout stability
- **Coverage**: All major pages, mobile and desktop, real user scenarios

## Performance Thresholds

| Metric | Target | Test File |
|--------|--------|-----------|
| Performance Score | > 90 | lighthouse-budgets |
| LCP | < 2.5s | core-web-vitals, web-vitals-e2e |
| FID/INP | < 100ms/200ms | core-web-vitals, web-vitals-e2e |
| CLS | < 0.1 | core-web-vitals, web-vitals-e2e |
| TTFB | < 800ms | core-web-vitals |
| Total Bundle | < 500KB | bundle-size |
| API Response | < 500ms | api-performance |
| Component Render | < 16ms | render-performance |
| Memory Growth | < 20% | memory-leaks |

## Running Specific Tests

### Run Single Test Suite
```bash
# Lighthouse tests
npm test -- __tests__/performance/lighthouse-budgets.test.ts

# Core Web Vitals
npm test -- __tests__/performance/core-web-vitals.test.ts

# Bundle size
npm test -- __tests__/performance/bundle-size.test.ts

# Render performance
npm test -- __tests__/performance/render-performance.test.ts

# API performance
npm test -- __tests__/performance/api-performance.test.ts

# Memory leaks
npm test -- __tests__/performance/memory-leaks.test.ts
```

### Run E2E Tests
```bash
# Lighthouse E2E
npm run test:e2e -- e2e/performance/lighthouse-e2e.spec.ts

# Web Vitals E2E
npm run test:e2e -- e2e/performance/web-vitals-e2e.spec.ts
```

### Run with Specific Options
```bash
# Run with verbose output
npm test -- __tests__/performance/ --verbose

# Run in watch mode
npm test -- __tests__/performance/ --watch

# Run with coverage
npm test -- __tests__/performance/ --coverage

# Run E2E with headed browser
npm run test:e2e -- e2e/performance/ --headed

# Run E2E with specific browser
npm run test:e2e -- e2e/performance/ --project=chromium
```

## CI/CD Integration

### GitHub Actions

The tests are designed to run in CI/CD pipelines:

```yaml
- name: Run Performance Tests
  run: |
    npm run build
    npm run test:performance:all
```

### Pre-commit Hooks

Add to `.husky/pre-commit`:

```bash
npm run test:performance:unit
```

### Pre-push Hooks

Add to `.husky/pre-push`:

```bash
npm run test:performance:all
```

## Environment Variables

```bash
# Base URL for testing
BASE_URL=http://localhost:3000

# Enable verbose logging
DEBUG=performance:*

# Lighthouse CI token (optional)
LHCI_GITHUB_APP_TOKEN=your_token
```

## Debugging

### View Lighthouse Reports
```bash
# Generate HTML reports
npx lhci autorun --collect.settings.output=html

# Open reports
open .lighthouseci/lhr-*.html
```

### Analyze Bundle
```bash
# Run bundle analyzer
npm run analyze

# Check specific bundle sizes
npm run size

# Detailed analysis
npm run size:why
```

### Memory Profiling
```bash
# Run with garbage collection
node --expose-gc node_modules/.bin/jest __tests__/performance/memory-leaks.test.ts

# Run with heap snapshot
node --expose-gc --max-old-space-size=4096 node_modules/.bin/jest
```

### Debug E2E Tests
```bash
# Run in UI mode
npm run test:e2e -- e2e/performance/ --ui

# Run in debug mode
npm run test:e2e -- e2e/performance/ --debug

# Run with trace
npm run test:e2e -- e2e/performance/ --trace on
```

## Best Practices

### Writing Performance Tests

1. **Use Realistic Scenarios**
   ```typescript
   test('should handle user workflow', async () => {
     // Test actual user journey
   });
   ```

2. **Set Appropriate Timeouts**
   ```typescript
   test('expensive operation', async () => {
     // code
   }, 60000); // 60s timeout
   ```

3. **Clean Up Resources**
   ```typescript
   afterEach(() => {
     cleanup();
   });
   ```

4. **Use Proper Assertions**
   ```typescript
   expect(responseTime).toBeLessThan(500);
   ```

### Optimizing Performance

1. **Component Optimization**
   - Use `React.memo()`
   - Implement `useMemo()` and `useCallback()`
   - Lazy load heavy components

2. **Bundle Optimization**
   - Code split by route
   - Tree shake unused code
   - Use dynamic imports

3. **API Optimization**
   - Implement caching
   - Use pagination
   - Optimize database queries

4. **Asset Optimization**
   - Compress images
   - Use modern formats (WebP)
   - Lazy load images

## Troubleshooting

### Tests Failing

1. **Lighthouse Tests**
   - Check `.lighthouseci/` reports
   - Review specific metrics
   - Verify network conditions

2. **Bundle Size Tests**
   - Run `npm run analyze`
   - Check for new dependencies
   - Review code splitting

3. **API Tests**
   - Verify server is running
   - Check network connectivity
   - Review API logs

4. **Memory Tests**
   - Run with `--expose-gc`
   - Check for component cleanup
   - Verify event listeners

### Common Issues

**Issue**: Tests timeout
**Solution**: Increase timeout or check server

**Issue**: Inconsistent results
**Solution**: Run multiple times, use consistent network

**Issue**: Memory tests fail
**Solution**: Enable garbage collection flag

**Issue**: E2E tests fail
**Solution**: Check browser version, update Playwright

## Performance Monitoring

### Production Monitoring

1. **Real User Monitoring**
   - Integrate with Sentry
   - Track Core Web Vitals
   - Monitor API performance

2. **Synthetic Monitoring**
   - Schedule Lighthouse CI
   - Track trends over time
   - Alert on regressions

### Performance Dashboard

View performance trends:
- Lighthouse CI dashboard
- Bundle size history
- API response time graphs
- Memory usage trends

## Resources

- [Full Documentation](../docs/PERFORMANCE_TESTING.md)
- [Web Vitals](https://web.dev/vitals/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Playwright](https://playwright.dev/)

## Contributing

When adding performance tests:

1. Follow existing patterns
2. Use appropriate thresholds
3. Document test purpose
4. Update this README
5. Add to CI/CD pipeline

## Support

For questions or issues:
- Open GitHub issue
- Check documentation
- Review test logs
- Contact team

## License

Same as main project
