/**
 * Merchant Trust engine tests (Wave 79 campaign) — proves the split-brain formula is fixed (one value),
 * verification is reflected, the missing-volume input now counts, stagnation has a rebuild path, and bad
 * inputs are safe. These lock the consistency guarantee so the four surfaces can't drift apart again.
 */

import { computeMerchantTrust } from '@/lib/seer/merchantTrust';

const cleanVerified = { verified: true, disputesUpheld: 0, refundsGranted: 0, disputesTotal: 0 };

describe('Merchant Trust engine — single source of truth (Wave 79)', () => {
  it('a clean verified merchant scores 70 (reconciles the old 70/65 split across surfaces)', () => {
    expect(computeMerchantTrust(cleanVerified).score).toBe(70);
  });

  it('verification is reflected (was invisible in HQ/transparency): unverified < verified', () => {
    const unverified = computeMerchantTrust({ ...cleanVerified, verified: false }).score;
    const verified = computeMerchantTrust(cleanVerified).score;
    expect(unverified).toBe(55);
    expect(verified).toBe(70);
    expect(verified - unverified).toBe(15);
  });

  it('proven volume counts (missing input fixed) but is capped (cannot buy trust)', () => {
    expect(computeMerchantTrust({ ...cleanVerified, confirmedPayments: 2 }).score).toBe(70); // floor(2/5)=0
    const high = computeMerchantTrust({ ...cleanVerified, confirmedPayments: 500 });
    expect(high.score).toBe(82); // +12 cap → strong
    expect(high.label).toBe('strong');
    // Volume lift never exceeds the cap regardless of how huge.
    expect(computeMerchantTrust({ ...cleanVerified, confirmedPayments: 100000 }).score).toBe(82);
  });

  it('stagnation has a rebuild path: clean volume restores standing without erasing wrongdoing', () => {
    const damaged = { verified: true, disputesUpheld: 3, refundsGranted: 0, disputesTotal: 3 };
    const stuck = computeMerchantTrust(damaged).score;          // 55+15-60 = 10
    const rebuilding = computeMerchantTrust({ ...damaged, confirmedPayments: 300 }).score;
    expect(stuck).toBe(10);
    expect(rebuilding).toBeGreaterThan(stuck); // earned recovery
    expect(rebuilding).toBeLessThan(computeMerchantTrust(cleanVerified).score); // but disputes still cost
  });

  it('upheld disputes hurt hard; refunds mildly', () => {
    expect(computeMerchantTrust({ ...cleanVerified, disputesUpheld: 1 }).score).toBe(50);
    expect(computeMerchantTrust({ ...cleanVerified, refundsGranted: 1 }).score).toBe(65);
  });

  it('delivery reliability nudges within a bounded ±10 band', () => {
    expect(computeMerchantTrust({ ...cleanVerified, deliveryReliability: 100 }).score).toBe(80);
    expect(computeMerchantTrust({ ...cleanVerified, deliveryReliability: 0 }).score).toBe(60);
    expect(computeMerchantTrust({ ...cleanVerified, deliveryReliability: 50 }).score).toBe(70); // neutral
    expect(computeMerchantTrust({ ...cleanVerified, deliveryReliability: null }).score).toBe(70); // unproven = skip
  });

  it('labels map correctly to score bands', () => {
    expect(computeMerchantTrust({ ...cleanVerified, disputesUpheld: 1 }).label).toBe('building'); // 50
    expect(computeMerchantTrust(cleanVerified).label).toBe('established'); // 70
    expect(computeMerchantTrust({ ...cleanVerified, deliveryReliability: 100 }).label).toBe('strong'); // 80
  });

  describe('edge cases — bad inputs cannot break or game the score', () => {
    it('negative / NaN / Infinity inputs are ignored, score stays in [0,100]', () => {
      expect(computeMerchantTrust({ ...cleanVerified, disputesUpheld: -5 }).score).toBe(70);
      expect(computeMerchantTrust({ ...cleanVerified, refundsGranted: NaN }).score).toBe(70);
      const inf = computeMerchantTrust({ ...cleanVerified, confirmedPayments: Infinity });
      expect(Number.isFinite(inf.score)).toBe(true);
      expect(inf.score).toBeLessThanOrEqual(100);
    });
    it('fractional counts are floored', () => {
      expect(computeMerchantTrust({ ...cleanVerified, confirmedPayments: 7.9 }).score).toBe(71); // floor(7/5)=1
    });
    it('catastrophic dispute count floors at 0, never negative', () => {
      expect(computeMerchantTrust({ ...cleanVerified, disputesUpheld: 10 }).score).toBe(0);
    });
  });
});
