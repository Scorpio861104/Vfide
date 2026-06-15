/**
 * API-handler test for /api/merchant/hq (Wave 68 — consume the intelligence).
 *
 * Proves the HQ payload actually SURFACES the intelligence it now consumes — Builder Record,
 * Extraction Index, and Lending — each with actionable output (the Action Center principle), with the
 * DB/auth layers mocked. This is the runtime-behavior evidence (Phase 8) for the consumption wiring.
 */

import { NextRequest } from 'next/server';

const MERCHANT = '0x1111111111111111111111111111111111111111';

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (req: unknown, user: { address: string }) => unknown) => async (req: unknown) =>
    handler(req, { sub: 'test', address: MERCHANT }),
}));

// DB mock: returns empty/zero for every read so the HQ composes from "no data" gracefully (provisional)
// while still exercising every engine call path (Builder/Extraction/Lending/Health/Advisor).
jest.mock('@/lib/db', () => ({
  query: jest.fn(async (sql: string) => {
    const s = sql.replace(/\s+/g, ' ');
    if (s.includes("event_type = 'score'")) return { rows: [{ score: '7200' }] }; // ProofScore 7200 → lending-eligible
    if (s.includes('extraction_index_state')) return { rows: [] };
    if (s.includes('FROM disputes')) return { rows: [{ total: '0', upheld: '0', refunded: '0' }] };
    if (s.includes('FROM shipments')) return { rows: [] };
    if (s.includes('merchant_succession')) return { rows: [{ c: '0' }] };
    if (s.includes('merchant_operators')) return { rows: [{ c: '0' }] };
    if (s.includes('merchant_subscription_plans')) return { rows: [{ c: '2' }] }; // has subscription plans
    if (s.includes('merchant_orders')) return { rows: [{ c: '1' }] }; // 1 refund in 90d
    if (s.includes('merchant_payment_confirmations')) return { rows: [{ last30: '0', prev30: '0', orders30: '0', ordersprev30: '0', lifetime: '0', cust90: '0', repeat90: '0' }] };
    // Builder/extraction signal derivations read various tables — default empty.
    return { rows: [] };
  }),
  getClient: jest.fn(),
}));

import { GET } from '@/app/api/merchant/hq/route';

function get(): NextRequest {
  return new NextRequest('http://localhost/api/merchant/hq', { method: 'GET' });
}

describe('Merchant HQ — consumes Builder / Extraction / Lending intelligence (Wave 68)', () => {
  it('returns the new intelligence sections, each with an action (Action Center)', async () => {
    const res = await GET(get());
    expect(res.status).toBe(200);
    const json = await res.json();

    // Builder intelligence is now in the payload, with opportunities + an action.
    expect(json.builder).toBeDefined();
    expect(typeof json.builder.score).toBe('number');
    expect(json.builder.classification).toBeTruthy();
    expect(Array.isArray(json.builder.opportunities)).toBe(true);
    expect(json.builder.action.length).toBeGreaterThan(0);

    // Lending opportunities are surfaced (ProofScore 7200 → eligible).
    expect(json.lending).toBeDefined();
    expect(json.lending.eligible).toBe(true);
    expect(json.lending.onChainMaxVfide).toBeGreaterThan(0);
    expect(json.lending.action).toMatch(/VFIDE/);

    // Extraction posture is surfaced with the ownership-safety note.
    expect(json.extraction).toBeDefined();
    expect(typeof json.extraction.index).toBe('number');
    expect(json.extraction.note).toMatch(/never affects ownership/i);

    // Snapshot now carries Builder + extraction (previously absent).
    expect(json.snapshot).toHaveProperty('builderRecord');
    expect(json.snapshot).toHaveProperty('builderClassification');
    expect(json.snapshot).toHaveProperty('extractionIndex');

    // Stability Bonding is now consumed by HQ as a benefits preview (Wave 69).
    expect(json.stabilityBonding).toBeDefined();
    expect(json.stabilityBonding.available).toBe(true);
    expect(json.stabilityBonding.active).toBe(false); // no live bond contract yet
    expect(Array.isArray(json.stabilityBonding.preview)).toBe(true);
    expect(json.stabilityBonding.preview).toHaveLength(4); // 3/6/12/24-month terms
    // Longer terms earn a better (lower) fee multiplier than shorter ones.
    const fee = (t: number) => json.stabilityBonding.preview.find((p: { termMonths: number; feeMultiplier: number }) => p.termMonths === t).feeMultiplier;
    expect(fee(24)).toBeLessThan(fee(3));

    // Phase 6/7 — Opportunity Center + Risk Center with structured cause→effect→action (Wave 70).
    expect(Array.isArray(json.opportunityCenter)).toBe(true);
    expect(Array.isArray(json.riskCenter)).toBe(true);
    // Every opportunity carries cause/effect/action; every risk carries cause/effect/mitigation.
    for (const o of json.opportunityCenter) {
      expect(o).toHaveProperty('cause'); expect(o).toHaveProperty('effect'); expect(o).toHaveProperty('action');
    }
    for (const r of json.riskCenter) {
      expect(r).toHaveProperty('cause'); expect(r).toHaveProperty('effect'); expect(r).toHaveProperty('mitigation'); expect(r).toHaveProperty('level');
    }
    // With no continuity/recovery configured (mock), preparedness + recovery risks must surface.
    const riskSignals = json.riskCenter.map((r: { signal: string }) => r.signal);
    expect(riskSignals).toContain('Preparedness');
    expect(riskSignals).toContain('Recovery');
    // Lending eligibility (ProofScore 7200) must surface as an opportunity.
    expect(json.opportunityCenter.some((o: { signal: string }) => o.signal === 'Lending')).toBe(true);
  });

  it('a merchant with no governance/recovery/continuity gets concrete Builder opportunities', async () => {
    const res = await GET(get());
    const json = await res.json();
    // With all-empty signals, the opportunity list should suggest verification/governance/recovery/continuity.
    expect(json.builder.opportunities.length).toBeGreaterThan(0);
    expect(json.builder.opportunities.join(' ')).toMatch(/governance|recovery|continuity|verify/i);
  });
});
