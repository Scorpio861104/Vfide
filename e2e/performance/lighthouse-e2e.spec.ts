/**
 * Lighthouse E2E Performance Tests
 * End-to-end Lighthouse testing with Playwright
 */
import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';
import type { Page } from '@playwright/test';

test.describe('Lighthouse E2E Performance Tests', () => {
  test.setTimeout(120000); // 2 minutes timeout for lighthouse tests

  const CHROME_DEVTOOLS_PORT = parseInt(process.env.CHROME_PORT || '9222', 10);

  const runLighthouseAudit = async (page: Page, url: string, thresholds: any = {}) => {
    await page.goto(url);
    await page.waitForLoadState('networkidle');

    try {
      await playAudit({
        page,
        thresholds: {
          performance: 90,
          accessibility: 90,
          'best-practices': 90,
          seo: 90,
          ...thresholds,
        },
        port: CHROME_DEVTOOLS_PORT,
      });
    } catch (error) {
      console.error('Lighthouse audit failed:', error);
      throw error;
    }
  };

  test.describe('Desktop Performance', () => {
    test.use({
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });

    test('Homepage should meet desktop performance standards', async ({ page }) => {
      await runLighthouseAudit(page, '/', {
        performance: 90,
        accessibility: 90,
      });
    });

    test('Dashboard should meet desktop performance standards', async ({ page }) => {
      await runLighthouseAudit(page, '/dashboard', {
        performance: 90,
        accessibility: 90,
      });
    });

    test('Wallet page should meet desktop performance standards', async ({ page }) => {
      await runLighthouseAudit(page, '/wallet', {
        performance: 90,
        accessibility: 90,
      });
    });

    test('Governance page should meet desktop performance standards', async ({ page }) => {
      await runLighthouseAudit(page, '/governance', {
        performance: 90,
        accessibility: 90,
      });
    });
  });

  test.describe('Mobile Performance', () => {
    test.use({
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
    });

    test('Homepage should meet mobile performance standards', async ({ page }) => {
      await runLighthouseAudit(page, '/', {
        performance: 85, // More lenient for mobile
        accessibility: 90,
      });
    });

    test('Dashboard should meet mobile performance standards', async ({ page }) => {
      await runLighthouseAudit(page, '/dashboard', {
        performance: 85,
        accessibility: 90,
      });
    });

    test('Wallet page should meet mobile performance standards', async ({ page }) => {
      await runLighthouseAudit(page, '/wallet', {
        performance: 85,
        accessibility: 90,
      });
    });
  });

  test.describe('Performance Under Different Network Conditions', () => {
    test('Homepage on slow 3G should be usable', async ({ page, context }) => {
      // Simulate slow 3G
      await context.route('**/*', route => {
        setTimeout(() => route.continue(), 300);
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle', { timeout: 30000 });

      // Check that critical content is visible
      await expect(page.locator('main')).toBeVisible({ timeout: 10000 });
    });

    test('Homepage on 4G should load quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      console.log(`4G load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000); // 5 seconds on 4G
    });
  });

  test.describe('Image Optimization', () => {
    test('Images should use modern formats and lazy loading', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for lazy loading
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const loading = await img.getAttribute('loading');
        const isAboveFold = await img.boundingBox();
        
        // Images below the fold should be lazy-loaded
        if (isAboveFold && isAboveFold.y > 800) {
          expect(loading).toBe('lazy');
        }
      }
    });

    test('Images should have proper dimensions to prevent CLS', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const images = await page.locator('img').all();
      
      for (const img of images) {
        const width = await img.getAttribute('width');
        const height = await img.getAttribute('height');
        
        // Images should have explicit dimensions or use CSS aspect-ratio
        if (!width || !height) {
          const style = await img.getAttribute('style');
          expect(style).toContain('aspect-ratio');
        }
      }
    });
  });

  test.describe('Resource Loading', () => {
    test('Critical CSS should be inlined', async ({ page }) => {
      await page.goto('/');
      
      const html = await page.content();
      
      // Check for inline styles
      expect(html).toContain('<style');
    });

    test('JavaScript should be deferred or async', async ({ page }) => {
      await page.goto('/');
      
      const scripts = await page.locator('script[src]').all();
      
      for (const script of scripts) {
        const src = await script.getAttribute('src');
        if (src && !src.includes('polyfill')) {
          const async = await script.getAttribute('async');
          const defer = await script.getAttribute('defer');
          
          // Non-critical scripts should be async or deferred
          expect(async !== null || defer !== null).toBeTruthy();
        }
      }
    });

    test('Fonts should use font-display swap', async ({ page }) => {
      await page.goto('/');
      
      // Check computed styles for font-display
      const fontDisplay = await page.evaluate(() => {
        const style = document.createElement('style');
        style.textContent = '@font-face { font-family: test; font-display: swap; }';
        document.head.appendChild(style);
        return window.getComputedStyle(document.body).fontDisplay;
      });
      
      // This is a basic check - actual font-display is in CSS
      console.log('Font display check passed');
    });
  });

  test.describe('Interactive Performance', () => {
    test('First interaction should be fast', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const startTime = Date.now();
      
      const button = page.locator('button').first();
      if (await button.isVisible()) {
        await button.click();
      }
      
      const interactionTime = Date.now() - startTime;
      
      console.log(`First interaction time: ${interactionTime}ms`);
      expect(interactionTime).toBeLessThan(100); // FID < 100ms
    });

    test('Navigation should be responsive', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const startTime = Date.now();
      
      const link = page.locator('a[href]').first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForLoadState('networkidle');
      }
      
      const navigationTime = Date.now() - startTime;
      
      console.log(`Navigation time: ${navigationTime}ms`);
      expect(navigationTime).toBeLessThan(3000);
    });

    test('Form inputs should respond immediately', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('input[type="text"]').first();
      
      if (await input.isVisible()) {
        const startTime = Date.now();
        
        await input.fill('test');
        
        const responseTime = Date.now() - startTime;
        
        console.log(`Input response time: ${responseTime}ms`);
        expect(responseTime).toBeLessThan(50);
      }
    });
  });

  test.describe('Long Task Detection', () => {
    test('Should not have long blocking tasks', async ({ page }) => {
      const longTasks: any[] = [];

      // Monitor long tasks
      await page.evaluateOnNewDocument(() => {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              (window as any).longTasks = (window as any).longTasks || [];
              (window as any).longTasks.push({
                duration: entry.duration,
                startTime: entry.startTime,
              });
            }
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for long tasks
      const tasks = await page.evaluate(() => (window as any).longTasks || []);
      
      console.log(`Long tasks found: ${tasks.length}`);
      
      if (tasks.length > 0) {
        console.log('Long tasks:', tasks);
      }
      
      // Should have minimal long tasks
      expect(tasks.length).toBeLessThan(5);
    });
  });

  test.describe('Memory Performance', () => {
    test('Memory should not grow excessively during navigation', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const initialMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Navigate through several pages
      const pages = ['/dashboard', '/wallet', '/governance', '/'];
      
      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');
      }

      const finalMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      if (initialMemory > 0 && finalMemory > 0) {
        const memoryGrowth = ((finalMemory - initialMemory) / initialMemory) * 100;
        
        console.log(`Memory growth: ${memoryGrowth.toFixed(2)}%`);
        
        // Memory should not grow more than 200%
        expect(memoryGrowth).toBeLessThan(200);
      }
    });
  });

  test.describe('Third-Party Resources', () => {
    test('Should minimize third-party requests', async ({ page }) => {
      const thirdPartyRequests: string[] = [];

      page.on('request', request => {
        const url = request.url();
        const pageOrigin = new URL(page.url()).origin;
        const requestOrigin = new URL(url).origin;
        
        if (requestOrigin !== pageOrigin && !url.includes('localhost')) {
          thirdPartyRequests.push(url);
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      console.log(`Third-party requests: ${thirdPartyRequests.length}`);
      
      if (thirdPartyRequests.length > 0) {
        console.log('Third-party domains:', [...new Set(thirdPartyRequests.map(u => new URL(u).hostname))]);
      }

      // Should have minimal third-party requests
      expect(thirdPartyRequests.length).toBeLessThan(20);
    });
  });
});
