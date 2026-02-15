/**
 * Tests for paymaster honest stats and frontend claim fixes
 * Validates: no fake data, accurate frontend claims
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Paymaster - Honest Stats Fix', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(process.cwd(), 'lib/paymaster/paymasterService.ts'),
      'utf-8'
    );
  });

  it('should not contain fake daily limit values', () => {
    // The old code had: BigInt(0.1 * 1e18) as a fake daily limit
    expect(source).not.toContain('0.1 * 1e18');
  });

  it('should check for API key before returning stats', () => {
    expect(source).toContain('!this.config.apiKey');
  });

  it('should return zeroed values when unconfigured', () => {
    expect(source).toContain('BigInt(0)');
    expect(source).toContain('transactionsSponsored: 0');
  });
});

describe('Frontend Claims - Accuracy Fixes', () => {
  describe('Token Launch Page', () => {
    let source: string;

    beforeAll(() => {
      source = fs.readFileSync(
        path.join(process.cwd(), 'app/token-launch/page.tsx'),
        'utf-8'
      );
    });

    it('should NOT claim third-party audit is completed', () => {
      expect(source).not.toContain('Third-party audit completed');
      expect(source).not.toContain('audit completed');
    });

    it('should NOT claim non-upgradeable core logic', () => {
      expect(source).not.toContain('Non-upgradeable core logic');
      expect(source).not.toContain('Non-upgradeable');
    });

    it('should accurately state audit is pending', () => {
      expect(source).toContain('Audit pending pre-launch');
    });

    it('should accurately state timelocked admin functions', () => {
      expect(source).toContain('Timelocked admin functions');
    });
  });

  describe('About Page', () => {
    let source: string;

    beforeAll(() => {
      source = fs.readFileSync(
        path.join(process.cwd(), 'app/about/page.tsx'),
        'utf-8'
      );
    });

    it('should NOT claim professionally audited', () => {
      expect(source).not.toContain('professionally audited');
    });

    it('should mention security-focused development', () => {
      expect(source).toContain('Security-focused development practices');
    });
  });
});

describe('Rewards Page - Compliance Mode UI', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(process.cwd(), 'app/rewards/page.tsx'),
      'utf-8'
    );
  });

  it('should NOT reference Howey Safe Mode in UI', () => {
    expect(source).not.toContain('Howey Safe Mode');
    expect(source).not.toContain('howeySafeMode');
    expect(source).not.toContain('promoHoweySafe');
  });

  it('should use complianceMode in contract reads', () => {
    expect(source).toContain("functionName: 'complianceMode'");
  });

  it('should display compliance mode status accurately', () => {
    expect(source).toContain('Compliance mode enabled');
    expect(source).toContain('compliance mode is enabled');
  });
});

describe('Council Page - Compliance Mode UI', () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(
      path.join(process.cwd(), 'app/council/page.tsx'),
      'utf-8'
    );
  });

  it('should NOT reference Howey Safe Mode', () => {
    expect(source).not.toContain('Howey Safe Mode');
    expect(source).not.toContain('howeySafeMode');
  });

  it('should use Compliance Mode text', () => {
    expect(source).toContain('Compliance Mode');
    expect(source).toContain('complianceMode');
  });
});
