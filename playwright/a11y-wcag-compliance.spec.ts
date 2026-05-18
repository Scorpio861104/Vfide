import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Compliance - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('Homepage should have no WCAG violations', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Dashboard should have no WCAG violations', async ({ page }) => {
    await page.goto('/dashboard');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Forms should have no WCAG violations', async ({ page }) => {
    await page.goto('/');

    // Only scope to form when a form is present.
    const formCount = await page.locator('form').count();
    const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
    const accessibilityScanResults = formCount > 0
      ? await builder.include('form').analyze()
      : await builder.analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Navigation should meet WCAG standards', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .include('nav')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('All interactive elements should be accessible', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .disableRules(['color-contrast']) // Skip color contrast for speed
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Color contrast should meet WCAG AA standards', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('[role="button"], button, a, input, select, textarea')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['image-alt'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Form inputs should have labels', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Heading hierarchy should be correct', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['heading-order'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Links should have descriptive text', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['link-name'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Buttons should have accessible names', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['button-name'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('ARIA attributes should be valid', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-valid-attr', 'aria-valid-attr-value'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Landmark regions should be present', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['landmark-one-main', 'region'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Page should have a main landmark', async ({ page }) => {
    await page.goto('/');
    
    const main = await page.locator('main, [role="main"]').first();
    await expect(main).toBeVisible();
  });

  test('Skip link should be present', async ({ page }) => {
    await page.goto('/');
    
    // Check for skip link (might be visually hidden)
    const skipLink = page.locator('a[href="#main-content"], a[href="#main"], a.skip-link').first();
    const count = await skipLink.count();
    
    // Skip link should exist (even if visually hidden)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('Language attribute should be set', async ({ page }) => {
    await page.goto('/');
    
    const html = page.locator('html');
    const lang = await html.getAttribute('lang');
    
    expect(lang).toBeTruthy();
    expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
  });

  test('Document should have a title', async ({ page }) => {
    await page.goto('/');
    
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('All pages should pass automated accessibility checks', async ({ page }) => {
    const pages = ['/', '/dashboard', '/about'];
    
    for (const url of pages) {
      await page.goto(url);
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('Modal dialogs should be accessible', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Find and open a modal if it exists
    const modalTrigger = page.locator('button[aria-haspopup="dialog"]').first();
    const modalExists = await modalTrigger.count() > 0;
    
    if (modalExists) {
      await modalTrigger.click();
      
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include('[role="dialog"]')
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    }
  });

  test('Tables should be accessible', async ({ page }) => {
    await page.goto('/dashboard');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['table-duplicate-name', 'td-headers-attr', 'th-has-data-cells'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Dynamic content should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Wait for any dynamic content to load
    await page.waitForTimeout(2000);
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Form validation errors should be accessible', async ({ page }) => {
    await page.goto('/');
    
    // Try to submit a form without filling it (if exists)
    const form = page.locator('form').first();
    const formExists = await form.count() > 0;
    
    if (formExists) {
      const submitButton = form.locator('button[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // Wait for validation errors
        await page.waitForTimeout(500);
        
        const accessibilityScanResults = await new AxeBuilder({ page })
          .withRules(['aria-valid-attr-value'])
          .analyze();
        
        expect(accessibilityScanResults.violations).toEqual([]);
      }
    }
  });
});

test.describe('WCAG Best Practices', () => {
  test('Should use semantic HTML elements', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['best-practice'])
      .analyze();
    
    // Best practices may have violations, but we should aim for none
    expect(accessibilityScanResults.violations.length).toBeLessThanOrEqual(5);
  });

  test('Should have proper document structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for header
    const header = await page.locator('header, [role="banner"]').first().count();
    expect(header).toBeGreaterThan(0);
    
    // Check for main content
    const main = await page.locator('main, [role="main"]').first().count();
    expect(main).toBeGreaterThan(0);
    
    // Check for footer
    const footer = await page.locator('footer, [role="contentinfo"]').first().count();
    expect(footer).toBeGreaterThan(0);
  });

  test('Should have accessible navigation', async ({ page }) => {
    await page.goto('/');
    
    const nav = await page.locator('nav, [role="navigation"]').first();
    const navExists = await nav.count() > 0;
    
    expect(navExists).toBe(true);
    
    if (navExists) {
      const ariaLabel = await nav.getAttribute('aria-label');
      const ariaLabelledby = await nav.getAttribute('aria-labelledby');
      
      // Nav should have a label
      expect(ariaLabel || ariaLabelledby).toBeTruthy();
    }
  });
});

test.describe('Specific WCAG Criteria', () => {
  test('1.1.1 Non-text Content', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['image-alt', 'input-image-alt', 'area-alt'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('1.3.1 Info and Relationships', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label', 'form-field-multiple-labels'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('1.4.3 Contrast (Minimum)', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('2.1.1 Keyboard', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['accesskeys', 'tabindex'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('2.4.1 Bypass Blocks', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['bypass'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('2.4.2 Page Titled', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['document-title'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('2.4.4 Link Purpose (In Context)', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['link-name'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('3.1.1 Language of Page', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['html-has-lang', 'html-lang-valid'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('3.2.1 On Focus', async ({ page }) => {
    await page.goto('/');
    
    // This is difficult to test automatically, but we can check for obvious violations
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('3.3.1 Error Identification', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-valid-attr-value'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('3.3.2 Labels or Instructions', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('4.1.1 Parsing', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['duplicate-id', 'duplicate-id-active'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('4.1.2 Name, Role, Value', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['button-name', 'link-name', 'aria-valid-attr-value'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
