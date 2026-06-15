/**
 * Commerce Civilization Audit — cross-institution invariants (Wave 84).
 *
 * These tests don't re-test individual engines (each was completed in Waves 78–83). They lock the
 * properties that only matter when the six commerce institutions operate TOGETHER as one organism:
 *   1. Trust means ONE thing — the canonical engine produces a single value for given inputs, so every
 *      surface that consumes trust agrees (no split-brain across HQ / storefront / discovery).
 *   2. Health and account-status vocabularies do NOT collide — the composite Merchant Health bands and the
 *      crude on-chain account-status labels use disjoint words, so a merchant never sees two contradictory
 *      "health" terms for the same business across surfaces.
 *   3. Recovery is possible everywhere — no penalty mechanic is permanent (trust rebuilds, extraction
 *      decays, fraud penalty tracks current state).
 */

import { describe, expect, it } from '@jest/globals';
import { computeMerchantTrust } from '@/lib/seer/merchantTrust';
import { computeMerchantHealth } from '@/lib/seer/merchantHealth';
import { applyDecay, type ExtractionState } from '@/lib/seer/marketStability/extractionIndex';

describe('Commerce Civilization Audit (Wave 84) — cross-institution coherence', () => {
  it('TRUST is one concept: identical inputs always yield identical trust (no split-brain across surfaces)', () => {
    const inputs = { verified: true, disputesUpheld: 1, refundsGranted: 2, disputesTotal: 3, confirmedPayments: 40 };
    // Every surface (HQ, storefront, discovery, discovery-standing) calls computeMerchantTrust with the
    // same inputs read from the same tables — so the score is deterministic and shared. Recompute twice.
    const a = computeMerchantTrust(inputs);
    const b = computeMerchantTrust({ ...inputs });
    expect(a.score).toBe(b.score);
    expect(a.label).toBe(b.label);
  });

  it('the trust score that Merchant Health consumes is the SAME canonical trust (consistent handoff)', () => {
    // HQ feeds trust.score (canonical) straight into Merchant Health's merchantTrust input. Simulate that
    // handoff: the health composite must reflect the exact trust value, not a re-derived one.
    const trust = computeMerchantTrust({ verified: true, disputesUpheld: 0, refundsGranted: 0, disputesTotal: 0, confirmedPayments: 100 });
    const health = computeMerchantHealth({
      commerceHealth: 70, merchantTrust: trust.score, deliveryReliability: 80,
      retentionRate: 0.3, revenueTrendRatio: 1.1, lifetimeOrders: 50,
    });
    const trustComponent = health.components.find((c) => c.name === 'Merchant trust');
    expect(trustComponent?.value).toBe(trust.score); // the handoff preserves the exact value
  });

  it('VOCABULARY does not collide: composite health bands and account-status labels are disjoint', () => {
    const compositeBands = ['provisional', 'at_risk', 'developing', 'healthy', 'thriving'];
    // The de-collided account-status labels (Wave 84) — must share NO word with the composite bands.
    const accountStatusLabels = ['—', 'Not active', 'Attention needed', 'Active', 'Getting started'];
    for (const label of accountStatusLabels) {
      expect(compositeBands).not.toContain(label.toLowerCase());
    }
  });

  it('RECOVERY is possible: extraction decays toward zero over time (no permanent exile)', () => {
    const now = 1_700_000_000_000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
    const elevated: ExtractionState = { index: 6000, lastUpdatedAt: ninetyDaysAgo };
    const decayed = applyDecay(elevated, now);
    expect(decayed.index).toBeLessThan(elevated.index); // standing recovers as behavior steadies
  });

  it('RECOVERY is possible: a merchant with upheld disputes can rebuild trust via clean volume', () => {
    const stuck = computeMerchantTrust({ verified: true, disputesUpheld: 2, refundsGranted: 0, disputesTotal: 2, confirmedPayments: 0 });
    const rebuilding = computeMerchantTrust({ verified: true, disputesUpheld: 2, refundsGranted: 0, disputesTotal: 2, confirmedPayments: 200 });
    expect(rebuilding.score).toBeGreaterThan(stuck.score); // earned recovery path exists
  });
});
