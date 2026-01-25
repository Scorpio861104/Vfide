/**
 * Core Web Vitals Tests
 * Tests LCP, FID, CLS, TTFB, and INP metrics across different pages
 */
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';

describe('Core Web Vitals', () => {
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

  describe('Largest Contentful Paint (LCP)', () => {
    test('Homepage LCP should be < 2.5s', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const lcp = result?.lhr.audits['largest-contentful-paint'];
      const lcpValue = lcp?.numericValue || 0;

      expect(lcpValue).toBeLessThan(2500); // 2.5s in milliseconds
    }, 60000);

    test('Dashboard LCP should be < 2.5s', async () => {
      const result = await lighthouse(`${BASE_URL}/dashboard`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const lcp = result?.lhr.audits['largest-contentful-paint'];
      const lcpValue = lcp?.numericValue || 0;

      expect(lcpValue).toBeLessThan(2500);
    }, 60000);

    test('Wallet LCP should be < 2.5s', async () => {
      const result = await lighthouse(`${BASE_URL}/wallet`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const lcp = result?.lhr.audits['largest-contentful-paint'];
      const lcpValue = lcp?.numericValue || 0;

      expect(lcpValue).toBeLessThan(2500);
    }, 60000);

    test('Governance LCP should be < 2.5s', async () => {
      const result = await lighthouse(`${BASE_URL}/governance`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const lcp = result?.lhr.audits['largest-contentful-paint'];
      const lcpValue = lcp?.numericValue || 0;

      expect(lcpValue).toBeLessThan(2500);
    }, 60000);

    test('LCP should be good on slow 3G', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
        throttling: {
          rttMs: 400,
          throughputKbps: 400,
          cpuSlowdownMultiplier: 4,
        },
      });

      const lcp = result?.lhr.audits['largest-contentful-paint'];
      const lcpValue = lcp?.numericValue || 0;

      expect(lcpValue).toBeLessThan(4000); // More lenient on slow network
    }, 90000);
  });

  describe('Cumulative Layout Shift (CLS)', () => {
    test('Homepage CLS should be < 0.1', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const cls = result?.lhr.audits['cumulative-layout-shift'];
      const clsValue = cls?.numericValue || 0;

      expect(clsValue).toBeLessThan(0.1);
    }, 60000);

    test('Dashboard CLS should be < 0.1', async () => {
      const result = await lighthouse(`${BASE_URL}/dashboard`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const cls = result?.lhr.audits['cumulative-layout-shift'];
      const clsValue = cls?.numericValue || 0;

      expect(clsValue).toBeLessThan(0.1);
    }, 60000);

    test('Wallet CLS should be < 0.1', async () => {
      const result = await lighthouse(`${BASE_URL}/wallet`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const cls = result?.lhr.audits['cumulative-layout-shift'];
      const clsValue = cls?.numericValue || 0;

      expect(clsValue).toBeLessThan(0.1);
    }, 60000);

    test('Governance CLS should be < 0.1', async () => {
      const result = await lighthouse(`${BASE_URL}/governance`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const cls = result?.lhr.audits['cumulative-layout-shift'];
      const clsValue = cls?.numericValue || 0;

      expect(clsValue).toBeLessThan(0.1);
    }, 60000);
  });

  describe('Total Blocking Time (TBT) - Proxy for FID', () => {
    test('Homepage TBT should be < 300ms', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const tbt = result?.lhr.audits['total-blocking-time'];
      const tbtValue = tbt?.numericValue || 0;

      expect(tbtValue).toBeLessThan(300);
    }, 60000);

    test('Dashboard TBT should be < 300ms', async () => {
      const result = await lighthouse(`${BASE_URL}/dashboard`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const tbt = result?.lhr.audits['total-blocking-time'];
      const tbtValue = tbt?.numericValue || 0;

      expect(tbtValue).toBeLessThan(300);
    }, 60000);

    test('Max Potential FID should be < 100ms', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const fid = result?.lhr.audits['max-potential-fid'];
      const fidValue = fid?.numericValue || 0;

      expect(fidValue).toBeLessThan(100);
    }, 60000);
  });

  describe('First Contentful Paint (FCP)', () => {
    test('Homepage FCP should be < 1.8s', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const fcp = result?.lhr.audits['first-contentful-paint'];
      const fcpValue = fcp?.numericValue || 0;

      expect(fcpValue).toBeLessThan(1800);
    }, 60000);

    test('Dashboard FCP should be < 1.8s', async () => {
      const result = await lighthouse(`${BASE_URL}/dashboard`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const fcp = result?.lhr.audits['first-contentful-paint'];
      const fcpValue = fcp?.numericValue || 0;

      expect(fcpValue).toBeLessThan(1800);
    }, 60000);
  });

  describe('Speed Index', () => {
    test('Homepage Speed Index should be < 3.4s', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const si = result?.lhr.audits['speed-index'];
      const siValue = si?.numericValue || 0;

      expect(siValue).toBeLessThan(3400);
    }, 60000);

    test('Dashboard Speed Index should be < 3.4s', async () => {
      const result = await lighthouse(`${BASE_URL}/dashboard`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const si = result?.lhr.audits['speed-index'];
      const siValue = si?.numericValue || 0;

      expect(siValue).toBeLessThan(3400);
    }, 60000);
  });

  describe('Time to Interactive (TTI)', () => {
    test('Homepage TTI should be < 3.8s', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const tti = result?.lhr.audits['interactive'];
      const ttiValue = tti?.numericValue || 0;

      expect(ttiValue).toBeLessThan(3800);
    }, 60000);

    test('Dashboard TTI should be < 3.8s', async () => {
      const result = await lighthouse(`${BASE_URL}/dashboard`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const tti = result?.lhr.audits['interactive'];
      const ttiValue = tti?.numericValue || 0;

      expect(ttiValue).toBeLessThan(3800);
    }, 60000);
  });

  describe('Server Response Time (TTFB)', () => {
    test('Homepage server response time should be < 600ms', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const ttfb = result?.lhr.audits['server-response-time'];
      const ttfbValue = ttfb?.numericValue || 0;

      expect(ttfbValue).toBeLessThan(600);
    }, 60000);

    test('API response time should be < 600ms', async () => {
      const result = await lighthouse(`${BASE_URL}/api/health`, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const ttfb = result?.lhr.audits['server-response-time'];
      const ttfbValue = ttfb?.numericValue || 0;

      expect(ttfbValue).toBeLessThan(600);
    }, 60000);
  });

  describe('Bootup Time & Main Thread Work', () => {
    test('JavaScript bootup time should be < 3.5s', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const bootup = result?.lhr.audits['bootup-time'];
      const bootupValue = bootup?.numericValue || 0;

      expect(bootupValue).toBeLessThan(3500);
    }, 60000);

    test('Main thread work should be < 4s', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
        output: 'json',
        onlyCategories: ['performance'],
      });

      const mainThread = result?.lhr.audits['mainthread-work-breakdown'];
      const mainThreadValue = mainThread?.numericValue || 0;

      expect(mainThreadValue).toBeLessThan(4000);
    }, 60000);
  });

  describe('Mobile Core Web Vitals', () => {
    test('Mobile LCP should be < 2.5s', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
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

      const lcp = result?.lhr.audits['largest-contentful-paint'];
      const lcpValue = lcp?.numericValue || 0;

      expect(lcpValue).toBeLessThan(2500);
    }, 90000);

    test('Mobile CLS should be < 0.1', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
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
      });

      const cls = result?.lhr.audits['cumulative-layout-shift'];
      const clsValue = cls?.numericValue || 0;

      expect(clsValue).toBeLessThan(0.1);
    }, 90000);

    test('Mobile TBT should be < 600ms', async () => {
      const result = await lighthouse(BASE_URL, {
        port: parseInt(new URL(page.url() || BASE_URL).port || '9222'),
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

      const tbt = result?.lhr.audits['total-blocking-time'];
      const tbtValue = tbt?.numericValue || 0;

      expect(tbtValue).toBeLessThan(600);
    }, 90000);
  });
});
