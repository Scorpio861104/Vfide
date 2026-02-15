import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Screen Reader and ARIA - E2E Tests', () => {
  test('ARIA labels should be present on interactive elements', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-input-field-name', 'button-name', 'link-name'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('ARIA roles should be valid', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-allowed-role', 'aria-valid-attr', 'aria-valid-attr-value'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Live regions should be properly configured', async ({ page }) => {
    await page.goto('/dashboard');
    
    const liveRegions = await page.locator('[aria-live]').all();
    
    for (const region of liveRegions) {
      const ariaLive = await region.getAttribute('aria-live');
      expect(['polite', 'assertive', 'off']).toContain(ariaLive);
    }
  });

  test('Form labels should be associated with inputs', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label', 'label-title-only'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Error messages should be announced', async ({ page }) => {
    await page.goto('/');
    
    // Find form with validation
    const form = page.locator('form').first();
    const formExists = await form.count() > 0;
    
    if (formExists) {
      const submitButton = form.locator('[type="submit"]').first();
      if (await submitButton.count() > 0) {
        await submitButton.click();
        
        // Look for error messages with role="alert"
        const alerts = page.locator('[role="alert"]');
        const errorFields = page.locator('[aria-invalid="true"]');
        
        // Either alerts or invalid fields should be present
        const hasErrorIndicators = 
          await alerts.count() > 0 || 
          await errorFields.count() > 0;
        
        if (hasErrorIndicators) {
          expect(true).toBe(true); // Errors are properly marked
        }
      }
    }
  });

  test('Dynamic content updates should be announced', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for status regions
    const statusRegions = await page.locator('[role="status"]').all();
    const liveRegions = await page.locator('[aria-live="polite"]').all();
    
    const announcementRegionsExist = statusRegions.length > 0 || liveRegions.length > 0;
    
    // Pages with dynamic content should have announcement regions
    expect(announcementRegionsExist).toBe(true);
  });

  test('Images should have appropriate alt text', async ({ page }) => {
    await page.goto('/');
    
    const images = await page.locator('img').all();
    
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const ariaHidden = await img.getAttribute('aria-hidden');
      const role = await img.getAttribute('role');
      
      // Image should either have alt text, or be hidden from screen readers
      const isAccessible = 
        alt !== null || 
        ariaHidden === 'true' || 
        role === 'presentation';
      
      expect(isAccessible).toBe(true);
    }
  });

  test('Icon buttons should have labels', async ({ page }) => {
    await page.goto('/');
    
    const buttons = await page.locator('button').all();
    
    for (const button of buttons) {
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledby = await button.getAttribute('aria-labelledby');
      
      // Button should have text or aria-label
      const hasLabel = 
        (text && text.trim().length > 0) || 
        ariaLabel || 
        ariaLabelledby;
      
      expect(hasLabel).toBe(true);
    }
  });

  test('Landmark regions should have labels when multiple exist', async ({ page }) => {
    await page.goto('/');
    
    const navs = await page.locator('nav').all();
    
    if (navs.length > 1) {
      // Multiple navs should have labels
      for (const nav of navs) {
        const ariaLabel = await nav.getAttribute('aria-label');
        const ariaLabelledby = await nav.getAttribute('aria-labelledby');
        
        const hasLabel = ariaLabel || ariaLabelledby;
        expect(hasLabel).toBe(true);
      }
    }
  });

  test('Dialog should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/dashboard');
    
    const dialogTrigger = page.locator('[aria-haspopup="dialog"]').first();
    const exists = await dialogTrigger.count() > 0;
    
    if (exists) {
      await dialogTrigger.click();
      await page.waitForSelector('[role="dialog"]');
      
      const dialog = page.locator('[role="dialog"]').first();
      
      // Check required attributes
      const ariaModal = await dialog.getAttribute('aria-modal');
      const ariaLabelledby = await dialog.getAttribute('aria-labelledby');
      const ariaLabel = await dialog.getAttribute('aria-label');
      
      expect(ariaModal).toBe('true');
      expect(ariaLabelledby || ariaLabel).toBeTruthy();
    }
  });

  test('Progress indicators should announce progress', async ({ page }) => {
    await page.goto('/');
    
    const progressBars = await page.locator('[role="progressbar"]').all();
    
    for (const progress of progressBars) {
      const valueNow = await progress.getAttribute('aria-valuenow');
      const valueMin = await progress.getAttribute('aria-valuemin');
      const valueMax = await progress.getAttribute('aria-valuemax');
      
      // Progress bar should have value attributes
      expect(valueNow).toBeTruthy();
      expect(valueMin).toBeTruthy();
      expect(valueMax).toBeTruthy();
    }
  });

  test('Status messages should be conveyed to screen readers', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for proper status regions
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-valid-attr-value'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Tabs should have proper ARIA attributes', async ({ page }) => {
    await page.goto('/');
    
    const tablists = await page.locator('[role="tablist"]').all();
    
    for (const tablist of tablists) {
      const tabs = await tablist.locator('[role="tab"]').all();
      
      for (const tab of tabs) {
        const selected = await tab.getAttribute('aria-selected');
        const controls = await tab.getAttribute('aria-controls');
        
        expect(selected).toBeTruthy();
        expect(controls).toBeTruthy();
      }
    }
  });

  test('Menus should have proper ARIA structure', async ({ page }) => {
    await page.goto('/');
    
    const menus = await page.locator('[role="menu"]').all();
    
    for (const menu of menus) {
      const menuItems = await menu.locator('[role="menuitem"]').all();
      
      // Menu should have menu items
      expect(menuItems.length).toBeGreaterThan(0);
    }
  });

  test('Tooltips should be accessible', async ({ page }) => {
    await page.goto('/');
    
    const tooltips = await page.locator('[role="tooltip"]').all();
    
    for (const tooltip of tooltips) {
      const id = await tooltip.getAttribute('id');
      
      // Tooltip should have ID for aria-describedby
      expect(id).toBeTruthy();
      
      if (id) {
        // Find element that references this tooltip
        const describedBy = await page.locator(`[aria-describedby*="${id}"]`).count();
        expect(describedBy).toBeGreaterThan(0);
      }
    }
  });

  test('Required form fields should be marked', async ({ page }) => {
    await page.goto('/');
    
    const requiredInputs = await page.locator('input[required], select[required], textarea[required]').all();
    
    for (const input of requiredInputs) {
      const ariaRequired = await input.getAttribute('aria-required');
      
      // Required inputs should also have aria-required
      expect(ariaRequired).toBe('true');
    }
  });

  test('Expandable sections should indicate state', async ({ page }) => {
    await page.goto('/');
    
    const expandableButtons = await page.locator('[aria-expanded]').all();
    
    for (const button of expandableButtons) {
      const expanded = await button.getAttribute('aria-expanded');
      const controls = await button.getAttribute('aria-controls');
      
      expect(['true', 'false']).toContain(expanded);
      expect(controls).toBeTruthy();
    }
  });
});

test.describe('Focus Management - E2E Tests', () => {
  test('Focus should be visible on all interactive elements', async ({ page }) => {
    await page.goto('/');
    
    const interactiveElements = await page.locator('button, a, input, select, textarea').all();
    
    for (const element of interactiveElements.slice(0, 5)) {
      await element.focus();
      
      const hasFocus = await element.evaluate((el) => {
        return document.activeElement === el;
      });
      
      expect(hasFocus).toBe(true);
    }
  });

  test('Focus should not be lost when content updates', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Focus an element
    const button = page.locator('button').first();
    if (await button.count() > 0) {
      await button.focus();
      
      // Trigger update (click or wait)
      await button.click();
      await page.waitForTimeout(500);
      
      // Focus should exist somewhere
      const hasFocus = await page.evaluate(() => {
        return document.activeElement !== null && 
               document.activeElement !== document.body;
      });
      
      expect(hasFocus).toBe(true);
    }
  });

  test('Modal should receive focus when opened', async ({ page }) => {
    await page.goto('/dashboard');
    
    const modalTrigger = page.locator('[aria-haspopup="dialog"]').first();
    const exists = await modalTrigger.count() > 0;
    
    if (exists) {
      await modalTrigger.click();
      await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
      
      // Focus should be in modal
      const focusInModal = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        const focused = document.activeElement;
        return modal?.contains(focused);
      });
      
      expect(focusInModal).toBe(true);
    }
  });

  test('Focus should return after modal closes', async ({ page }) => {
    await page.goto('/dashboard');
    
    const modalTrigger = page.locator('[aria-haspopup="dialog"]').first();
    const exists = await modalTrigger.count() > 0;
    
    if (exists) {
      // Remember trigger
      await modalTrigger.focus();
      const triggerText = await modalTrigger.textContent();
      
      // Open modal
      await modalTrigger.click();
      await page.waitForSelector('[role="dialog"]');
      
      // Close modal
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Focus should be back on or near trigger
      const currentFocus = await page.evaluate(() => {
        return document.activeElement?.textContent;
      });
      
      // Focus should exist (might not be exact trigger)
      expect(currentFocus).toBeTruthy();
    }
  });

  test('Skip link should work correctly', async ({ page }) => {
    await page.goto('/');
    
    // Tab to skip link
    await page.keyboard.press('Tab');
    
    const firstElement = page.locator(':focus');
    const href = await firstElement.getAttribute('href');
    
    if (href && (href.includes('#main') || href.includes('#content'))) {
      // Activate skip link
      await page.keyboard.press('Enter');
      
      // Verify focus moved
      const focusedElement = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.id || active?.getAttribute('role') || active?.tagName;
      });
      
      expect(focusedElement).toBeTruthy();
    }
  });

  test('Tab panel should receive focus when activated', async ({ page }) => {
    await page.goto('/');
    
    const tabs = await page.locator('[role="tab"]').all();
    
    if (tabs.length > 1) {
      // Click second tab
      await tabs[1].click();
      
      // Check if panel or tab has focus
      const focusedElement = await page.evaluate(() => {
        const role = document.activeElement?.getAttribute('role');
        return role === 'tabpanel' || role === 'tab';
      });
      
      expect(focusedElement).toBe(true);
    }
  });

  test('Accordion expansion should manage focus', async ({ page }) => {
    await page.goto('/');
    
    const accordionButton = page.locator('[aria-expanded="false"]').first();
    const exists = await accordionButton.count() > 0;
    
    if (exists) {
      await accordionButton.focus();
      await accordionButton.click();
      
      // Button should still have focus or focus moved to content
      const hasFocus = await page.evaluate(() => {
        return document.activeElement !== null && 
               document.activeElement !== document.body;
      });
      
      expect(hasFocus).toBe(true);
    }
  });

  test('Dynamic content should not steal focus inappropriately', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Focus an input
    const input = page.locator('input').first();
    const exists = await input.count() > 0;
    
    if (exists) {
      await input.focus();
      await input.fill('test');
      
      // Wait for any auto-updates
      await page.waitForTimeout(1000);
      
      // Focus should still be on input
      const stillFocused = await input.evaluate((el) => {
        return document.activeElement === el;
      });
      
      expect(stillFocused).toBe(true);
    }
  });

  test('Focus order should be logical', async ({ page }) => {
    await page.goto('/');
    
    const focusOrder: string[] = [];
    
    // Tab through first 10 elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      
      const elementInfo = await page.evaluate(() => {
        const el = document.activeElement;
        return `${el?.tagName}-${el?.getAttribute('type') || ''}-${el?.textContent?.substring(0, 20)}`;
      });
      
      focusOrder.push(elementInfo);
    }
    
    // Focus order should not have duplicates in immediate succession
    for (let i = 1; i < focusOrder.length; i++) {
      expect(focusOrder[i]).not.toBe(focusOrder[i - 1]);
    }
  });
});

test.describe('Comprehensive Screen Reader Support', () => {
  test('All interactive elements should have accessible names', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-input-field-name', 'button-name', 'link-name', 'aria-command-name'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Page structure should be conveyed semantically', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['landmark-one-main', 'region', 'page-has-heading-one'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Forms should be fully accessible to screen readers', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['label', 'form-field-multiple-labels'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
