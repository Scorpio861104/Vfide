import { NextRequest } from 'next/server';

const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
const CALLS: Array<{ sql: string; params: unknown[] }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; CALLS.length = 0; RESP.push(...r); }

const PROVIDER = '0x1111111111111111111111111111111111111111';
const CLIENT = '0x2222222222222222222222222222222222222222';

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/events/serverEmit', () => ({ emitServerEvent: jest.fn(async () => undefined) }));
jest.mock('@/lib/db', () => {
  const consume = (sql: string, params: unknown[]) => {
    (globalThis as unknown as { __mCALLS: typeof CALLS }).__mCALLS?.push({ sql, params });
    const q = (globalThis as unknown as { __mRESP: typeof RESP }).__mRESP;
    const r = q && q.length ? q.shift()! : { rows: [] };
    return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0) };
  };
  return {
    query: jest.fn(async (sql: string, params: unknown[]) => consume(sql, params)),
    getClient: jest.fn(async () => ({
      query: async (sql: string, params: unknown[]) => {
        if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*$/i.test(sql)) return { rows: [], rowCount: 0 };
        return consume(sql, params);
      },
      release: () => {},
    })),
  };
});
(globalThis as unknown as { __mRESP: typeof RESP }).__mRESP = RESP;
(globalThis as unknown as { __mCALLS: typeof CALLS }).__mCALLS = CALLS;

import { POST } from '@/app/api/merchant/milestones/route';
import { POST as KEEPER } from '@/app/api/merchant/milestones/auto-release/route';

const post = (body: unknown, addr: string) => POST(new NextRequest('http://localhost/api/merchant/milestones', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
}), { address: addr } as never) as Promise<Response>;

// milestone row joined with engagement parties
const mrow = (o: Record<string, unknown> = {}) => ({
  id: 'm1', engagement_id: 'e1', status: 'funded', escrow_id: 5, acceptance_deadline: null,
  provider_address: PROVIDER, client_address: CLIENT, acceptance_window_secs: 604800, ...o,
});

describe('Phase 2 · I. link_escrow (client funds)', () => {
  it('I1 client links an escrow to a defined milestone', async () => {
    setResponses([{ rows: [mrow({ status: 'defined', escrow_id: null })] }, { rowCount: 1 }]);
    const res = await post({ action: 'link_escrow', milestone_id: 'm1', escrow_id: 5 }, CLIENT);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('funded');
  });
  it('I2 provider cannot fund (only client)', async () => {
    setResponses([{ rows: [mrow({ status: 'defined', escrow_id: null })] }]);
    const res = await post({ action: 'link_escrow', milestone_id: 'm1', escrow_id: 5 }, PROVIDER);
    expect(res.status).toBe(403);
  });
  it('I3 cannot double-fund', async () => {
    setResponses([{ rows: [mrow({ status: 'defined', escrow_id: 9 })] }]);
    const res = await post({ action: 'link_escrow', milestone_id: 'm1', escrow_id: 5 }, CLIENT);
    expect(res.status).toBe(409);
  });
});

describe('Phase 2 · J. deliver (provider submits)', () => {
  it('J1 provider submits a deliverable → submitted + acceptance_deadline', async () => {
    setResponses([
      { rows: [mrow({ status: 'funded', escrow_id: 5 })] }, // load
      { rows: [{ v: 1 }] }, // version (tx)
      { rowCount: 1 }, // insert deliverable (tx)
      { rowCount: 1 }, // update milestone (tx)
    ]);
    const res = await post({ action: 'deliver', milestone_id: 'm1', content_hash: '0x' + 'a'.repeat(64), note: 'v1' }, PROVIDER);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.status).toBe('submitted');
    expect(j.acceptance_deadline).toBeTruthy();
  });
  it('J2 client cannot submit', async () => {
    setResponses([{ rows: [mrow({ status: 'funded' })] }]);
    const res = await post({ action: 'deliver', milestone_id: 'm1' }, CLIENT);
    expect(res.status).toBe(403);
  });
  it('J3 cannot submit an unfunded milestone', async () => {
    setResponses([{ rows: [mrow({ status: 'defined', escrow_id: null })] }]);
    const res = await post({ action: 'deliver', milestone_id: 'm1' }, PROVIDER);
    expect(res.status).toBe(409);
  });
});

describe('Phase 2 · K. accept / reject (client decision)', () => {
  it('K1 client accepts → accepted + release action', async () => {
    setResponses([{ rows: [mrow({ status: 'submitted', escrow_id: 5 })] }, { rowCount: 1 }]);
    const res = await post({ action: 'accept', milestone_id: 'm1' }, CLIENT);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.status).toBe('accepted');
    expect(j.escrow_action).toBe('release');
  });
  it('K2 client rejects with reason → in_dispute + dispute action', async () => {
    setResponses([{ rows: [mrow({ status: 'submitted', escrow_id: 5 })] }, { rowCount: 1 }, { rowCount: 1 }]);
    const res = await post({ action: 'reject', milestone_id: 'm1', reason: 'incomplete' }, CLIENT);
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.status).toBe('in_dispute');
    expect(j.escrow_action).toBe('dispute');
  });
  it('K3 provider cannot accept', async () => {
    setResponses([{ rows: [mrow({ status: 'submitted' })] }]);
    const res = await post({ action: 'accept', milestone_id: 'm1' }, PROVIDER);
    expect(res.status).toBe(403);
  });
  it('K4 reject without reason → 400 (schema)', async () => {
    setResponses([{ rows: [mrow({ status: 'submitted' })] }]);
    const res = await post({ action: 'reject', milestone_id: 'm1', reason: '' }, CLIENT);
    expect(res.status).toBe(400);
  });
  it('K5 cannot accept a non-submitted milestone', async () => {
    setResponses([{ rows: [mrow({ status: 'funded', escrow_id: 5 })] }]);
    const res = await post({ action: 'accept', milestone_id: 'm1' }, CLIENT);
    expect(res.status).toBe(409);
  });
});

describe('Phase 2 · L. confirm_release', () => {
  it('L1 records on-chain release (accepted→released) + completes engagement', async () => {
    setResponses([
      { rows: [mrow({ status: 'accepted', escrow_id: 5 })] }, // load
      { rowCount: 1 }, // update milestone → released
      { rows: [{ status: 'released' }] }, // engagement statuses for completion check
      { rowCount: 1 }, // complete engagement
    ]);
    const res = await post({ action: 'confirm_release', milestone_id: 'm1' }, PROVIDER);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe('released');
  });
  it('L2 cannot confirm release before acceptance', async () => {
    setResponses([{ rows: [mrow({ status: 'submitted', escrow_id: 5 })] }]);
    const res = await post({ action: 'confirm_release', milestone_id: 'm1' }, PROVIDER);
    expect(res.status).toBe(409);
  });
});

describe('Phase 2 · M. milestone not found / forbidden', () => {
  it('M1 unknown milestone → 404', async () => {
    setResponses([{ rows: [] }]);
    const res = await post({ action: 'accept', milestone_id: 'nope' }, CLIENT);
    expect(res.status).toBe(404);
  });
  it('M2 a stranger (neither party) → 403', async () => {
    setResponses([{ rows: [mrow({ status: 'submitted' })] }]);
    const res = await post({ action: 'accept', milestone_id: 'm1' }, '0x9999999999999999999999999999999999999999');
    expect(res.status).toBe(403);
  });
});

describe('Phase 2 · N. auto-release keeper (silence = acceptance)', () => {
  const OLD = process.env.CRON_SECRET;
  beforeAll(() => { process.env.CRON_SECRET = 'keeper-secret'; });
  afterAll(() => { process.env.CRON_SECRET = OLD; });

  const keeperReq = (secret?: string) => new NextRequest('http://localhost/api/merchant/milestones/auto-release', {
    method: 'POST', headers: secret ? { 'x-cron-secret': secret } : {},
  });

  it('N1 without the secret → 401', async () => {
    setResponses([]);
    const res = await KEEPER(keeperReq()) as Response;
    expect(res.status).toBe(401);
  });
  it('N2 sweeps an elapsed submitted milestone → auto-accepted', async () => {
    setResponses([
      { rows: [{ id: 'm1', engagement_id: 'e1', status: 'submitted', escrow_id: 5, acceptance_deadline: '2000-01-01T00:00:00Z', provider_address: PROVIDER, client_address: CLIENT }] }, // due
      { rowCount: 1 }, // update → accepted
    ]);
    const res = await KEEPER(keeperReq('keeper-secret')) as Response;
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.auto_accepted).toBe(1);
    expect(j.release_due_escrow_ids).toContain(5);
  });
  it('N3 no due milestones → zero auto-accepted', async () => {
    setResponses([{ rows: [] }]);
    const res = await KEEPER(keeperReq('keeper-secret')) as Response;
    expect(res.status).toBe(200);
    expect((await res.json()).auto_accepted).toBe(0);
  });
});
