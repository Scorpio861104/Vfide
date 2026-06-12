import { describe, expect, it } from '@jest/globals';
import {
  scoreMerchantDiscovery,
  rankByRelevanceThenMerit,
  type MerchantDiscoverySignals,
  type DiscoveryScore,
} from '@/lib/seer/discovery';
import { buildTransparencyPanel, type TransparencyInputs } from '@/lib/seer/merchantTransparency';

const base: MerchantDiscoverySignals = {
  relevance: 1,
  merchantTrust: 50,
  deliveryReliability: 80,
  commerceHealth: 70,
  builderScore: 5000,
  fraudRisk: 0,
  ageDays: 365,
  verified: true,
};

describe('Discovery engine — VFIDE-aligned ranking properties', () => {
  it('RELEVANCE dominates: a more-relevant modest merchant outranks a less-relevant elite one', () => {
    const relevantModest = scoreMerchantDiscovery({ ...base, relevance: 0.9, merchantTrust: 40, builderScore: 1000 });
    const irrelevantElite = scoreMerchantDiscovery({ ...base, relevance: 0.2, merchantTrust: 100, builderScore: 10000 });
    const ranked = rankByRelevanceThenMerit([
      { id: 'elite', discovery: irrelevantElite },
      { id: 'modest', discovery: relevantModest },
    ]);
    expect(ranked[0]?.id).toBe('modest');
  });

  it('there is NO wealth/holdings input — the signal type cannot express it', () => {
    const a = scoreMerchantDiscovery(base);
    const b = scoreMerchantDiscovery({ ...base });
    expect(a.score).toBe(b.score);
  });

  it('Builder Record is MODEST: maxing it out cannot overcome a meaningful trust deficit', () => {
    const strongTrust = scoreMerchantDiscovery({ ...base, builderScore: 0, merchantTrust: 95, deliveryReliability: 95 });
    const maxBuilder = scoreMerchantDiscovery({ ...base, builderScore: 10000, merchantTrust: 20, deliveryReliability: 20 });
    expect(strongTrust.score).toBeGreaterThan(maxBuilder.score);
  });

  it('FRAUD RISK heavily suppresses visibility (protective), without zeroing legitimate-but-flagged edge cases unfairly', () => {
    const clean = scoreMerchantDiscovery({ ...base, fraudRisk: 0 });
    const flagged = scoreMerchantDiscovery({ ...base, fraudRisk: 90 });
    expect(flagged.score).toBeLessThan(clean.score);
    expect(flagged.score).toBeLessThan(clean.score * 0.6);
  });

  it('NEW-MERCHANT PROTECTION: a brand-new store gets a visibility window that an old store does not', () => {
    const brandNew = scoreMerchantDiscovery({ ...base, ageDays: 3, merchantTrust: 40, deliveryReliability: null, commerceHealth: null, builderScore: 0 });
    const oldSame = scoreMerchantDiscovery({ ...base, ageDays: 400, merchantTrust: 40, deliveryReliability: null, commerceHealth: null, builderScore: 0 });
    expect(brandNew.score).toBeGreaterThan(oldSame.score);
    expect(brandNew.explanation.some((e) => e.signal === 'New-merchant window')).toBe(true);
  });

  it('new-merchant boost DECAYS: a 3-day store gets more boost than a 60-day store', () => {
    const day3 = scoreMerchantDiscovery({ ...base, ageDays: 3, deliveryReliability: null, commerceHealth: null });
    const day60 = scoreMerchantDiscovery({ ...base, ageDays: 60, deliveryReliability: null, commerceHealth: null });
    const boost = (d: DiscoveryScore) => d.explanation.find((e) => e.signal === 'New-merchant window')?.contribution ?? 0;
    expect(boost(day3)).toBeGreaterThan(boost(day60));
  });

  it('every result is EXPLAINABLE: trust, builder, and fraud contributions are itemized', () => {
    const d = scoreMerchantDiscovery({ ...base, fraudRisk: 30 });
    const signals = d.explanation.map((e) => e.signal);
    expect(signals).toContain('Merchant trust');
    expect(signals).toContain('Builder Record');
    expect(signals).toContain('Fraud risk');
    expect(d.explanation.find((e) => e.signal === 'Fraud risk')?.contribution).toBeLessThan(0);
  });

  it('unproven delivery history neither boosts nor penalizes (honest about thin data)', () => {
    const unproven = scoreMerchantDiscovery({ ...base, deliveryReliability: null });
    const entry = unproven.explanation.find((e) => e.signal === 'Delivery reliability');
    expect(entry?.contribution).toBe(0);
  });
});

const tBase: TransparencyInputs = {
  displayName: 'Maria Leatherworks',
  verified: true,
  ageDays: 800,
  merchantTrust: 85,
  deliveryReliability: 90,
  deliveryReliabilityLabel: 'reliable',
  disputesTotal: 2,
  disputesUpheld: 0,
  continuityReady: true,
  recoveryReady: true,
};

describe('Merchant transparency panel — grandmother test', () => {
  it('answers who/trust/delivery/age/what-if in a plain one-liner', () => {
    const p = buildTransparencyPanel(tBase);
    expect(p.plainSummary).toContain('Maria Leatherworks');
    expect(p.plainSummary).toContain('verified');
    expect(p.plainSummary).toContain('2 years');
    expect(p.trustLabel).toBe('strong');
  });

  it('a brand-new merchant reads as "new" without faking history', () => {
    const p = buildTransparencyPanel({ ...tBase, ageDays: 10, merchantTrust: 50, deliveryReliability: null, deliveryReliabilityLabel: 'unproven', continuityReady: false });
    expect(p.yearsActive).toBe('new');
    expect(p.deliveryLabel).toContain('No delivery history');
    expect(p.trustLabel).toBe('building');
  });

  it('always states the ownership protection (funds never frozen/seized)', () => {
    const p = buildTransparencyPanel(tBase);
    expect(p.protections.some((x) => /never frozen or seized/.test(x))).toBe(true);
  });

  it('surfaces upheld disputes honestly', () => {
    const p = buildTransparencyPanel({ ...tBase, disputesTotal: 5, disputesUpheld: 2 });
    expect(p.disputeSummary).toContain('2 of 5');
  });
});
