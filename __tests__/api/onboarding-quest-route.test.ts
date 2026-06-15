import { NextRequest } from 'next/server';

const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; RESP.push(...r); }

const ME = '0x1111111111111111111111111111111111111111';
const OTHER = '0x2222222222222222222222222222222222222222';

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (h: (req: NextRequest, user: { address: string }) => unknown) => (req: NextRequest) => h(req, { address: (globalThis as unknown as { __ME: string }).__ME }),
  isAdmin: () => false,
}));
jest.mock('@/lib/db', () => {
  const consume = () => {
    const q = (globalThis as unknown as { __RESP: typeof RESP }).__RESP;
    const r = q && q.length ? q.shift()! : { rows: [] };
    return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
  };
  return {
    query: jest.fn(async () => consume()),
    getClient: jest.fn(async () => ({
      query: async (sql: string) => { if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*$/i.test(sql)) return { rows: [], rowCount: 0 }; return consume(); },
      release: () => {},
    })),
  };
});
(globalThis as unknown as { __RESP: typeof RESP }).__RESP = RESP;
(globalThis as unknown as { __ME: string }).__ME = ME;

import { PATCH } from '@/app/api/quests/onboarding/route';

const patch = (body: unknown) => PATCH(new NextRequest('http://localhost/api/quests/onboarding', {
  method: 'PATCH', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
})) as Promise<Response>;

describe('Onboarding · H. Quest route — Finding B FIXED: steps are verified, not self-asserted', () => {
  it('H1 marking firstTransaction is REFUSED (422) when there is no confirmed tx (farm blocked)', async () => {
    setResponses([
      { rows: [{ id: 'u1' }] },         // user lookup
      { rows: [{ ok: false }] },        // evidence query: no confirmed transaction
    ]);
    const res = await patch({ step: 'firstTransaction', userAddress: ME });
    expect(res.status).toBe(422); // was 200 (self-asserted) before the fix
    expect((await res.json()).reason).toMatch(/transaction/i);
  });

  it('H2 firstTransaction SUCCEEDS (200) when a confirmed tx exists (legitimate user not blocked)', async () => {
    setResponses([
      { rows: [{ id: 'u1' }] },         // user lookup
      { rows: [{ ok: true }] },         // evidence query: confirmed tx found
      { rowCount: 1 },                  // step update
      { rows: [{ all_complete: false }] },
    ]);
    const res = await patch({ step: 'firstTransaction', userAddress: ME });
    expect(res.status).toBe(200);
  });

  it('H3 depositVault is NOT self-assertable — it now routes through on-chain attestation', async () => {
    // Finding B follow-up: attested steps are no longer a flat 422. They go through attestOnchainStep, which
    // reads the chain. In this test env the chain is unreadable (no RPC), so the result is a RETRYABLE 503 —
    // not a 200. The user still cannot self-assert the step; a real depositor would be confirmed by the read.
    setResponses([{ rows: [{ id: 'u1' }] }]); // user lookup; no DB evidence query for attested steps
    const res = await patch({ step: 'depositVault', userAddress: ME });
    expect(res.status).toBe(503); // chain unreadable → retryable, never a false 200
    const body = await res.json();
    expect(body.retryable).toBe(true);
    expect(body.reason).toMatch(/on-chain|try again|not configured/i);
  });

  it('H4 voteProposal is NOT self-assertable — routes through on-chain attestation (retryable when chain down)', async () => {
    setResponses([{ rows: [{ id: 'u1' }] }]);
    const res = await patch({ step: 'voteProposal', userAddress: ME });
    expect(res.status).toBe(503);          // not a 200; attestation gate engaged
    expect((await res.json()).retryable).toBe(true);
  });

  it('H5 connectWallet is self-evident for an authenticated user (200)', async () => {
    setResponses([
      { rows: [{ id: 'u1' }] },         // user lookup
      { rowCount: 1 },                  // step update (self-evident, no evidence query)
      { rows: [{ all_complete: false }] },
    ]);
    const res = await patch({ step: 'connectWallet', userAddress: ME });
    expect(res.status).toBe(200);
  });

  it('H6 a DB step with evidence flips completion only when genuinely all-complete', async () => {
    setResponses([
      { rows: [{ id: 'u1' }] },         // user lookup
      { rows: [{ ok: true }] },         // evidence: endorsement given
      { rowCount: 1 },                  // step update
      { rows: [{ all_complete: true }] }, // genuinely all complete
      { rowCount: 1 },                  // mark onboarding_completed
      { rowCount: 1 },                  // notification insert
    ]);
    const res = await patch({ step: 'giveEndorsement', userAddress: ME });
    expect(res.status).toBe(200);
    expect((await res.json()).allComplete).toBe(true);
  });

  it('H7 authorization is still enforced: cannot update another account onboarding', async () => {
    setResponses([]); // should never reach DB
    const res = await patch({ step: 'addFriend', userAddress: OTHER });
    expect(res.status).toBe(403);
  });

  it('H8 an invalid step name is rejected (400)', async () => {
    const res = await patch({ step: 'totallyMadeUpStep', userAddress: ME });
    expect(res.status).toBe(400);
  });

  it('H9 a malformed address is rejected (400)', async () => {
    const res = await patch({ step: 'connectWallet', userAddress: 'not-an-address' });
    expect(res.status).toBe(400);
  });
});
