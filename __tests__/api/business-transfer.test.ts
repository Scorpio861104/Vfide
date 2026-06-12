/**
 * API-handler tests for the merchant business-transfer route (Priority 7 — runtime verification).
 *
 * These exercise the actual route handler logic — the succession state machine, authorization gates,
 * and the emergency veto window — with the DB/auth/events layers mocked. This is a step up from
 * pure-function unit tests: it verifies the request → handler → response path and the state
 * transitions, which previously had ZERO co-located tests. It still does NOT prove behavior against a
 * live Postgres (that remains a launch gate), but it removes the "the route logic is unverified"
 * unknown.
 */

import { NextRequest } from 'next/server';

const OWNER = '0x1111111111111111111111111111111111111111';
const SUCCESSOR = '0x2222222222222222222222222222222222222222';
const OPERATOR = '0x3333333333333333333333333333333333333333';

// Mutable auth identity the mocked withAuth will inject.
let CURRENT_USER = OWNER;

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/events/serverEmit', () => ({ emitServerEvent: jest.fn(async () => undefined) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));
jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (req: unknown, user: { address: string }) => unknown) => async (req: unknown) =>
    handler(req, { sub: 'test', address: CURRENT_USER }),
}));

// Controllable db mock.
const dbState = {
  successor: SUCCESSOR as string | null,
  operators: [] as string[],
  transfer: null as Record<string, unknown> | null,
};
const queryMock = jest.fn(async (sql: string, params: unknown[]) => {
  const s = sql.replace(/\s+/g, ' ');
  if (s.includes('FROM merchant_succession')) {
    return { rows: dbState.successor ? [{ successor_address: dbState.successor }] : [] };
  }
  if (s.includes('FROM merchant_operators')) {
    const addr = String(params[1]).toLowerCase();
    return { rows: [{ c: String(dbState.operators.includes(addr) ? 1 : 0) }] };
  }
  if (s.startsWith('INSERT INTO merchant_business_transfers')) {
    // kind & status are inline string literals in the SQL (not params); parse them robustly.
    const kindM = s.match(/'(voluntary|emergency)'/);
    const statusM = s.match(/'(initiated|veto_window)'/);
    const hasVeto = s.includes('veto_until');
    dbState.transfer = {
      id: '11111111-1111-4111-8111-111111111111', from_address: String(params[0]), to_address: String(params[1]),
      kind: kindM ? kindM[1] : 'voluntary', status: statusM ? statusM[1] : 'initiated',
      veto_until: hasVeto ? String(params[2]) : null,
    };
    return { rows: [dbState.transfer] };
  }
  if (s.startsWith('SELECT * FROM merchant_business_transfers WHERE id')) {
    return { rows: dbState.transfer ? [dbState.transfer] : [] };
  }
  if (s.startsWith('UPDATE merchant_business_transfers')) {
    if (dbState.transfer) {
      const m = s.match(/SET status = '([a-z_]+)'/);
      if (m) dbState.transfer.status = m[1];
    }
    return { rows: dbState.transfer ? [dbState.transfer] : [] };
  }
  return { rows: [] };
});
const clientMock = {
  query: jest.fn(async (sql: string) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return { rowCount: 0 };
    return { rowCount: 1 };
  }),
  release: jest.fn(),
};
jest.mock('@/lib/db', () => ({
  query: (...a: unknown[]) => queryMock(...(a as [string, unknown[]])),
  getClient: jest.fn(async () => clientMock),
}));

// Import AFTER mocks.
import { POST } from '@/app/api/merchant/business-transfer/route';

function post(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/merchant/business-transfer', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
}

beforeEach(() => {
  CURRENT_USER = OWNER;
  dbState.successor = SUCCESSOR;
  dbState.operators = [];
  dbState.transfer = null;
  queryMock.mockClear();
});

describe('business-transfer route — voluntary succession flow', () => {
  it('owner initiates → status initiated, to the designated successor', async () => {
    const res = await POST(post({ action: 'initiate' }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.transfer.to_address).toBe(SUCCESSOR);
    expect(json.transfer.status).toBe('initiated');
  });

  it('rejects initiate when no successor is designated', async () => {
    dbState.successor = null;
    const res = await POST(post({ action: 'initiate' }));
    expect(res.status).toBe(400);
  });

  it('only the successor may accept (owner cannot)', async () => {
    await POST(post({ action: 'initiate' }));
    // Owner tries to accept → forbidden.
    const denied = await POST(post({ action: 'accept', id: '11111111-1111-4111-8111-111111111111' }));
    expect(denied.status).toBe(403);
    // Successor accepts → ok.
    CURRENT_USER = SUCCESSOR;
    const ok = await POST(post({ action: 'accept', id: '11111111-1111-4111-8111-111111111111' }));
    expect(ok.status).toBe(200);
  });

  it('cannot execute before acceptance; executes after acceptance', async () => {
    await POST(post({ action: 'initiate' }));
    const tooEarly = await POST(post({ action: 'execute', id: '11111111-1111-4111-8111-111111111111' }));
    expect(tooEarly.status).toBe(409);
    CURRENT_USER = SUCCESSOR;
    await POST(post({ action: 'accept', id: '11111111-1111-4111-8111-111111111111' }));
    const exec = await POST(post({ action: 'execute', id: '11111111-1111-4111-8111-111111111111' }));
    expect(exec.status).toBe(200);
    // The reassign ran inside a transaction.
    expect(clientMock.query).toHaveBeenCalledWith('BEGIN');
    expect(clientMock.query).toHaveBeenCalledWith('COMMIT');
  });
});

describe('business-transfer route — emergency flow with owner veto', () => {
  it('a stranger cannot request an emergency transfer', async () => {
    CURRENT_USER = '0x9999999999999999999999999999999999999999';
    const res = await POST(post({ action: 'emergency_request', merchant_address: OWNER }));
    expect(res.status).toBe(403);
  });

  it('a configured operator can request; sets a veto window; owner can veto', async () => {
    dbState.operators = [OPERATOR];
    CURRENT_USER = OPERATOR;
    const req = await POST(post({ action: 'emergency_request', merchant_address: OWNER }));
    expect(req.status).toBe(201);
    const json = await req.json();
    expect(json.transfer.kind).toBe('emergency');
    expect(json.transfer.status).toBe('veto_window');
    expect(json.transfer.veto_until).toBeTruthy();

    // Owner vetoes.
    CURRENT_USER = OWNER;
    const veto = await POST(post({ action: 'veto', id: '11111111-1111-4111-8111-111111111111' }));
    expect(veto.status).toBe(200);
    expect(dbState.transfer?.status).toBe('vetoed');
  });

  it('cannot execute an emergency transfer before the veto window elapses', async () => {
    dbState.operators = [OPERATOR];
    CURRENT_USER = OPERATOR;
    await POST(post({ action: 'emergency_request', merchant_address: OWNER }));
    // The successor (a party to the transfer) tries to execute early → blocked by the veto window.
    CURRENT_USER = SUCCESSOR;
    // veto_until is 7 days out → execute should be blocked.
    const exec = await POST(post({ action: 'execute', id: '11111111-1111-4111-8111-111111111111' }));
    expect(exec.status).toBe(409);
  });
});
