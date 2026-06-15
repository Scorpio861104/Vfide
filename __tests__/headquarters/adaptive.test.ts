/**
 * Adaptive Engine — universal-discoverability invariant tests (Platform Transformation, Wave 1).
 *
 * The spec's hard rule: VFIDE may adapt emphasis/priority/ordering but may NEVER hide a capability, remove
 * discoverability, or create secret functionality. These tests assert that invariant across signal combinations.
 */
import { describe, it, expect } from '@jest/globals';
import {
  computeEmphasis, searchCapabilities, everyCapabilityPresent, NEUTRAL_SIGNALS,
  type ParticipantSignals, type Stage,
} from '@/lib/headquarters/adaptive';
import { allCapabilities, HQ_ORDER, type DomainId } from '@/lib/headquarters/model';

const STAGES: Stage[] = ['none', 'starting', 'active', 'established'];
const CATALOG_SIZE = allCapabilities().length;

// build a spread of signal combinations
const signalMatrix: ParticipantSignals[] = [];
for (const goals of [[], ['ownership'], ['business', 'trust'], HQ_ORDER] as DomainId[][]) {
  for (const lifeStage of STAGES) {
    signalMatrix.push({ ...NEUTRAL_SIGNALS, goals, lifeStage, businessStage: lifeStage, preparednessStage: lifeStage, trustMaturity: lifeStage });
  }
}

describe('Adaptive: universal discoverability invariant', () => {
  it('INV-01 neutral signals surface every capability exactly once', () => {
    expect(everyCapabilityPresent(NEUTRAL_SIGNALS)).toBe(true);
    expect(computeEmphasis(NEUTRAL_SIGNALS)).toHaveLength(CATALOG_SIZE);
  });
  signalMatrix.forEach((s, i) => {
    it(`INV-matrix-${i} every capability present for signal set ${i}`, () => {
      expect(everyCapabilityPresent(s)).toBe(true);
      const r = computeEmphasis(s);
      expect(r).toHaveLength(CATALOG_SIZE);
      expect(new Set(r.map((e) => e.capability.id)).size).toBe(CATALOG_SIZE);
    });
  });
  it('INV-02 configured + recently-used signals still drop nothing', () => {
    const s: ParticipantSignals = { ...NEUTRAL_SIGNALS, configured: allCapabilities().map((c) => c.id), recentlyUsed: ['vaults', 'proofscore'] };
    expect(everyCapabilityPresent(s)).toBe(true);
  });
});

describe('Adaptive: search never degrades', () => {
  it('SRCH-01 empty query returns the whole catalog', () => expect(searchCapabilities('')).toHaveLength(CATALOG_SIZE));
  it('SRCH-02 every capability is findable by its own label', () => {
    for (const c of allCapabilities()) {
      const hit = searchCapabilities(c.label).some((r) => r.id === c.id);
      expect(hit).toBe(true);
    }
  });
  it('SRCH-03 every capability is findable by at least one keyword', () => {
    for (const c of allCapabilities()) {
      const hit = searchCapabilities(c.keywords[0]!).some((r) => r.id === c.id);
      expect(hit).toBe(true);
    }
  });
  it('SRCH-04 a de-emphasized capability is still searchable (vaults found even when fully configured)', () => {
    expect(searchCapabilities('vault').some((c) => c.id === 'vaults')).toBe(true);
  });
});

describe('Adaptive: honest emphasis', () => {
  it('HON-01 a "coming" capability is never surfaced as a primary action', () => {
    for (const s of signalMatrix) {
      const r = computeEmphasis(s);
      const comingPrimary = r.filter((e) => e.capability.status === 'coming' && e.emphasis === 'primary');
      expect(comingPrimary).toHaveLength(0);
    }
  });
  it('HON-02 emphasis is deterministic (same signals → same result)', () => {
    expect(computeEmphasis(NEUTRAL_SIGNALS)).toEqual(computeEmphasis(NEUTRAL_SIGNALS));
  });
  it('HON-03 declaring a goal raises (never lowers) its domain emphasis', () => {
    const base = computeEmphasis(NEUTRAL_SIGNALS);
    const withGoal = computeEmphasis({ ...NEUTRAL_SIGNALS, goals: ['business'] });
    const score = (r: typeof base, id: string) => r.find((e) => e.capability.id === id)!.score;
    expect(score(withGoal, 'products')).toBeGreaterThan(score(base, 'products'));
  });
});
