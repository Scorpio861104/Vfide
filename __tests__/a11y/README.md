# Accessibility (a11y) Test Suite

Comprehensive accessibility testing suite for the Vfide application ensuring WCAG 2.1 AA compliance.

## Overview

This test suite provides comprehensive coverage of accessibility requirements including:
- WCAG 2.1 Level A and AA criteria
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Focus management
- Interactive components
- Page-level accessibility

## Test Files

### Jest Unit/Integration Tests

Located in `__tests__/a11y/`:

#### 1. `wcag-compliance.test.tsx`
Comprehensive WCAG 2.1 AA compliance tests covering all four principles:
- **Perceivable** (Principle 1)
  - Text alternatives (1.1)
  - Time-based media (1.2)
  - Adaptable content (1.3)
  - Distinguishable elements (1.4)
- **Operable** (Principle 2)
  - Keyboard accessible (2.1)
  - Enough time (2.2)
  - Seizures prevention (2.3)
  - Navigable (2.4)
  - Input modalities (2.5)
- **Understandable** (Principle 3)
  - Readable (3.1)
  - Predictable (3.2)
  - Input assistance (3.3)
- **Robust** (Principle 4)
  - Compatible with assistive technologies (4.1)

**Tests:** 50+ tests covering all WCAG 2.1 AA criteria

#### 2. `keyboard-navigation.test.tsx`
Keyboard accessibility and navigation tests:
- Logical tab order
- Keyboard activation (Enter, Space)
- Skip links
- Focus indicators visibility
- No keyboard traps
- Modal focus trapping
- Complex widget navigation (tabs, accordions, trees, menus)
- Table navigation

**Tests:** 40+ tests for keyboard interaction patterns

#### 3. `screen-reader.test.tsx`
Screen reader and ARIA tests:
- ARIA labels and descriptions
- ARIA roles (semantic and custom)
- Live regions (polite and assertive)
- Form label associations
- Error message announcements
- Status updates
- Hidden content handling
- Complex widget ARIA patterns

**Tests:** 45+ tests for screen reader compatibility

#### 4. `color-contrast.test.tsx`
Color contrast compliance tests:
- Normal text (4.5:1 ratio)
- Large text (3:1 ratio)
- UI components (3:1 ratio)
- Focus indicators
- Dark mode contrast
- Light mode contrast
- Color independence
- Gradient and transparent backgrounds

**Tests:** 35+ tests for color contrast requirements

#### 5. `focus-management.test.tsx`
Focus management and visibility tests:
- Visible focus indicators
- Focus never lost
- Logical focus movement
- Modal focus trapping
- Return focus after modal close
- Focus on page navigation
- Dynamic content focus
- Complex widget focus

**Tests:** 30+ tests for focus management

#### 6. `interactive-components.test.tsx`
Interactive component accessibility:
- Buttons (labels, states, groups)
- Links (descriptive text, icons, external links)
- Forms (inputs, labels, errors)
- Images (alt text, decorative images)
- Icons (meaningful and decorative)
- Tables (headers, sorting, actions)
- Custom components (dropdowns, tooltips, modals, carousels)

**Tests:** 40+ tests for interactive elements

#### 7. `page-accessibility.test.tsx`
Page-level accessibility tests:
- Homepage structure and navigation
- Dashboard layout and widgets
- Form accessibility
- Data tables
- Modals and dialogs
- Navigation menus
- Search functionality

**Tests:** 30+ tests for complete pages

### Playwright E2E Tests

Located in `playwright/`:

#### 1. `a11y-wcag-compliance.spec.ts`
End-to-end WCAG compliance validation:
- Full page scans with axe-core
- Specific WCAG criteria testing
- Multiple page testing
- Dynamic content validation
- Modal and dialog testing
- Form validation accessibility

**Tests:** 30+ E2E tests

#### 2. `a11y-keyboard-navigation.spec.ts`
Keyboard navigation in real browsers:
- Tab order verification
- Skip link functionality
- Button and link activation
- Form input navigation
- Keyboard trap detection
- Modal focus management
- Dropdown and menu navigation
- Visual focus indicators

**Tests:** 25+ E2E keyboard tests

#### 3. `a11y-screen-reader-focus.spec.ts`
Screen reader and focus management E2E:
- ARIA attribute validation
- Live region testing
- Form label associations
- Image alt text verification
- Dynamic content announcements
- Focus visibility
- Focus return after interactions

**Tests:** 25+ E2E screen reader tests

## Running Tests

### Run all accessibility tests:
```bash
npm run test:a11y
```

### Run specific test file:
```bash
npm test -- __tests__/a11y/wcag-compliance.test.tsx
npm test -- __tests__/a11y/keyboard-navigation.test.tsx
npm test -- __tests__/a11y/screen-reader.test.tsx
npm test -- __tests__/a11y/color-contrast.test.tsx
npm test -- __tests__/a11y/focus-management.test.tsx
npm test -- __tests__/a11y/interactive-components.test.tsx
npm test -- __tests__/a11y/page-accessibility.test.tsx
```

### Run E2E accessibility tests:
```bash
npm run test:e2e -- playwright/a11y-wcag-compliance.spec.ts
npm run test:e2e -- playwright/a11y-keyboard-navigation.spec.ts
npm run test:e2e -- playwright/a11y-screen-reader-focus.spec.ts
```

### Watch mode for development:
```bash
npm run test:a11y:watch
```

## Test Coverage

The test suite provides coverage for:
- ✅ All WCAG 2.1 Level A criteria
- ✅ All WCAG 2.1 Level AA criteria
- ✅ Keyboard-only navigation
- ✅ Screen reader compatibility (ARIA, labels, descriptions)
- ✅ Color contrast (4.5:1 and 3:1 ratios)
- ✅ Focus management and visibility
- ✅ Interactive component accessibility
- ✅ Form accessibility
- ✅ Table accessibility
- ✅ Modal and dialog accessibility
- ✅ Navigation and menu accessibility
- ✅ Dynamic content accessibility
- ✅ Error handling and validation
- ✅ Page structure and landmarks

## Tools Used

- **jest-axe**: Automated accessibility testing with axe-core
- **@axe-core/playwright**: E2E accessibility testing
- **@testing-library/react**: Component testing
- **@testing-library/user-event**: User interaction simulation
- **Playwright**: Cross-browser E2E testing

## WCAG 2.1 AA Compliance Matrix

| Criterion | Level | Covered | Test Location |
|-----------|-------|---------|---------------|
| 1.1.1 Non-text Content | A | ✅ | wcag-compliance.test.tsx |
| 1.2.1 Audio-only and Video-only | A | ✅ | wcag-compliance.test.tsx |
| 1.2.2 Captions | A | ✅ | wcag-compliance.test.tsx |
| 1.2.3 Audio Description or Media Alternative | A | ✅ | wcag-compliance.test.tsx |
| 1.3.1 Info and Relationships | A | ✅ | wcag-compliance.test.tsx |
| 1.3.2 Meaningful Sequence | A | ✅ | wcag-compliance.test.tsx |
| 1.3.3 Sensory Characteristics | A | ✅ | wcag-compliance.test.tsx |
| 1.4.1 Use of Color | A | ✅ | color-contrast.test.tsx |
| 1.4.2 Audio Control | A | ✅ | wcag-compliance.test.tsx |
| 1.4.3 Contrast (Minimum) | AA | ✅ | color-contrast.test.tsx |
| 1.4.4 Resize Text | AA | ✅ | wcag-compliance.test.tsx |
| 1.4.5 Images of Text | AA | ✅ | wcag-compliance.test.tsx |
| 2.1.1 Keyboard | A | ✅ | keyboard-navigation.test.tsx |
| 2.1.2 No Keyboard Trap | A | ✅ | keyboard-navigation.test.tsx |
| 2.2.1 Timing Adjustable | A | ✅ | wcag-compliance.test.tsx |
| 2.2.2 Pause, Stop, Hide | A | ✅ | wcag-compliance.test.tsx |
| 2.3.1 Three Flashes or Below | A | ✅ | wcag-compliance.test.tsx |
| 2.4.1 Bypass Blocks | A | ✅ | keyboard-navigation.test.tsx |
| 2.4.2 Page Titled | A | ✅ | page-accessibility.test.tsx |
| 2.4.3 Focus Order | A | ✅ | focus-management.test.tsx |
| 2.4.4 Link Purpose (In Context) | A | ✅ | interactive-components.test.tsx |
| 2.4.5 Multiple Ways | AA | ✅ | page-accessibility.test.tsx |
| 2.4.6 Headings and Labels | AA | ✅ | wcag-compliance.test.tsx |
| 2.4.7 Focus Visible | AA | ✅ | focus-management.test.tsx |
| 2.5.1 Pointer Gestures | A | ✅ | wcag-compliance.test.tsx |
| 2.5.2 Pointer Cancellation | A | ✅ | wcag-compliance.test.tsx |
| 2.5.3 Label in Name | A | ✅ | screen-reader.test.tsx |
| 2.5.4 Motion Actuation | A | ✅ | wcag-compliance.test.tsx |
| 3.1.1 Language of Page | A | ✅ | wcag-compliance.test.tsx |
| 3.1.2 Language of Parts | AA | ✅ | wcag-compliance.test.tsx |
| 3.2.1 On Focus | A | ✅ | wcag-compliance.test.tsx |
| 3.2.2 On Input | A | ✅ | wcag-compliance.test.tsx |
| 3.2.3 Consistent Navigation | AA | ✅ | page-accessibility.test.tsx |
| 3.2.4 Consistent Identification | AA | ✅ | wcag-compliance.test.tsx |
| 3.3.1 Error Identification | A | ✅ | screen-reader.test.tsx |
| 3.3.2 Labels or Instructions | A | ✅ | interactive-components.test.tsx |
| 3.3.3 Error Suggestion | AA | ✅ | wcag-compliance.test.tsx |
| 3.3.4 Error Prevention | AA | ✅ | wcag-compliance.test.tsx |
| 4.1.1 Parsing | A | ✅ | wcag-compliance.test.tsx |
| 4.1.2 Name, Role, Value | A | ✅ | screen-reader.test.tsx |
| 4.1.3 Status Messages | AA | ✅ | screen-reader.test.tsx |

## Best Practices

### When Writing Accessible Components

1. **Always provide text alternatives**
   ```tsx
   // Good
   <img src="logo.png" alt="Company logo" />
   <button aria-label="Close dialog">×</button>
   
   // Bad
   <img src="logo.png" />
   <button>×</button>
   ```

2. **Associate labels with inputs**
   ```tsx
   // Good
   <label htmlFor="email">Email</label>
   <input id="email" type="email" />
   
   // Bad
   <div>Email</div>
   <input type="email" />
   ```

3. **Use semantic HTML**
   ```tsx
   // Good
   <button onClick={handleClick}>Click me</button>
   <nav><ul><li><a href="/">Home</a></li></ul></nav>
   
   // Bad
   <div onClick={handleClick}>Click me</div>
   <div><div><a href="/">Home</a></div></div>
   ```

4. **Ensure keyboard accessibility**
   ```tsx
   // Good
   <div role="button" tabIndex={0} onKeyDown={handleKeyDown}>
   
   // Bad
   <div onClick={handleClick}>
   ```

5. **Use ARIA appropriately**
   ```tsx
   // Good
   <div role="dialog" aria-modal="true" aria-labelledby="title">
     <h2 id="title">Dialog Title</h2>
   </div>
   
   // Bad
   <div>
     <h2>Dialog Title</h2>
   </div>
   ```

6. **Maintain proper contrast**
   ```tsx
   // Good - 4.5:1 ratio
   color: #000000 on backgroundColor: #ffffff
   
   // Bad - insufficient contrast
   color: #999999 on backgroundColor: #cccccc
   ```

## Continuous Integration

The accessibility tests are integrated into the CI/CD pipeline and run on:
- Every pull request
- Before deployment
- Nightly builds

## Reporting Issues

When accessibility issues are found:
1. Create a GitHub issue with the `accessibility` label
2. Include the specific WCAG criterion violated
3. Provide steps to reproduce
4. Suggest a fix if possible

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)
- [A11y Project](https://www.a11yproject.com/)

## Support

For questions or assistance with accessibility:
- Check the test documentation
- Review existing test patterns
- Consult the WCAG guidelines
- Ask in the #accessibility Slack channel

## License

Part of the Vfide project - see main LICENSE file.
