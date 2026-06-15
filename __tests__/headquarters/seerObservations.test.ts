/**
 * Seer Observations — deterministic + honesty tests (Platform Transformation, Wave 3).
 *
 * Asserts the Seer never fabricates: warnings fire only on genuine gaps, recommendations point only to live actions,
 * the layer is fully deterministic, and observations are ordered by severity.
 */
import { describe, it, expect } from '@jest/globals';
import {
  deriveObservations, observationsForDomain, type SeerInputs, type ContinuityReadiness,
} from '@/lib/seer/headquartersObservations';

const base: SeerInputs = { isConnected: true, proofScore: 6000, continuityReadiness: 'protected', merchantActive: false, configured: [] };
const READINESS: ContinuityReadiness[] = ['protected', 'partial', 'incomplete', 'unknown'];
// the only routes the Seer is allowed to send a participant to (all live, usable)
const LIVE_ACTION_HREFS = new Set(['/continuity', '/proofscore', '/merchant/analytics']);

describe('Seer: connection gating', () => {
  it('CONN-01 not connected → only a single teaching "connect" observation', () => {
    const o = deriveObservations({ ...base, isConnected: false });
    expect(o).toHaveLength(1);
    expect(o[0]!.id).toBe('connect');
    expect(o[0]!.kind).toBe('teach');
  });
});

describe('Seer: honest warnings (no fabrication)', () => {
  it('WARN-01 the protection-gap concern fires ONLY when readiness is incomplete', () => {
    for (const r of READINESS) {
      const hasGap = deriveObservations({ ...base, continuityReadiness: r }).some((o) => o.id === 'own-gap');
      expect(hasGap).toBe(r === 'incomplete');
    }
  });
  it('WARN-02 a "protected" participant never receives a concern-severity ownership observation', () => {
    const o = deriveObservations({ ...base, continuityReadiness: 'protected' });
    expect(o.filter((x) => x.domain === 'ownership' && x.severity === 'concern')).toHaveLength(0);
  });
  it('WARN-03 readiness "partial" yields a watch-level recommendation, not a concern', () => {
    const o = deriveObservations({ ...base, continuityReadiness: 'partial' });
    const own = o.find((x) => x.id === 'own-partial');
    expect(own?.severity).toBe('watch');
    expect(o.some((x) => x.severity === 'concern')).toBe(false);
  });
});

describe('Seer: recommendations point only to live actions', () => {
  it('REC-01 every action href across all states is a known live route', () => {
    for (const r of READINESS) {
      for (const score of [null, 1000, 6000, 9000]) {
        for (const merchantActive of [false, true]) {
          const o = deriveObservations({ ...base, continuityReadiness: r, proofScore: score, merchantActive });
          for (const x of o) if (x.action) expect(LIVE_ACTION_HREFS.has(x.action.href)).toBe(true);
        }
      }
    }
  });
});

describe('Seer: ProofScore bands', () => {
  it('PS-01 null score → a teaching observation', () => {
    expect(deriveObservations({ ...base, proofScore: null }).some((o) => o.id === 'trust-teach')).toBe(true);
  });
  it('PS-02 low score → build-trust recommendation', () => {
    expect(deriveObservations({ ...base, proofScore: 2000 }).some((o) => o.id === 'trust-build')).toBe(true);
  });
  it('PS-03 high score → strong-standing explain + fee connect', () => {
    const o = deriveObservations({ ...base, proofScore: 8500 });
    expect(o.some((x) => x.id === 'trust-strong')).toBe(true);
    expect(o.some((x) => x.id === 'trust-fee-connect' && x.kind === 'connect')).toBe(true);
  });
  it('PS-04 mid score → solid explain (no build/strong)', () => {
    const o = deriveObservations({ ...base, proofScore: 6000 });
    expect(o.some((x) => x.id === 'trust-solid')).toBe(true);
    expect(o.some((x) => x.id === 'trust-build' || x.id === 'trust-strong')).toBe(false);
  });
});

describe('Seer: determinism & ordering', () => {
  it('DET-01 same inputs → identical observations', () => {
    expect(deriveObservations(base)).toEqual(deriveObservations(base));
  });
  it('DET-02 observations are sorted by severity (concern first)', () => {
    const o = deriveObservations({ ...base, continuityReadiness: 'incomplete', proofScore: 2000 });
    for (let i = 1; i < o.length; i++) expect(o[i - 1]!.priority).toBeGreaterThanOrEqual(o[i]!.priority);
  });
  it('DET-03 a merchant gets a business opportunity observation', () => {
    expect(deriveObservations({ ...base, merchantActive: true }).some((o) => o.domain === 'business' && o.kind === 'opportunity')).toBe(true);
  });
});

describe('Seer: domain scoping', () => {
  it('SCOPE-01 domain view includes that domain + cross, excludes other domains', () => {
    const o = observationsForDomain({ ...base, continuityReadiness: 'incomplete' }, 'ownership');
    expect(o.every((x) => x.domain === 'ownership' || x.domain === 'cross')).toBe(true);
    expect(o.some((x) => x.domain === 'ownership')).toBe(true);
  });
  it('SCOPE-02 the always-on guardian teaching is cross-cutting (appears in any domain view)', () => {
    expect(observationsForDomain(base, 'trust').some((x) => x.id === 'guardian-teach')).toBe(true);
    expect(observationsForDomain(base, 'business').some((x) => x.id === 'guardian-teach')).toBe(true);
  });
});
