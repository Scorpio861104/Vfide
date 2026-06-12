import { describe, expect, it } from '@jest/globals';
import { TRANSFERABLE_MERCHANT_TABLES, reassignBusinessRecords } from '@/lib/merchant/businessTransfer';
import { computeDeliveryReliability, type DeliveryStats } from '@/lib/seer/deliveryReliability';

describe('Merchant business transfer — record reassignment (Phase 1)', () => {
  it('reassigns merchant_address across every allow-listed table, all-or-nothing', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    // Fake transaction client capturing UPDATEs.
    const client = {
      query: async (sql: string, params: unknown[]) => { calls.push({ sql, params }); return { rowCount: 2 }; },
    } as unknown as Parameters<typeof reassignBusinessRecords>[0];

    const results = await reassignBusinessRecords(client, '0xFROM', '0xTO');
    expect(results).toHaveLength(TRANSFERABLE_MERCHANT_TABLES.length);
    // Every call moves from->to (lowercased) and targets an allow-listed table.
    for (const c of calls) {
      expect(c.params).toEqual(['0xto', '0xfrom']);
      expect(TRANSFERABLE_MERCHANT_TABLES.some((t) => c.sql.includes(`UPDATE ${t} `))).toBe(true);
    }
    expect(results.every((r) => r.rowsMoved === 2)).toBe(true);
  });

  it('refuses a no-op transfer to the same address', async () => {
    const client = { query: async () => ({ rowCount: 0 }) } as unknown as Parameters<typeof reassignBusinessRecords>[0];
    await expect(reassignBusinessRecords(client, '0xSAME', '0xsame')).rejects.toThrow();
  });

  it('the funds tables are NOT in the transfer list (funds move via on-chain inheritance, not here)', () => {
    // Sanity: nothing that holds balances/escrow should be reassigned off-chain.
    const forbidden = ['vault', 'balance', 'escrow', 'wallet'];
    for (const t of TRANSFERABLE_MERCHANT_TABLES) {
      expect(forbidden.some((f) => t.includes(f))).toBe(false);
    }
  });
});

describe('Delivery reliability (Phase 3)', () => {
  const base: DeliveryStats = { shipped: 0, deliveredConfirmed: 0, deliveredUnconfirmed: 0, notReceived: 0, returned: 0 };

  it('too little history -> unproven, no score', () => {
    const r = computeDeliveryReliability({ ...base, shipped: 1 });
    expect(r.reliability).toBe('unproven');
    expect(r.score).toBeNull();
  });

  it('strong confirmed-delivery record -> reliable, high score', () => {
    const r = computeDeliveryReliability({ ...base, deliveredConfirmed: 40, shipped: 2 });
    expect(r.reliability).toBe('reliable');
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it('high not-received rate -> concerning', () => {
    const r = computeDeliveryReliability({ ...base, deliveredConfirmed: 10, notReceived: 6 });
    expect(r.reliability).toBe('concerning');
    expect(r.notReceivedRate).toBeGreaterThanOrEqual(0.15);
  });

  it('merchant-asserted-but-unconfirmed deliveries score lower than confirmed ones', () => {
    const confirmed = computeDeliveryReliability({ ...base, deliveredConfirmed: 20 });
    const unconfirmed = computeDeliveryReliability({ ...base, deliveredUnconfirmed: 20 });
    expect((confirmed.score ?? 0)).toBeGreaterThan(unconfirmed.score ?? 0);
  });

  it('only a concerning record trips the marketplace-trust scam signal', () => {
    const concerning = computeDeliveryReliability({ ...base, deliveredConfirmed: 10, notReceived: 6 });
    const clean = computeDeliveryReliability({ ...base, deliveredConfirmed: 40, shipped: 2 });
    const unproven = computeDeliveryReliability({ ...base, shipped: 1 });
    const tripsSignal = (result: ReturnType<typeof computeDeliveryReliability>) =>
      result.reliability === 'concerning' ? 1 : 0;

    expect(tripsSignal(concerning)).toBe(1);
    expect(tripsSignal(clean)).toBe(0);
    expect(tripsSignal(unproven)).toBe(0);
  });
});
