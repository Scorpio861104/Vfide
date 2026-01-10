# Accessibility Testing Guide

## Overview

Accessibility (a11y) tests verify WCAG 2.1 compliance using `jest-axe`.

## Running Tests

```bash
# Run all a11y tests
npm run test:a11y

# Run in watch mode
npm run test:a11y:watch

# Run specific test
jest __tests__/a11y/accessibility.test.tsx

# Run with coverage
jest __tests__/a11y --coverage
```

## Test Structure

Tests are located in `__tests__/a11y/` and check:

1. **No automated violations** - axe-core scans
2. **ARIA attributes** - Proper labels, roles, states
3. **Keyboard navigation** - Tab order, focus management
4. **Semantic HTML** - Proper heading hierarchy, landmarks
5. **Color contrast** - WCAG AA minimum 4.5:1 ratio
6. **Images** - Alt text for meaningful images
7. **Forms** - Labels, error messages, validation

## Writing A11y Tests

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('component has no a11y violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Manual Testing

Use browser DevTools:
- **Chrome/Edge**: Lighthouse, axe DevTools extension
- **Firefox**: WAVE, axe DevTools extension
- **Safari**: Web Inspector → Accessibility audit

## WCAG Standards

Tests validate:
- **WCAG 2.1 Level A** - Minimum compliance
- **WCAG 2.1 Level AA** - Enhanced compliance (target)
- **WCAG 2.1 Level AAA** - Enhanced+ compliance (optional)

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Missing labels | Use `<label htmlFor="id">` |
| Poor contrast | Use contrast checker tool |
| No keyboard access | Ensure all interactive elements are focusable |
| Missing alt text | Add `alt` to images |
| Non-semantic HTML | Use `<button>`, `<nav>`, `<main>`, etc. |

## CI/CD Integration

A11y tests run as part of Jest suite and can be:
- Run separately: `npm run test:a11y`
- Included in full test: `npm test`
- Integrated in CI pipeline
