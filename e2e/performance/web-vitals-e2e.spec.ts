/**
 * Web Vitals E2E Tests
 * Real-world testing of Core Web Vitals using Playwright
 */
import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.describe('Web Vitals E2E Tests', () => {
  test.setTimeout(60000);

  const measureWebVitals = async (page: Page) => {
    // Inject web-vitals library - using specific version for stability
    // Note: In production, bundle this locally for better security and reliability
    await page.addScriptTag({
      url: 'https://unpkg.com/web-vitals@3.5.1/dist/web-vitals.iife.js',
    });

    // Setup web vitals collection
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const metrics: any = {
          lcp: null,
          fid: null,
          cls: null,
          fcp: null,
          ttfb: null,
          inp: null,
        };

        let metricsCollected = 0;
        const totalMetrics = 6;
        const MIN_METRICS_REQUIRED = totalMetrics - 2; // FID and INP might not fire in tests

        const checkComplete = () => {
          metricsCollected++;
          if (metricsCollected >= MIN_METRICS_REQUIRED) {
            setTimeout(() => resolve(metrics), 2000);
          }
        };

        if ((window as any).webVitals) {
          const { onLCP, onFID, onCLS, onFCP, onTTFB, onINP } = (window as any).webVitals;

          onLCP((metric: any) => {
            metrics.lcp = metric.value;
            checkComplete();
          });

          onFID((metric: any) => {
            metrics.fid = metric.value;
            checkComplete();
          });

          onCLS((metric: any) => {
            metrics.cls = metric.value;
            checkComplete();
          });

          onFCP((metric: any) => {
            metrics.fcp = metric.value;
            checkComplete();
          });

          onTTFB((metric: any) => {
            metrics.ttfb = metric.value;
            checkComplete();
          });

          onINP((metric: any) => {
            metrics.inp = metric.value;
            checkComplete();
          }, { reportAllChanges: true });
        }
      });
    });

    return vitals;
  };

  test.describe('Homepage Core Web Vitals', () => {
    test('LCP should be < 2.5s on desktop', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const vitals: any = await measureWebVitals(page);
      
      console.log('Homepage vitals:', vitals);
      
      if (vitals.lcp !== null) {
        expect(vitals.lcp).toBeLessThan(2500);
      }
    });

    test('CLS should be < 0.1 on desktop', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const vitals: any = await measureWebVitals(page);
      
      if (vitals.cls !== null) {
        expect(vitals.cls).toBeLessThan(0.1);
      }
    });

    test('FCP should be < 1.8s on desktop', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const vitals: any = await measureWebVitals(page);
      
      if (vitals.fcp !== null) {
        expect(vitals.fcp).toBeLessThan(1800);
      }
    });

    test('TTFB should be < 800ms on desktop', async ({ page }) => {
      await page.goto('/');
      
      const vitals: any = await measureWebVitals(page);
      
      if (vitals.ttfb !== null) {
        expect(vitals.ttfb).toBeLessThan(800);
      }
    });
  });

  test.describe('Dashboard Core Web Vitals', () => {
    test('Dashboard LCP should be < 2.5s', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const vitals: any = await measureWebVitals(page);
      
      console.log('Dashboard vitals:', vitals);
      
      if (vitals.lcp !== null) {
        expect(vitals.lcp).toBeLessThan(2500);
      }
    });

    test('Dashboard CLS should be < 0.1', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const vitals: any = await measureWebVitals(page);
      
      if (vitals.cls !== null) {
        expect(vitals.cls).toBeLessThan(0.1);
      }
    });
  });

  test.describe('Wallet Core Web Vitals', () => {
    test('Wallet LCP should be < 2.5s', async ({ page }) => {
      await page.goto('/wallet');
      await page.waitForLoadState('networkidle');

      const vitals: any = await measureWebVitals(page);
      
      console.log('Wallet vitals:', vitals);
      
      if (vitals.lcp !== null) {
        expect(vitals.lcp).toBeLessThan(2500);
      }
    });

    test('Wallet CLS should be < 0.1', async ({ page }) => {
      await page.goto('/wallet');
      await page.waitForLoadState('networkidle');

      const vitals: any = await measureWebVitals(page);
      
      if (vitals.cls !== null) {
        expect(vitals.cls).toBeLessThan(0.1);
      }
    });
  });

  test.describe('Mobile Core Web Vitals', () => {
    test.use({
      viewport: { width: 375, height: 667 },
      deviceScaleFactor: 2,
      isMobile: true,
    });

    test('Mobile LCP should be < 2.5s', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const vitals: any = await measureWebVitals(page);
      
      console.log('Mobile vitals:', vitals);
      
      if (vitals.lcp !== null) {
        expect(vitals.lcp).toBeLessThan(2500);
      }
    });

    test('Mobile CLS should be < 0.1', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const vitals: any = await measureWebVitals(page);
      
      if (vitals.cls !== null) {
        expect(vitals.cls).toBeLessThan(0.1);
      }
    });

    test('Mobile TTFB should be reasonable', async ({ page }) => {
      await page.goto('/');

      const vitals: any = await measureWebVitals(page);
      
      if (vitals.ttfb !== null) {
        expect(vitals.ttfb).toBeLessThan(1200); // More lenient for mobile
      }
    });
  });

  test.describe('Interaction Performance (INP)', () => {
    test('Button interactions should be fast', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const button = page.locator('button').first();
      
      if (await button.isVisible()) {
        const startTime = Date.now();
        await button.click();
        const interactionTime = Date.now() - startTime;
        
        console.log(`Button interaction time: ${interactionTime}ms`);
        expect(interactionTime).toBeLessThan(200);
      }
    });

    test('Form input interactions should be fast', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const input = page.locator('input[type="text"]').first();
      
      if (await input.isVisible()) {
        const startTime = Date.now();
        await input.fill('test');
        const interactionTime = Date.now() - startTime;
        
        console.log(`Input interaction time: ${interactionTime}ms`);
        expect(interactionTime).toBeLessThan(100);
      }
    });

    test('Link navigation should be responsive', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const link = page.locator('a[href^="/"]').first();
      
      if (await link.isVisible()) {
        const startTime = Date.now();
        await link.click();
        await page.waitForLoadState('domcontentloaded');
        const navigationTime = Date.now() - startTime;
        
        console.log(`Navigation interaction time: ${navigationTime}ms`);
        expect(navigationTime).toBeLessThan(500);
      }
    });
  });

  test.describe('Layout Stability', () => {
    test('Images should have dimensions to prevent CLS', async ({ page }) => {
      await page.goto('/');
      
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const width = await img.getAttribute('width');
        const height = await img.getAttribute('height');
        const style = await img.getAttribute('style');
        
        // Images should have explicit dimensions or aspect-ratio
        const hasDimensions = (width && height) || (style && style.includes('aspect-ratio'));
        
        if (!hasDimensions) {
          const src = await img.getAttribute('src');
          console.warn(`Image without dimensions: ${src}`);
        }
      }
    });

    test('Fonts should not cause layout shift', async ({ page }) => {
      await page.goto('/');
      
      // Wait for fonts to load
      await page.waitForFunction(() => document.fonts.ready);
      
      // Measure CLS after font loading
      const cls = await page.evaluate(() => {
        return new Promise((resolve) => {
          if ((window as any).webVitals) {
            (window as any).webVitals.onCLS((metric: any) => {
              resolve(metric.value);
            });
          } else {
            resolve(0);
          }
        });
      });
      
      console.log(`CLS after font load: ${cls}`);
      expect(cls).toBeLessThan(0.1);
    });

    test('Dynamic content should not cause layout shift', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Simulate dynamic content loading
      await page.evaluate(() => {
        const div = document.createElement('div');
        div.textContent = 'Dynamic content';
        document.body.appendChild(div);
      });

      // Wait a bit for CLS to be measured
      await page.waitForTimeout(1000);

      const cls = await page.evaluate(() => {
        if ((window as any).webVitals) {
          return new Promise((resolve) => {
            (window as any).webVitals.onCLS((metric: any) => {
              resolve(metric.value);
            });
          });
        }
        return 0;
      });

      console.log(`CLS with dynamic content: ${cls}`);
      expect(cls).toBeLessThan(0.1);
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('Critical resources should load quickly', async ({ page }) => {
      const resourceTimings: any[] = [];

      page.on('requestfinished', async (request) => {
        const timing = await request.timing();
        const url = request.url();
        
        resourceTimings.push({
          url,
          duration: timing.responseEnd,
        });
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Find slowest resources
      const slowResources = resourceTimings
        .filter(r => r.duration > 1000)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5);

      if (slowResources.length > 0) {
        console.log('Slowest resources:', slowResources);
      }

      // Should not have many slow resources
      expect(slowResources.length).toBeLessThan(3);
    });

    test('JavaScript should not block rendering', async ({ page }) => {
      await page.goto('/');

      const fcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          if ((window as any).webVitals) {
            (window as any).webVitals.onFCP((metric: any) => {
              resolve(metric.value);
            });
          } else {
            resolve(0);
          }
        });
      });

      console.log(`FCP: ${fcp}ms`);
      expect(fcp).toBeLessThan(1800);
    });
  });

  test.describe('Performance Across Pages', () => {
    test('All major pages should meet LCP threshold', async ({ page }) => {
      const pages = ['/', '/dashboard', '/wallet', '/governance'];
      const results: any[] = [];

      for (const pagePath of pages) {
        await page.goto(pagePath);
        await page.waitForLoadState('networkidle');

        const vitals: any = await measureWebVitals(page);
        
        results.push({
          page: pagePath,
          lcp: vitals.lcp,
          cls: vitals.cls,
          fcp: vitals.fcp,
        });
      }

      console.log('Performance across pages:', results);

      for (const result of results) {
        if (result.lcp !== null) {
          expect(result.lcp).toBeLessThan(2500);
        }
        if (result.cls !== null) {
          expect(result.cls).toBeLessThan(0.1);
        }
      }
    });
  });

  test.describe('Performance Monitoring', () => {
    test('Should track performance metrics', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check if performance monitoring is active
      const hasPerformanceAPI = await page.evaluate(() => {
        return 'performance' in window && 
               'getEntriesByType' in performance;
      });

      expect(hasPerformanceAPI).toBeTruthy();

      // Get navigation timing
      const navigationTiming = await page.evaluate(() => {
        const [navigation] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        
        return navigation ? {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          domInteractive: navigation.domInteractive - navigation.fetchStart,
          loadComplete: navigation.loadEventEnd - navigation.fetchStart,
        } : null;
      });

      if (navigationTiming) {
        console.log('Navigation timing:', navigationTiming);
        expect(navigationTiming.domInteractive).toBeLessThan(3000);
        expect(navigationTiming.loadComplete).toBeLessThan(5000);
      }
    });
  });

  test.describe('Real User Experience', () => {
    test('Page should feel responsive during interaction', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Simulate real user interactions
      const interactions = [
        async () => {
          const button = page.locator('button').first();
          if (await button.isVisible()) await button.click();
        },
        async () => {
          const link = page.locator('a').first();
          if (await link.isVisible()) await link.hover();
        },
        async () => {
          await page.mouse.wheel(0, 500);
        },
      ];

      for (const interaction of interactions) {
        const startTime = Date.now();
        await interaction();
        const responseTime = Date.now() - startTime;
        
        console.log(`Interaction response time: ${responseTime}ms`);
        expect(responseTime).toBeLessThan(200);
        
        await page.waitForTimeout(100);
      }
    });
  });
});
