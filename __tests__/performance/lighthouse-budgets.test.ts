/**
 * Lighthouse Performance Budget Tests
 * Validates that performance budgets defined in lighthouse-budget.json are met
 */
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import type { RunnerResult } from 'lighthouse';

describe('Lighthouse Performance Budgets', () => {
  let browser: Browser;
  let page: Page;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  beforeAll(async () => {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  const runLighthouse = async (url: string): Promise<RunnerResult | undefined> => {
    const pageUrl = new URL(page.url() || BASE_URL);
    const port = pageUrl.port || (pageUrl.protocol === 'https:' ? '443' : '80');
    const chromePort = parseInt(process.env.CHROME_PORT || '9222', 10);
    
    return await lighthouse(url, {
      port: chromePort,
      output: 'json',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      formFactor: 'desktop',
      screenEmulation: {
        mobile: false,
        width: 1350,
        height: 940,
        deviceScaleFactor: 1,
        disabled: false,
      },
      throttling: {
        rttMs: 40,
        throughputKbps: 10240,
        cpuSlowdownMultiplier: 1,
      },
    });
  };

  describe('Core Performance Metrics', () => {
    test('Homepage should meet performance score > 90', async () => {
      const result = await runLighthouse(BASE_URL);
      
      expect(result?.lhr.categories.performance.score).toBeGreaterThanOrEqual(0.9);
    }, 60000);

    test('Dashboard should meet performance score > 90', async () => {
      const result = await runLighthouse(`${BASE_URL}/dashboard`);
      
      expect(result?.lhr.categories.performance.score).toBeGreaterThanOrEqual(0.9);
    }, 60000);

    test('Wallet page should meet performance score > 90', async () => {
      const result = await runLighthouse(`${BASE_URL}/wallet`);
      
      expect(result?.lhr.categories.performance.score).toBeGreaterThanOrEqual(0.9);
    }, 60000);

    test('Governance page should meet performance score > 90', async () => {
      const result = await runLighthouse(`${BASE_URL}/governance`);
      
      expect(result?.lhr.categories.performance.score).toBeGreaterThanOrEqual(0.9);
    }, 60000);
  });

  describe('Resource Budgets', () => {
    test('Total bundle size should be under 700KB', async () => {
      const result = await runLighthouse(BASE_URL);
      const audits = result?.lhr.audits;
      
      if (audits?.['resource-summary']) {
        const resourceSummary = audits['resource-summary'].details as any;
        const totalSize = resourceSummary?.items?.reduce(
          (acc: number, item: any) => acc + (item.transferSize || 0),
          0
        ) || 0;
        
        expect(totalSize).toBeLessThan(700 * 1024); // 700KB
      }
    }, 60000);

    test('Script resources should be under 300KB', async () => {
      const result = await runLighthouse(BASE_URL);
      const audits = result?.lhr.audits;
      
      if (audits?.['resource-summary']) {
        const resourceSummary = audits['resource-summary'].details as any;
        const scriptItem = resourceSummary?.items?.find(
          (item: any) => item.resourceType === 'script'
        );
        
        if (scriptItem) {
          expect(scriptItem.transferSize).toBeLessThan(300 * 1024); // 300KB
        }
      }
    }, 60000);

    test('Stylesheet resources should be under 50KB', async () => {
      const result = await runLighthouse(BASE_URL);
      const audits = result?.lhr.audits;
      
      if (audits?.['resource-summary']) {
        const resourceSummary = audits['resource-summary'].details as any;
        const styleItem = resourceSummary?.items?.find(
          (item: any) => item.resourceType === 'stylesheet'
        );
        
        if (styleItem) {
          expect(styleItem.transferSize).toBeLessThan(50 * 1024); // 50KB
        }
      }
    }, 60000);

    test('Image resources should be under 200KB', async () => {
      const result = await runLighthouse(BASE_URL);
      const audits = result?.lhr.audits;
      
      if (audits?.['resource-summary']) {
        const resourceSummary = audits['resource-summary'].details as any;
        const imageItem = resourceSummary?.items?.find(
          (item: any) => item.resourceType === 'image'
        );
        
        if (imageItem) {
          expect(imageItem.transferSize).toBeLessThan(200 * 1024); // 200KB
        }
      }
    }, 60000);
  });

  describe('Best Practices & SEO', () => {
    test('Accessibility score should be > 90', async () => {
      const result = await runLighthouse(BASE_URL);
      
      expect(result?.lhr.categories.accessibility.score).toBeGreaterThanOrEqual(0.9);
    }, 60000);

    test('Best practices score should be > 90', async () => {
      const result = await runLighthouse(BASE_URL);
      
      expect(result?.lhr.categories['best-practices'].score).toBeGreaterThanOrEqual(0.9);
    }, 60000);

    test('SEO score should be > 90', async () => {
      const result = await runLighthouse(BASE_URL);
      
      expect(result?.lhr.categories.seo.score).toBeGreaterThanOrEqual(0.9);
    }, 60000);
  });

  describe('Performance Optimizations', () => {
    test('Should use text compression', async () => {
      const result = await runLighthouse(BASE_URL);
      const audit = result?.lhr.audits['uses-text-compression'];
      
      expect(audit?.score).toBeGreaterThanOrEqual(0.9);
    }, 60000);

    test('Should use responsive images', async () => {
      const result = await runLighthouse(BASE_URL);
      const audit = result?.lhr.audits['uses-responsive-images'];
      
      expect(audit?.score).toBeGreaterThanOrEqual(0.9);
    }, 60000);

    test('Should use modern image formats', async () => {
      const result = await runLighthouse(BASE_URL);
      const audit = result?.lhr.audits['modern-image-formats'];
      
      // This may fail if no images are present, so we check if applicable
      if (audit?.score !== null) {
        expect(audit?.score).toBeGreaterThanOrEqual(0.8);
      }
    }, 60000);

    test('Should minimize unused JavaScript', async () => {
      const result = await runLighthouse(BASE_URL);
      const audit = result?.lhr.audits['unused-javascript'];
      
      if (audit?.details && typeof audit.details === 'object' && 'overallSavingsMs' in audit.details) {
        const savings = (audit.details as any).overallSavingsMs || 0;
        expect(savings).toBeLessThan(2000); // Less than 2s savings needed
      }
    }, 60000);

    test('Should minimize unused CSS', async () => {
      const result = await runLighthouse(BASE_URL);
      const audit = result?.lhr.audits['unused-css-rules'];
      
      if (audit?.details && typeof audit.details === 'object' && 'overallSavingsMs' in audit.details) {
        const savings = (audit.details as any).overallSavingsMs || 0;
        expect(savings).toBeLessThan(1000); // Less than 1s savings needed
      }
    }, 60000);
  });

  describe('Network & Rendering', () => {
    test('Should have proper viewport configuration', async () => {
      const result = await runLighthouse(BASE_URL);
      const audit = result?.lhr.audits['viewport'];
      
      expect(audit?.score).toBe(1);
    }, 60000);

    test('Should minimize redirects', async () => {
      const result = await runLighthouse(BASE_URL);
      const audit = result?.lhr.audits['redirects'];
      
      expect(audit?.score).toBeGreaterThanOrEqual(0.9);
    }, 60000);

    test('DOM size should be reasonable', async () => {
      const result = await runLighthouse(BASE_URL);
      const audit = result?.lhr.audits['dom-size'];
      
      if (audit?.numericValue) {
        expect(audit.numericValue).toBeLessThan(1500);
      }
    }, 60000);

    test('Should have efficient font display', async () => {
      const result = await runLighthouse(BASE_URL);
      const audit = result?.lhr.audits['font-display'];
      
      // Only check if fonts are present
      if (audit?.score !== null) {
        expect(audit?.score).toBeGreaterThanOrEqual(0.9);
      }
    }, 60000);
  });

  describe('Mobile Performance', () => {
    test('Homepage should meet mobile performance score > 85', async () => {
      const port = new URL(page.url() || BASE_URL).port || '9222';
      
      const result = await lighthouse(BASE_URL, {
        port: parseInt(port),
        output: 'json',
        onlyCategories: ['performance'],
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false,
        },
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
      });
      
      expect(result?.lhr.categories.performance.score).toBeGreaterThanOrEqual(0.85);
    }, 60000);
  });
});
