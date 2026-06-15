import { describe, expect, it } from '@jest/globals';
import { buildMerchantRank, orderProductsByMerchantRank } from '@/lib/marketplace/discoveryOrdering';

type P = { id: string; merchant_address?: string };
const p = (id: string, merchant?: string): P => ({ id, merchant_address: merchant });

// ════════════════════════════════════════════════════════
// MARKETPLACE — FAIR DISCOVERY ORDERING (Commerce Phase 5 follow-up)
//   Activates the certified relevance-first, no-wealth/no-paid merchant ranking on the public product grid.
// ════════════════════════════════════════════════════════

describe('Marketplace · A. buildMerchantRank (discovery → rank map)', () => {
  it('A1 maps merchantAddress → rank index (0 = best standing), lowercased', () => {
    const m = buildMerchantRank([{ merchantAddress: '0xAAA' }, { merchantAddress: '0xBBB' }]);
    expect(m.get('0xaaa')).toBe(0);
    expect(m.get('0xbbb')).toBe(1);
  });
  it('A2 null/non-array results → empty map (graceful, outage-safe)', () => {
    expect(buildMerchantRank(null).size).toBe(0);
    expect(buildMerchantRank(undefined).size).toBe(0);
    expect(buildMerchantRank([] as any).size).toBe(0);
  });
  it('A3 entries without a string merchantAddress are skipped', () => {
    const m = buildMerchantRank([{ merchantAddress: 123 as any }, { merchantAddress: '0xCCC' }]);
    expect(m.has('0xccc')).toBe(true);
    expect(m.size).toBe(1);
  });
  it('A4 first occurrence wins (engine already ranked; no later override)', () => {
    const m = buildMerchantRank([{ merchantAddress: '0xAAA' }, { merchantAddress: '0xAAA' }]);
    expect(m.get('0xaaa')).toBe(0);
    expect(m.size).toBe(1);
  });
});

describe('Marketplace · B. orderProductsByMerchantRank — fair ordering, never hiding', () => {
  it('B1 orders products so higher-ranked merchants surface first', () => {
    const rank = buildMerchantRank([{ merchantAddress: '0xHIGH' }, { merchantAddress: '0xLOW' }]);
    const products = [p('1', '0xLOW'), p('2', '0xHIGH')];
    expect(orderProductsByMerchantRank(products, rank).map((x) => x.id)).toEqual(['2', '1']);
  });
  it('B2 NEVER drops products — output length equals input length', () => {
    const rank = buildMerchantRank([{ merchantAddress: '0xHIGH' }]);
    const products = [p('1', '0xHIGH'), p('2', '0xUNRANKED'), p('3')];
    expect(orderProductsByMerchantRank(products, rank)).toHaveLength(3);
  });
  it('B3 an EMPTY rank (discovery outage/empty) is a no-op — original order preserved', () => {
    const products = [p('1', '0xB'), p('2', '0xA')];
    expect(orderProductsByMerchantRank(products, new Map()).map((x) => x.id)).toEqual(['1', '2']);
  });
  it('B4 products whose merchant is NOT ranked fall to the end (after all ranked merchants)', () => {
    const rank = buildMerchantRank([{ merchantAddress: '0xRANKED' }]);
    const products = [p('u', '0xUNRANKED'), p('r', '0xRANKED'), p('n')]; // n has no merchant at all
    expect(orderProductsByMerchantRank(products, rank).map((x) => x.id)).toEqual(['r', 'u', 'n']);
  });
  it('B5 STABLE within a merchant — server\'s product order is preserved', () => {
    const rank = buildMerchantRank([{ merchantAddress: '0xM' }]);
    const products = [p('a', '0xM'), p('b', '0xM'), p('c', '0xM')];
    expect(orderProductsByMerchantRank(products, rank).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('B6 stable among equally-unranked products too', () => {
    const rank = buildMerchantRank([{ merchantAddress: '0xRANKED' }]);
    const products = [p('x', '0xNOPE'), p('y', '0xALSO'), p('z', '0xRANKED')];
    expect(orderProductsByMerchantRank(products, rank).map((x) => x.id)).toEqual(['z', 'x', 'y']);
  });
  it('B7 case-insensitive merchant matching', () => {
    const rank = buildMerchantRank([{ merchantAddress: '0xabc' }]);
    const products = [p('1', '0xUNRANKED'), p('2', '0xABC')];
    expect(orderProductsByMerchantRank(products, rank).map((x) => x.id)).toEqual(['2', '1']);
  });
  it('B8 ordering uses ONLY merchant rank — price/wealth never participate', () => {
    // a cheaper/pricier product cannot jump rank; only the merchant's fair standing matters
    const rank = buildMerchantRank([{ merchantAddress: '0xGOOD' }, { merchantAddress: '0xMEH' }]);
    const products = [
      { id: 'expensive', merchant_address: '0xMEH', price: '9999' },
      { id: 'cheap', merchant_address: '0xGOOD', price: '1' },
    ];
    // GOOD merchant first regardless of price
    expect(orderProductsByMerchantRank(products, rank).map((x) => x.id)).toEqual(['cheap', 'expensive']);
  });
});
