import { NextRequest } from 'next/server';

// Route the mocked DB by SQL CONTENT (not call order) so the test exercises real composition:
//   candidate query → merchant list; shipments/disputes/payments → per-address controlled signals.
const CANDIDATES: Array<Record<string, unknown>> = [];
const DISPUTES_UPHELD: Record<string, number> = {};

jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/db', () => ({
  query: jest.fn(async (sql: string, params: unknown[]) => {
    const s = String(sql);
    // 1) candidate selection
    if (/FROM merchant_profiles p/.test(s)) {
      return { rows: (globalThis as unknown as { __CANDS: typeof CANDIDATES }).__CANDS };
    }
    const addr = String((params?.[0] ?? '')).toLowerCase();
    // 2) delivery (shipments) — return empty → unproven (null score), neutral
    if (/FROM shipments/.test(s)) return { rows: [] };
    // 3) fraud + trust (disputes) — upheld count per address drives fraudRisk = min(100, upheld*30)
    if (/FROM disputes/.test(s)) {
      const upheld = (globalThis as unknown as { __UPHELD: typeof DISPUTES_UPHELD }).__UPHELD[addr] ?? 0;
      return { rows: [{ upheld: String(upheld), refunded: '0', total: String(upheld) }] };
    }
    // 4) payment confirmations
    if (/FROM merchant_payment_confirmations/.test(s)) return { rows: [{ c: '5' }] };
    // 5) any builder/commerce-health enrichment reads → empty (degrade to no bonus)
    return { rows: [] };
  }),
}));
(globalThis as unknown as { __CANDS: typeof CANDIDATES }).__CANDS = CANDIDATES;
(globalThis as unknown as { __UPHELD: typeof DISPUTES_UPHELD }).__UPHELD = DISPUTES_UPHELD;

import { GET } from '@/app/api/discovery/route';

function setCandidates(rows: Array<Record<string, unknown>>, upheld: Record<string, number> = {}) {
  CANDIDATES.length = 0; CANDIDATES.push(...rows);
  for (const k of Object.keys(DISPUTES_UPHELD)) delete DISPUTES_UPHELD[k];
  Object.assign(DISPUTES_UPHELD, upheld);
}
const req = (qs = '') => new NextRequest(`http://localhost/api/discovery${qs}`);

const cand = (addr: string, relevance: number, o: Record<string, unknown> = {}) => ({
  merchant_address: addr, display_name: addr.slice(0, 6), verified: false,
  created_at: new Date(Date.now() - 300 * 86400000).toISOString(), relevance: String(relevance), product_count: '3', ...o,
});

describe('Phase 5 · L. Discovery route — ranking composition', () => {
  it('L1 returns ranked, explainable results', async () => {
    setCandidates([cand('0xaaaaaa', 3), cand('0xbbbbbb', 3)]);
    const res = await GET(req('?q=widget')) as Response;
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(Array.isArray(j.results)).toBe(true);
    expect(j.results.length).toBe(2);
    expect(Array.isArray(j.results[0].whyRanked)).toBe(true); // explainability present
  });

  it('L2 a fraud-flagged merchant ranks BELOW a clean one at equal relevance (real path)', async () => {
    setCandidates(
      [cand('0xclean0', 3), cand('0xfraud0', 3)],
      { '0xfraud0': 5 }, // 5 upheld disputes → fraudRisk capped 100
    );
    const res = await GET(req('?q=widget')) as Response;
    const j = await res.json();
    const order = j.results.map((r: { merchantAddress: string }) => r.merchantAddress);
    expect(order.indexOf('0xclean0')).toBeLessThan(order.indexOf('0xfraud0'));
  });

  it('L3 higher relevance outranks lower regardless of merit (route-level)', async () => {
    setCandidates([cand('0xlowrel', 1), cand('0xhirel0', 3)]);
    const res = await GET(req('?q=widget')) as Response;
    const j = await res.json();
    expect(j.results[0].merchantAddress).toBe('0xhirel0'); // relevance 3 bucket beats relevance 1
  });

  it('L4 high_reliability filter narrows to reliable merchants (none reliable here → empty)', async () => {
    setCandidates([cand('0xaaaaaa', 3)]); // shipments empty → unproven, not reliable
    const res = await GET(req('?q=widget&filter=high_reliability')) as Response;
    const j = await res.json();
    expect(j.results.length).toBe(0);
  });

  it('L5 browse-all (no query) returns results ranked by merit', async () => {
    setCandidates([cand('0xaaaaaa', 1), cand('0xbbbbbb', 1)]);
    const res = await GET(req('')) as Response;
    const j = await res.json();
    expect(j.results.length).toBe(2);
  });

  it('L6 empty candidate set returns an empty result list (no crash)', async () => {
    setCandidates([]);
    const res = await GET(req('?q=nothingmatches')) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).results).toEqual([]);
  });
});
