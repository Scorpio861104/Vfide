import { describe, expect, it } from '@jest/globals';
import {
  computeExpiry, assignLicenseKey, canFulfill, canDownload, reissuePolicy,
  type DigitalAssetLike, type DeliveryLike,
} from '@/lib/commerce/digitalDelivery';

const A = (o: Partial<DigitalAssetLike> = {}): DigitalAssetLike => ({
  id: 1, download_limit: 3, expires_hours: 24, license_key_pool: null, requires_license: false, ...o,
});
const D = (o: Partial<DeliveryLike> = {}): DeliveryLike => ({
  download_count: 0, download_limit: 3, expires_at: null, revoked: false, license_key: null, ...o,
});
const NOW = 1_000_000_000_000;
const HOUR = 3_600_000;

// ════════════════════════════════════════════════════════
// COMMERCE OPERATIONS PHASE 1B — DIGITAL DELIVERY SCENARIO MATRIX
//   A. Fulfillment gating   B. License keys / pool   C. Expiry   D. Download limits / multiple downloads
//   E. Refund / chargeback revocation   F. Lost-access reissue   G. File replacement / large files
//   H. Multiple purchases   I. Adversarial
// ════════════════════════════════════════════════════════

describe('Phase 1B · A. Fulfillment gating', () => {
  it('A1 unpaid order cannot be fulfilled', () => {
    expect(canFulfill(A(), false, false)).toEqual({ ok: false, reason: 'ORDER_NOT_PAID' });
  });
  it('A2 paid order with no asset → NO_ASSET', () => {
    expect(canFulfill(null, true, false)).toEqual({ ok: false, reason: 'NO_ASSET' });
  });
  it('A3 already-delivered → ALREADY_DELIVERED (idempotent guard)', () => {
    expect(canFulfill(A(), true, true)).toEqual({ ok: false, reason: 'ALREADY_DELIVERED' });
  });
  it('A4 paid + asset + not delivered → ok', () => {
    expect(canFulfill(A(), true, false)).toEqual({ ok: true });
  });
});

describe('Phase 1B · B. License keys / pool', () => {
  it('B1 pops the first key and returns the remaining pool', () => {
    const r = assignLicenseKey(A({ license_key_pool: ['K1', 'K2', 'K3'] }));
    expect(r).toEqual({ ok: true, key: 'K1', remainingPool: ['K2', 'K3'] });
  });
  it('B2 file-only product (no pool, not required) delivers with null key', () => {
    expect(assignLicenseKey(A({ license_key_pool: null, requires_license: false }))).toEqual({ ok: true, key: null, remainingPool: [] });
  });
  it('B3 license-REQUIRED product with empty pool → LICENSE_POOL_EXHAUSTED (no silent keyless delivery)', () => {
    expect(assignLicenseKey(A({ license_key_pool: [], requires_license: true }))).toEqual({ ok: false, reason: 'LICENSE_POOL_EXHAUSTED' });
  });
  it('B4 license-required with keys still works', () => {
    expect(assignLicenseKey(A({ license_key_pool: ['ONLY'], requires_license: true })).ok).toBe(true);
  });
  it('B5 draining the pool one key at a time across buyers', () => {
    let pool = ['A', 'B'];
    const r1 = assignLicenseKey(A({ license_key_pool: pool, requires_license: true }));
    expect(r1.ok && r1.key).toBe('A'); pool = (r1 as { remainingPool: string[] }).remainingPool;
    const r2 = assignLicenseKey(A({ license_key_pool: pool, requires_license: true }));
    expect(r2.ok && r2.key).toBe('B'); pool = (r2 as { remainingPool: string[] }).remainingPool;
    const r3 = assignLicenseKey(A({ license_key_pool: pool, requires_license: true }));
    expect(r3).toEqual({ ok: false, reason: 'LICENSE_POOL_EXHAUSTED' });
  });
});

describe('Phase 1B · C. Expiry', () => {
  it('C1 never-expiring asset → null expiry', () => {
    expect(computeExpiry(A({ expires_hours: null }), NOW)).toBeNull();
  });
  it('C2 24h asset → now + 24h', () => {
    expect(computeExpiry(A({ expires_hours: 24 }), NOW)).toBe(NOW + 24 * HOUR);
  });
  it('C3 download before expiry succeeds', () => {
    expect(canDownload(D({ expires_at: new Date(NOW + HOUR).toISOString() }), NOW).ok).toBe(true);
  });
  it('C4 download after expiry → EXPIRED', () => {
    expect(canDownload(D({ expires_at: new Date(NOW - HOUR).toISOString() }), NOW)).toEqual({ ok: false, reason: 'EXPIRED' });
  });
  it('C5 download exactly at expiry boundary (expired)', () => {
    // expires_at strictly less than now = expired; at the exact ms it is NOT yet expired
    expect(canDownload(D({ expires_at: new Date(NOW).toISOString() }), NOW).ok).toBe(true);
    expect(canDownload(D({ expires_at: new Date(NOW).toISOString() }), NOW + 1)).toEqual({ ok: false, reason: 'EXPIRED' });
  });
  it('C6 null expiry never expires', () => {
    expect(canDownload(D({ expires_at: null }), NOW + 10 ** 12).ok).toBe(true);
  });
});

describe('Phase 1B · D. Download limits / multiple downloads', () => {
  it('D1 first download of a 3-limit delivery → remaining 2', () => {
    expect(canDownload(D({ download_count: 0, download_limit: 3 }), NOW)).toEqual({ ok: true, newCount: 1, remaining: 2 });
  });
  it('D2 last allowed download → remaining 0', () => {
    expect(canDownload(D({ download_count: 2, download_limit: 3 }), NOW)).toEqual({ ok: true, newCount: 3, remaining: 0 });
  });
  it('D3 one past the limit → LIMIT_REACHED', () => {
    expect(canDownload(D({ download_count: 3, download_limit: 3 }), NOW)).toEqual({ ok: false, reason: 'LIMIT_REACHED' });
  });
  it('D4 unlimited downloads (null limit) → remaining null, always ok', () => {
    expect(canDownload(D({ download_count: 999, download_limit: null }), NOW)).toEqual({ ok: true, newCount: 1000, remaining: null });
  });
  it('D5 sequential multiple downloads count up correctly', () => {
    let count = 0;
    for (let n = 1; n <= 3; n++) {
      const r = canDownload(D({ download_count: count, download_limit: 3 }), NOW);
      expect(r.ok).toBe(true);
      if (r.ok) count = r.newCount;
    }
    expect(count).toBe(3);
    expect(canDownload(D({ download_count: count, download_limit: 3 }), NOW).ok).toBe(false);
  });
});

describe('Phase 1B · E. Refund / chargeback revocation', () => {
  it('E1 revoked delivery cannot be downloaded', () => {
    expect(canDownload(D({ revoked: true }), NOW)).toEqual({ ok: false, reason: 'REVOKED' });
  });
  it('E2 revoked takes precedence over an otherwise-valid window', () => {
    expect(canDownload(D({ revoked: true, download_count: 0, download_limit: 3, expires_at: new Date(NOW + HOUR).toISOString() }), NOW).reason).toBe('REVOKED');
  });
  it('E3 revoked takes precedence over expiry', () => {
    expect(canDownload(D({ revoked: true, expires_at: new Date(NOW - HOUR).toISOString() }), NOW).reason).toBe('REVOKED');
  });
  it('E4 non-revoked still downloads normally', () => {
    expect(canDownload(D({ revoked: false }), NOW).ok).toBe(true);
  });
});

describe('Phase 1B · F. Lost-access reissue', () => {
  it('F1 reissue resets the download count to 0', () => {
    expect(reissuePolicy(D({ download_count: 3, download_limit: 3 }))).toEqual({ ok: true, resetCountTo: 0 });
  });
  it('F2 a buyer at the limit can be reissued and then download again', () => {
    const depleted = D({ download_count: 3, download_limit: 3 });
    expect(canDownload(depleted, NOW).ok).toBe(false);
    const re = reissuePolicy(depleted);
    expect(re.ok).toBe(true);
    if (re.ok) expect(canDownload(D({ download_count: re.resetCountTo, download_limit: 3 }), NOW).ok).toBe(true);
  });
  it('F3 a REVOKED (refunded) delivery cannot be reissued', () => {
    expect(reissuePolicy(D({ revoked: true }))).toEqual({ ok: false, reason: 'REVOKED' });
  });
});

describe('Phase 1B · G. File replacement / large files', () => {
  // The asset row carries file_url + file_version; replacement bumps the version. The delivery resolves the
  // CURRENT asset row at download time, so a replaced file is served to existing buyers (a feature). The pure
  // layer's job is limit/expiry/revoke; file identity is the asset's. These verify the gating is independent
  // of file specifics (large files / replaced files still gate identically).
  it('G1 large file (size irrelevant to gating) downloads under limit', () => {
    expect(canDownload(D({ download_count: 0, download_limit: 1 }), NOW).ok).toBe(true);
  });
  it('G2 replacing the file does not reset a buyer count (count lives on the delivery, not the asset)', () => {
    // a delivery at its limit stays limited regardless of asset changes
    expect(canDownload(D({ download_count: 1, download_limit: 1 }), NOW).reason).toBe('LIMIT_REACHED');
  });
  it('G3 a never-limited large-file product can be re-downloaded indefinitely', () => {
    expect(canDownload(D({ download_count: 50, download_limit: null }), NOW).ok).toBe(true);
  });
});

describe('Phase 1B · H. Multiple purchases', () => {
  it('H1 two separate orders each get an independent fulfillment gate', () => {
    // order A delivered, order B not yet → B can still fulfill
    expect(canFulfill(A(), true, true).ok).toBe(false);  // order A already delivered
    expect(canFulfill(A(), true, false).ok).toBe(true);  // order B fresh
  });
  it('H2 each purchase draws its own key from the pool', () => {
    let pool = ['K1', 'K2'];
    const a = assignLicenseKey(A({ license_key_pool: pool }));
    pool = (a as { remainingPool: string[] }).remainingPool;
    const b = assignLicenseKey(A({ license_key_pool: pool }));
    expect([a.ok && a.key, b.ok && b.key]).toEqual(['K1', 'K2']);
  });
  it('H3 each delivery tracks its own download count independently', () => {
    const buyer1 = D({ download_count: 3, download_limit: 3 }); // exhausted
    const buyer2 = D({ download_count: 0, download_limit: 3 }); // fresh
    expect(canDownload(buyer1, NOW).ok).toBe(false);
    expect(canDownload(buyer2, NOW).ok).toBe(true);
  });
});

describe('Phase 1B · I. Adversarial', () => {
  it('I1 download with no delivery row → NOT_FOUND (cannot fabricate access)', () => {
    expect(canDownload(null, NOW)).toEqual({ ok: false, reason: 'NOT_FOUND' });
  });
  it('I2 expired + over-limit + revoked: revoked reported first (most restrictive intent)', () => {
    const r = canDownload(D({ revoked: true, download_count: 99, download_limit: 3, expires_at: new Date(NOW - HOUR).toISOString() }), NOW);
    expect(r).toEqual({ ok: false, reason: 'REVOKED' });
  });
  it('I3 cannot bypass limit by huge negative... count is server-held; a tampered low count still gates by stored limit', () => {
    // even if count somehow 0, limit 0 means no downloads
    expect(canDownload(D({ download_count: 0, download_limit: 0 }), NOW).reason).toBe('LIMIT_REACHED');
  });
  it('I4 license-required exhaustion cannot be bypassed into a keyless delivery', () => {
    expect(assignLicenseKey(A({ license_key_pool: [], requires_license: true })).ok).toBe(false);
  });
  it('I5 reissue cannot revive a refunded buyer (revocation is sticky)', () => {
    expect(reissuePolicy(D({ revoked: true, download_count: 0 })).ok).toBe(false);
  });
});
