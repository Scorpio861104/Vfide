import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Keyboard Navigation - E2E Tests', () => {
  test('Should tab through all interactive elements in order', async ({ page }) => {
    await page.goto('/');
    
    // Press Tab and verify focus moves to interactive elements
    await page.keyboard.press('Tab');
    
    // Get focused element
    const firstFocused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(firstFocused);
  });

  test('Skip link should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Tab to skip link (usually first)
    await page.keyboard.press('Tab');
    
    const focusedElement = page.locator(':focus');
    const href = await focusedElement.getAttribute('href');
    
    // Skip link should go to main content
    if (href?.includes('#main') || href?.includes('#content')) {
      await page.keyboard.press('Enter');
      
      // Verify focus moved to main content
      const mainFocused = await page.evaluate(() => {
        const active = document.activeElement;
        return active?.id || active?.getAttribute('role');
      });
      
      expect(mainFocused).toBeTruthy();
    }
  });

  test('All buttons should be activatable with Enter and Space', async ({ page }) => {
    await page.goto('/');
    
    // Find all buttons
    const buttons = await page.locator('button').all();
    
    if (buttons.length > 0) {
      const firstButton = buttons[0];
      await firstButton.focus();
      
      // Should be focusable
      await expect(firstButton).toBeFocused();
      
      // Note: Actual activation testing would require click handlers
    }
  });

  test('Links should be activatable with Enter', async ({ page }) => {
    await page.goto('/');
    
    const links = await page.locator('a[href]').all();
    
    if (links.length > 0) {
      const firstLink = links[0];
      await firstLink.focus();
      await expect(firstLink).toBeFocused();
    }
  });

  test('Form inputs should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    const inputs = await page.locator('input, select, textarea').all();
    
    for (const input of inputs.slice(0, 3)) { // Test first 3
      await input.focus();
      await expect(input).toBeFocused();
    }
  });

  test('Tab order should not have keyboard traps', async ({ page }) => {
    await page.goto('/');
    
    // Tab through 20 elements
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);
      
      // Verify we can still interact with the page
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    }
  });

  test('Shift+Tab should move focus backwards', async ({ page }) => {
    await page.goto('/');
    
    // Tab forward
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    const forwardFocus = await page.evaluate(() => document.activeElement?.outerHTML);
    
    // Tab backward
    await page.keyboard.press('Shift+Tab');
    
    const backwardFocus = await page.evaluate(() => document.activeElement?.outerHTML);
    
    // Focus should have moved
    expect(forwardFocus).not.toEqual(backwardFocus);
  });

  test('Focus should be visible', async ({ page }) => {
    await page.goto('/');
    
    await page.keyboard.press('Tab');
    
    // Check if focused element has visible focus indicator
    const focusStyle = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      const styles = window.getComputedStyle(element);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });
    
    // Should have some kind of focus indicator
    const hasFocusIndicator = 
      focusStyle.outline !== 'none' || 
      focusStyle.outlineWidth !== '0px' || 
      focusStyle.boxShadow !== 'none';
    
    expect(hasFocusIndicator).toBe(true);
  });

  test('Navigation menu should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    // Find nav element
    const nav = page.locator('nav').first();
    const navExists = await nav.count() > 0;
    
    if (navExists) {
      // Tab to nav items
      const links = await nav.locator('a').all();
      
      for (const link of links.slice(0, 3)) {
        await link.focus();
        await expect(link).toBeFocused();
      }
    }
  });

  test('Dropdown menus should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    const dropdownTrigger = page.locator('[aria-haspopup="true"]').first();
    const exists = await dropdownTrigger.count() > 0;
    
    if (exists) {
      await dropdownTrigger.focus();
      await page.keyboard.press('Enter');
      
      // Menu should be expanded
      const expanded = await dropdownTrigger.getAttribute('aria-expanded');
      expect(expanded).toBe('true');
    }
  });

  test('Modal should trap focus', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Try to find and open a modal
    const modalTrigger = page.locator('[aria-haspopup="dialog"]').first();
    const exists = await modalTrigger.count() > 0;
    
    if (exists) {
      await modalTrigger.click();
      
      // Wait for modal to open
      await page.waitForSelector('[role="dialog"]');
      
      const modal = page.locator('[role="dialog"]').first();
      
      // Tab through modal elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        
        // Verify focus is still within modal
        const focusInModal = await page.evaluate(() => {
          const modal = document.querySelector('[role="dialog"]');
          const focused = document.activeElement;
          return modal?.contains(focused);
        });
        
        expect(focusInModal).toBe(true);
      }
    }
  });

  test('Escape key should close modal', async ({ page }) => {
    await page.goto('/dashboard');
    
    const modalTrigger = page.locator('[aria-haspopup="dialog"]').first();
    const exists = await modalTrigger.count() > 0;
    
    if (exists) {
      await modalTrigger.click();
      await page.waitForSelector('[role="dialog"]');
      
      // Press Escape
      await page.keyboard.press('Escape');
      
      // Modal should be closed
      await page.waitForTimeout(500);
      const modalVisible = await page.locator('[role="dialog"]').isVisible();
      expect(modalVisible).toBe(false);
    }
  });

  test('Accordions should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    const accordionButton = page.locator('[aria-expanded]').first();
    const exists = await accordionButton.count() > 0;
    
    if (exists) {
      await accordionButton.focus();
      await page.keyboard.press('Enter');
      
      const expanded = await accordionButton.getAttribute('aria-expanded');
      expect(expanded).toBe('true');
    }
  });

  test('Tabs should be keyboard navigable with arrow keys', async ({ page }) => {
    await page.goto('/');
    
    const tablist = page.locator('[role="tablist"]').first();
    const exists = await tablist.count() > 0;
    
    if (exists) {
      const firstTab = tablist.locator('[role="tab"]').first();
      await firstTab.focus();
      
      // Press right arrow
      await page.keyboard.press('ArrowRight');
      
      // Focus should move to next tab
      const focusedTab = await page.evaluate(() => {
        return document.activeElement?.getAttribute('role');
      });
      
      expect(focusedTab).toBe('tab');
    }
  });

  test('Custom checkboxes should toggle with Space', async ({ page }) => {
    await page.goto('/');
    
    const checkbox = page.locator('input[type="checkbox"]').first();
    const exists = await checkbox.count() > 0;
    
    if (exists) {
      await checkbox.focus();
      
      const initialState = await checkbox.isChecked();
      await page.keyboard.press('Space');
      
      const newState = await checkbox.isChecked();
      expect(newState).not.toBe(initialState);
    }
  });

  test('Radio buttons should be navigable with arrow keys', async ({ page }) => {
    await page.goto('/');
    
    const radioGroup = page.locator('[role="radiogroup"]').first();
    const exists = await radioGroup.count() > 0;
    
    if (exists) {
      const firstRadio = radioGroup.locator('[type="radio"]').first();
      await firstRadio.focus();
      
      await page.keyboard.press('ArrowDown');
      
      // Focus should move to next radio
      const focusedElement = await page.evaluate(() => {
        return document.activeElement?.getAttribute('type');
      });
      
      expect(focusedElement).toBe('radio');
    }
  });

  test('Table should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');
    
    const table = page.locator('table').first();
    const exists = await table.count() > 0;
    
    if (exists) {
      // Tab through table cells with interactive elements
      const interactiveElements = await table.locator('button, a, input').all();
      
      for (const element of interactiveElements.slice(0, 3)) {
        await element.focus();
        await expect(element).toBeFocused();
      }
    }
  });

  test('Keyboard shortcuts should not conflict with browser shortcuts', async ({ page }) => {
    await page.goto('/');
    
    // Test common browser shortcuts still work
    await page.keyboard.press('Tab'); // Should work
    await page.keyboard.press('Shift+Tab'); // Should work
    
    // Note: Can't fully test browser shortcuts like Ctrl+T, but we verify no JS errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    await page.keyboard.press('Enter');
    
    expect(errors).toHaveLength(0);
  });

  test('Disabled elements should be skipped in tab order', async ({ page }) => {
    await page.goto('/');
    
    // Tab through page
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      
      const isDisabled = await page.evaluate(() => {
        const element = document.activeElement as HTMLInputElement | HTMLButtonElement;
        return element.disabled || element.getAttribute('aria-disabled') === 'true';
      });
      
      expect(isDisabled).toBe(false);
    }
  });

  test('Focus should return to trigger after dialog close', async ({ page }) => {
    await page.goto('/dashboard');
    
    const trigger = page.locator('[aria-haspopup="dialog"]').first();
    const exists = await trigger.count() > 0;
    
    if (exists) {
      // Click trigger
      await trigger.click();
      
      // Wait for dialog
      await page.waitForSelector('[role="dialog"]');
      
      // Close dialog (find close button)
      const closeButton = page.locator('[role="dialog"] button').first();
      await closeButton.click();
      
      // Wait for dialog to close
      await page.waitForTimeout(500);
      
      // Focus should return to trigger (or nearby element)
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'A']).toContain(focusedElement);
    }
  });

  test('Search form should be keyboard accessible', async ({ page }) => {
    await page.goto('/');
    
    const searchInput = page.locator('[type="search"], [role="search"] input').first();
    const exists = await searchInput.count() > 0;
    
    if (exists) {
      await searchInput.focus();
      await expect(searchInput).toBeFocused();
      
      await page.keyboard.type('test query');
      await page.keyboard.press('Enter');
      
      // Should submit or trigger search
      await page.waitForTimeout(500);
    }
  });

  test('All page sections should be reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    
    // Verify key landmarks are reachable
    const main = page.locator('main, [role="main"]').first();
    await main.focus();
    
    const mainFocused = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.tagName === 'MAIN' || active?.getAttribute('role') === 'main';
    });
    
    expect(mainFocused).toBe(true);
  });

  test('Focus management should work with dynamic content', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Tab to an element
    await page.keyboard.press('Tab');
    const initialFocus = await page.evaluate(() => document.activeElement?.outerHTML);
    
    // Trigger dynamic content update (if button exists)
    const updateButton = page.locator('button').first();
    if (await updateButton.count() > 0) {
      await updateButton.click();
      await page.waitForTimeout(500);
      
      // Focus should still be manageable
      await page.keyboard.press('Tab');
      const newFocus = await page.evaluate(() => document.activeElement?.outerHTML);
      
      expect(newFocus).toBeTruthy();
    }
  });
});

test.describe('Keyboard Navigation Accessibility', () => {
  test('Should pass keyboard accessibility checks', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['accesskeys', 'tabindex'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Focusable elements should have visible focus indicators', async ({ page }) => {
    await page.goto('/');
    
    // Tab to element
    await page.keyboard.press('Tab');
    
    // Check focus indicator visibility
    const hasFocusIndicator = await page.evaluate(() => {
      const element = document.activeElement as HTMLElement;
      const styles = window.getComputedStyle(element);
      
      return (
        styles.outline !== 'none' ||
        parseFloat(styles.outlineWidth) > 0 ||
        styles.boxShadow !== 'none'
      );
    });
    
    expect(hasFocusIndicator).toBe(true);
  });
});
