# Frontend Testing Strategy

## Complete Testing Stack

| Tool | Purpose | Command | Coverage |
|------|---------|---------|----------|
| **Jest** | Unit & Integration | `npm test` | 606 tests across 26 suites |
| **jest-axe** | Accessibility (a11y) | `npm run test:a11y` | WCAG 2.1 compliance |
| **Playwright** | End-to-End (E2E) | `npm run test:e2e` | Multi-browser, multi-device |
| **Percy** | Visual Regression | `npm run test:visual` | Pixel-perfect diffs |
| **ESLint** | Code Quality | `npm run lint` | Code standards |

## Test Pyramid

```
        /\
       /  \   E2E Tests (Playwright)
      /    \  - Critical user flows
     /------\
    /        \   Integration Tests (Jest)
   /          \ - Component interactions
  /            \
 /--~~~~~~~~~~~~\
/                \  Unit Tests (Jest)
/                  \ - Individual functions
```

## Running All Tests

```bash
# Full test suite (unit + integration + a11y)
npm test && npm run test:a11y

# With coverage
npm run test:coverage

# Add E2E and visual (requires local dev server)
npm run dev &  # Start in background
npm run test:e2e
npm run test:visual
```

## CI/CD Pipeline

```bash
# Lint
npm run lint

# Unit tests + Coverage
npm run test:ci

# A11y tests
npm run test:a11y

# E2E tests (if environment ready)
npm run test:e2e

# Visual regression (with Percy token)
PERCY_TOKEN=xxx npm run test:visual
```

## What Each Tool Tests

### Jest (606 Tests)
- ✅ Component rendering
- ✅ Hook behavior
- ✅ Utility functions
- ✅ Integration between components
- ✅ Error handling
- ✅ State management

**Files:** `__tests__/`, `components/__tests__/`, `hooks/__tests__/`, `lib/__tests__/`

### jest-axe (Accessibility)
- ✅ WCAG 2.1 violations
- ✅ Keyboard navigation
- ✅ ARIA attributes
- ✅ Semantic HTML
- ✅ Color contrast
- ✅ Label associations

**Files:** `__tests__/a11y/`

### Playwright (E2E)
- ✅ Full user workflows
- ✅ Navigation flows
- ✅ Wallet integration
- ✅ Form submissions
- ✅ Cross-browser compatibility
- ✅ Mobile responsiveness

**Files:** `e2e/`

### Percy (Visual)
- ✅ Pixel-perfect rendering
- ✅ Layout consistency
- ✅ Responsive design
- ✅ Browser-specific rendering
- ✅ Device-specific layouts

**Command:** `npm run test:visual`

### ESLint (Code Quality)
- ✅ Unused variables
- ✅ Code style
- ✅ Best practices
- ✅ Type safety
- ✅ React rules

**Command:** `npm run lint`

## Test Coverage Goals

| Metric | Target | Current |
|--------|--------|---------|
| Unit coverage | 80%+ | ✅ High |
| Integration coverage | 60%+ | ✅ High |
| E2E critical flows | 100% | 🔄 In progress |
| A11y compliance | WCAG AA | 🔄 In progress |
| Visual regression | Key pages | 🔄 In progress |

## Development Workflow

1. **Write component** with accessibility first
2. **Add unit tests** - Test behavior
3. **Add a11y tests** - Verify accessibility
4. **Add E2E tests** - Test user flows
5. **Visual snapshot** - Capture baseline
6. **Run full suite** before pushing

## Debugging Tests

```bash
# Debug unit test
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug E2E test
npm run test:e2e:debug

# View E2E report
npx playwright show-report

# Run single test file
jest __tests__/specific.test.tsx
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)
- [Percy Documentation](https://docs.percy.io/)
- [jest-axe Guide](https://github.com/nickcolley/jest-axe)
- [WCAG 2.1 Standards](https://www.w3.org/WAI/WCAG21/quickref/)
