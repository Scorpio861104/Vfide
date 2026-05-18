/**
 * C14 – Performance and Scalability
 *
 * R-066: Load-test coverage gaps for hot APIs
 * R-069: Rate limiter saturation behavior unknown
 * R-070: No budget enforcement in CI for perf regressions
 *
 * @jest-environment node
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '../..');

function read(path: string): string {
  return readFileSync(join(ROOT, path), 'utf-8');
}

const loadScriptSrc = read('test/performance/load.test.js');
const matrixRaw = read('test/performance/endpoint-load-matrix.json');
const releaseGateWorkflowSrc = read('.github/workflows/release-gate.yml');
const lighthouseConfigSrc = read('lighthouserc.json');
const packageJsonSrc = read('package.json');
const performanceLibSrc = read('lib/performance.ts');
const performanceProviderSrc = read('components/performance/PerformanceProvider.tsx');
const cachePolicySrc = read('lib/cache/cacheInvalidationPolicy.ts');
const ensHookSrc = read('hooks/useENS.ts');
const priceHookSrc = read('hooks/usePriceHooks.ts');
const web3ProviderSrc = read('components/wallet/Web3Provider.tsx');

describe('C14 – Performance and Scalability', () => {
  describe('R-066 – Load-test coverage for hot APIs', () => {
    it('defines endpoint load matrix with sustained and spike scenarios', () => {
      const matrix = JSON.parse(matrixRaw) as {
        endpoints: Array<{ id: string; path: string; criticality: string }>;
        scenarios: Record<string, unknown>;
      };

      expect(Array.isArray(matrix.endpoints)).toBe(true);
      expect(matrix.endpoints.length).toBeGreaterThanOrEqual(5);
      expect(matrix.scenarios.sustained).toBeDefined();
      expect(matrix.scenarios.spike).toBeDefined();

      const endpointIds = new Set(matrix.endpoints.map((endpoint) => endpoint.id));
      expect(endpointIds.has('health')).toBe(true);
      expect(endpointIds.has('governanceProposals')).toBe(true);
      expect(endpointIds.has('merchantList')).toBe(true);
      expect(endpointIds.has('seerAnalytics')).toBe(true);
    });

    it('k6 load script imports and uses endpoint load matrix', () => {
      expect(loadScriptSrc).toMatch(/import endpointLoadMatrix from "\.\/endpoint-load-matrix\.json"/);
      expect(loadScriptSrc).toMatch(/endpointLoadMatrix\.endpoints/);
      expect(loadScriptSrc).toMatch(/endpointLoadMatrix\.scenarios\.sustained/);
      expect(loadScriptSrc).toMatch(/endpointLoadMatrix\.scenarios\.spike/);
      expect(loadScriptSrc).toMatch(/Matrix-defined hot endpoints/);
    });
  });

  describe('R-069 – Rate limiter saturation behavior', () => {
    it('includes explicit rate limiter saturation scenario in matrix and k6 options', () => {
      const matrix = JSON.parse(matrixRaw) as {
        scenarios: Record<string, unknown>;
      };

      expect(matrix.scenarios.rateLimiterSaturation).toBeDefined();
      expect(loadScriptSrc).toMatch(/rateLimiterSaturation:/);
      expect(loadScriptSrc).toMatch(/endpointLoadMatrix\.scenarios\.rateLimiterSaturation/);
    });

    it('tracks graceful degradation hits under throttling statuses', () => {
      expect(loadScriptSrc).toMatch(/gracefulDegradationHits/);
      expect(loadScriptSrc).toMatch(/const rateLimitedStatuses = new Set\(\[429, 503\]\)/);
      expect(loadScriptSrc).toMatch(/graceful_degradation_hits/);
    });
  });

  describe('R-070 – CI perf budget enforcement', () => {
    it('release gate workflow executes performance budget lane', () => {
      expect(releaseGateWorkflowSrc).toMatch(/name: Performance budget gate/);
      expect(releaseGateWorkflowSrc).toMatch(/npm run -s test:performance/);
    });

    it('performance script and lighthouse budgets are wired', () => {
      expect(packageJsonSrc).toMatch(/"test:performance"\s*:\s*"npm run build && npx @lhci\/cli autorun"/);
      expect(lighthouseConfigSrc).toMatch(/"budgetsFile"\s*:\s*"lighthouse-budget\.json"/);
    });
  });

  describe('R-067 – Low-end long-task observability', () => {
    it('performance lib derives a device performance profile and tier', () => {
      expect(performanceLibSrc).toMatch(/export type DevicePerformanceTier = 'low' \| 'standard' \| 'high'/);
      expect(performanceLibSrc).toMatch(/export interface DevicePerformanceProfile/);
      expect(performanceLibSrc).toMatch(/export function getDevicePerformanceProfile\(/);
      expect(performanceLibSrc).toMatch(/tier = 'low'/);
    });

    it('long-task observer supports threshold and profile-aware metric tagging', () => {
      expect(performanceLibSrc).toMatch(/options\?: \{\s*thresholdMs\?: number;\s*profile\?: DevicePerformanceProfile;/s);
      expect(performanceLibSrc).toMatch(/const thresholdMs = options\?\.thresholdMs \?\? 50/);
      expect(performanceLibSrc).toMatch(/trackMetric\(`long-task-\$\{profile\.tier\}`/);
    });

    it('performance provider applies stricter threshold for low-end tier', () => {
      expect(performanceProviderSrc).toMatch(/const profile = getDevicePerformanceProfile\(\)/);
      expect(performanceProviderSrc).toMatch(/const thresholdMs = profile\.tier === 'low' \? 40 : 50/);
      expect(performanceProviderSrc).toMatch(/trackMetric\('low-end-device-session', 1\)/);
    });
  });

  describe('R-068 – Cache invalidation consistency', () => {
    it('defines centralized cache invalidation policy matrix', () => {
      expect(cachePolicySrc).toMatch(/type CacheId =/);
      expect(cachePolicySrc).toMatch(/const CACHE_INVALIDATION_POLICIES/);
      expect(cachePolicySrc).toMatch(/reactQuery:vfide-price/);
      expect(cachePolicySrc).toMatch(/reactQuery:ens/);
      expect(cachePolicySrc).toMatch(/reactQuery:wallet-state/);
      expect(cachePolicySrc).toMatch(/export function getCachePolicy\(/);
    });

    it('price/ens/wallet query caches consume central policy values', () => {
      expect(priceHookSrc).toMatch(/getCachePolicy\('reactQuery:vfide-price'\)/);
      expect(priceHookSrc).toMatch(/queryKey: vfidePriceCachePolicy\.queryKey/);
      expect(priceHookSrc).toMatch(/staleTime: vfidePriceCachePolicy\.ttlMs/);
      expect(priceHookSrc).toMatch(/gcTime: vfidePriceCachePolicy\.gcMs/);

      expect(ensHookSrc).toMatch(/getCachePolicy\('reactQuery:ens'\)/);
      expect(ensHookSrc).toMatch(/staleTime: ensCachePolicy\.ttlMs/);

      expect(web3ProviderSrc).toMatch(/getCachePolicy\('reactQuery:wallet-state'\)/);
      expect(web3ProviderSrc).toMatch(/staleTime: walletStateCachePolicy\.ttlMs/);
    });
  });
});
