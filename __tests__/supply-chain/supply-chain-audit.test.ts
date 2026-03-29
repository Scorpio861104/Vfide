/**
 * C15 – Supply Chain and Dependency Risk
 *
 * R-072: Semver range drift causes runtime changes
 * R-074: Unreviewed postinstall script behaviors
 * R-075: Artifact patch drift under manual edits
 *
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf-8');
}

describe('C15 – Supply Chain and Dependency Risk', () => {
  const packageJsonRaw = read('package.json');
  const packageJson = JSON.parse(packageJsonRaw) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
  };

  const securityWorkflowSrc = read('.github/workflows/security.yml');
  const supplyChainScriptSrc = read('scripts/verify-supply-chain-controls.ts');
  const patchPolicySrc = read('patches/patch-policy.json');

  describe('R-072 – Semver drift controls', () => {
    it('critical runtime dependencies are pinned to exact versions', () => {
      const deps = packageJson.dependencies ?? {};
      const critical = [
        'next',
        'react',
        'react-dom',
        'wagmi',
        'viem',
        '@tanstack/react-query',
        '@rainbow-me/rainbowkit',
        '@sentry/nextjs',
        'web-vitals',
        'pg',
        'jsonwebtoken',
      ];

      for (const name of critical) {
        const version = deps[name];
        expect(version).toBeDefined();
        expect(version).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
      }
    });

    it('supply-chain script enforces exact version policy for critical runtime packages', () => {
      expect(supplyChainScriptSrc).toMatch(/CRITICAL_RUNTIME_PACKAGES/);
      expect(supplyChainScriptSrc).toMatch(/Critical runtime package is not pinned exactly/);
      expect(supplyChainScriptSrc).toMatch(/isExactVersion\(/);
    });
  });

  describe('R-074 – Lifecycle script safety', () => {
    it('postinstall remains restricted to environment validation flow', () => {
      const postinstall = packageJson.scripts?.postinstall ?? '';
      expect(postinstall).toContain('npm run validate:env');
    });

    it('supply-chain script scans lifecycle scripts for dangerous patterns', () => {
      expect(supplyChainScriptSrc).toMatch(/LIFECYCLE_SCRIPT_KEYS/);
      expect(supplyChainScriptSrc).toMatch(/DANGEROUS_LIFECYCLE_PATTERNS/);
      expect(supplyChainScriptSrc).toMatch(/Lifecycle script .* contains restricted pattern/);
    });
  });

  describe('R-075 – Patch drift verification', () => {
    it('supply-chain script validates patch apply checks', () => {
      expect(supplyChainScriptSrc).toMatch(/checkPatchFreshness/);
      expect(supplyChainScriptSrc).toMatch(/git', \['apply', '--check'/);
      expect(supplyChainScriptSrc).toMatch(/Patch apply check failed/);
    });

    it('security workflow runs supply-chain control verification', () => {
      expect(securityWorkflowSrc).toMatch(/Verify supply-chain controls/);
      expect(securityWorkflowSrc).toMatch(/npm run -s security:supply-chain/);
    });

    it('patch policy manifest explicitly classifies patch lifecycle mode', () => {
      const policy = JSON.parse(patchPolicySrc) as {
        version: number;
        patches: Record<string, { mode: 'active' | 'archived' }>;
      };

      expect(policy.version).toBe(1);
      expect(Object.keys(policy.patches).length).toBeGreaterThan(0);
      expect(supplyChainScriptSrc).toMatch(/patch-policy\.json/);
      expect(supplyChainScriptSrc).toMatch(/Patch policy missing entry/);
    });
  });
});
