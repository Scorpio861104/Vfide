import { NextRequest } from 'next/server';

const RESP: Array<{ rows?: unknown[]; rowCount?: number }> = [];
const CALLS: Array<{ sql: string; params: unknown[] }> = [];
function setResponses(r: Array<{ rows?: unknown[]; rowCount?: number }>) { RESP.length = 0; CALLS.length = 0; RESP.push(...r); }

const MERCHANT = '0x1234567890123456789012345678901234567890';
const LOC = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const SESS = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn(async () => null) }));
jest.mock('@/lib/logger', () => ({ logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));
jest.mock('@/lib/db', () => {
  const consume = (sql: string, params: unknown[]) => {
    (globalThis as unknown as { __pCALLS: typeof CALLS }).__pCALLS?.push({ sql, params });
    const q = (globalThis as unknown as { __pRESP: typeof RESP }).__pRESP;
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
(globalThis as unknown as { __pRESP: typeof RESP }).__pRESP = RESP;
(globalThis as unknown as { __pCALLS: typeof CALLS }).__pCALLS = CALLS;

import { POST as SALE } from '@/app/api/pos/sale/route';
import { POST as REG } from '@/app/api/merchant/registers/route';

const sale = (body: unknown) => SALE(new NextRequest('http://localhost/api/pos/sale', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
}), { address: MERCHANT } as never) as Promise<Response>;
const reg = (body: unknown) => REG(new NextRequest('http://localhost/api/merchant/registers', {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
}), { address: MERCHANT } as never) as Promise<Response>;

describe('Phase 4 · I. POS sale — pricing + inventory (owner, no staff)', () => {
  it('I1 owner cash sale: composes price, decrements location stock, creates order + receipt', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] }, // location ownership
      { rows: [{ id: 1, price: '25', product_type: 'physical', name: 'Widget', inventory_tracking: true }] }, // catalog
      { rows: [] }, // tax rates (none)
      // tx:
      { rows: [{ product_id: 1, quantity: 10 }] }, // location stock FOR UPDATE
      { rows: [{ id: 500 }] }, // insert order
      { rowCount: 1 }, // insert order item
      { rowCount: 1 }, // decrement location inventory
      { rowCount: 1 }, // sold_count
      { rowCount: 1 }, // register movement
    ]);
    const res = await sale({ location_id: LOC, register_session_id: SESS, payment_method: 'cash', tendered: 100, items: [{ product_id: 1, quantity: 2 }] });
    expect(res.status).toBe(201);
    const j = await res.json();
    expect(j.receipt.total).toBe(50); // 2 * 25, no tax
    expect(j.receipt.change).toBe(50); // 100 tendered - 50
    expect(j.payment_status).toBe('paid');
  });

  it('I2 server prices win: client cannot inject a unit_price (schema has none)', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] },
      { rows: [{ id: 1, price: '25', product_type: 'physical', name: 'Widget', inventory_tracking: true }] },
      { rows: [] },
      { rows: [{ product_id: 1, quantity: 10 }] },
      { rows: [{ id: 501 }] }, { rowCount: 1 }, { rowCount: 1 }, { rowCount: 1 },
    ]);
    // attempt to pass unit_price: 0.01 — ignored by schema
    const res = await sale({ location_id: LOC, payment_method: 'cash', tendered: 1000, items: [{ product_id: 1, quantity: 1, unit_price: 0.01 }] });
    expect(res.status).toBe(201);
    expect((await res.json()).receipt.total).toBe(25);
  });

  it('I3 insufficient location stock → 409', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] },
      { rows: [{ id: 1, price: '25', product_type: 'physical', name: 'Widget', inventory_tracking: true }] },
      { rows: [] },
      { rows: [{ product_id: 1, quantity: 1 }] }, // only 1 in stock
    ]);
    const res = await sale({ location_id: LOC, payment_method: 'cash', tendered: 1000, items: [{ product_id: 1, quantity: 5 }] });
    expect(res.status).toBe(409);
  });

  it('I4 insufficient cash tendered → 400', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] },
      { rows: [{ id: 1, price: '25', product_type: 'physical', name: 'Widget', inventory_tracking: true }] },
      { rows: [] },
    ]);
    const res = await sale({ location_id: LOC, payment_method: 'cash', tendered: 10, items: [{ product_id: 1, quantity: 2 }] });
    expect(res.status).toBe(400);
  });

  it('I5 product not owned → 400', async () => {
    setResponses([{ rows: [{ '?column?': 1 }] }, { rows: [] }]); // catalog returns nothing
    const res = await sale({ location_id: LOC, payment_method: 'cash', tendered: 100, items: [{ product_id: 1, quantity: 1 }] });
    expect(res.status).toBe(400);
  });

  it('I6 unknown location → 404', async () => {
    setResponses([{ rows: [] }]); // location ownership fails
    const res = await sale({ location_id: LOC, payment_method: 'cash', tendered: 100, items: [{ product_id: 1, quantity: 1 }] });
    expect(res.status).toBe(404);
  });
});

describe('Phase 4 · J. POS sale — STAFF GATE (gate-ubiquity wiring → Phase 3)', () => {
  const staffRow = (perm: Record<string, unknown>) => ({
    id: 'staff-1', role: 'cashier', permissions: perm, active: true, expires_at: null, merchant_address: MERCHANT,
  });
  it('J1 a cashier within caps can ring a sale (gate allows)', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] }, // location
      { rows: [{ id: 1, price: '25', product_type: 'physical', name: 'W', inventory_tracking: true }] }, // catalog
      { rows: [] }, // tax
      { rows: [staffRow({ processSales: true, maxSaleAmount: 1000, dailySaleLimit: 5000 })] }, // staff
      { rows: [{ total: '0' }] }, // today's total
      // tx
      { rows: [{ product_id: 1, quantity: 10 }] }, { rows: [{ id: 600 }] }, { rowCount: 1 }, { rowCount: 1 }, { rowCount: 1 }, { rowCount: 1 }, // movement
      { rowCount: 1 }, // staff activity log
    ]);
    const res = await sale({ location_id: LOC, register_session_id: SESS, staff_token: 'tok', payment_method: 'cash', tendered: 100, items: [{ product_id: 1, quantity: 2 }] });
    expect(res.status).toBe(201);
  });

  it('J2 a cashier OVER their per-transaction cap is DENIED (the privilege gap, now enforced at POS)', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] },
      { rows: [{ id: 1, price: '5000', product_type: 'physical', name: 'BigItem', inventory_tracking: true }] },
      { rows: [] },
      { rows: [staffRow({ processSales: true, maxSaleAmount: 200, dailySaleLimit: 5000 })] }, // cap 200
      { rows: [{ total: '0' }] },
    ]);
    const res = await sale({ location_id: LOC, staff_token: 'tok', payment_method: 'cash', tendered: 5000, items: [{ product_id: 1, quantity: 1 }] });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('OVER_MAX_SALE');
  });

  it('J3 a cashier exceeding their DAILY limit is denied', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] },
      { rows: [{ id: 1, price: '100', product_type: 'physical', name: 'W', inventory_tracking: true }] },
      { rows: [] },
      { rows: [staffRow({ processSales: true, maxSaleAmount: 1000, dailySaleLimit: 500 })] },
      { rows: [{ total: '450' }] }, // already 450 today; +100 = 550 > 500
    ]);
    const res = await sale({ location_id: LOC, staff_token: 'tok', payment_method: 'cash', tendered: 100, items: [{ product_id: 1, quantity: 1 }] });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('OVER_DAILY_LIMIT');
  });

  it('J4 a cashier without processSales permission is denied', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] },
      { rows: [{ id: 1, price: '10', product_type: 'physical', name: 'W', inventory_tracking: true }] },
      { rows: [] },
      { rows: [staffRow({ processSales: false, maxSaleAmount: 1000, dailySaleLimit: 5000 })] },
      { rows: [{ total: '0' }] },
    ]);
    const res = await sale({ location_id: LOC, staff_token: 'tok', payment_method: 'cash', tendered: 100, items: [{ product_id: 1, quantity: 1 }] });
    expect(res.status).toBe(403);
  });

  it('J5 an unknown / foreign staff token → 404', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] },
      { rows: [{ id: 1, price: '10', product_type: 'physical', name: 'W', inventory_tracking: true }] },
      { rows: [] },
      { rows: [] }, // staff lookup empty
    ]);
    const res = await sale({ location_id: LOC, staff_token: 'bad', payment_method: 'cash', tendered: 100, items: [{ product_id: 1, quantity: 1 }] });
    expect(res.status).toBe(404);
  });
});

describe('Phase 4 · K. Registers', () => {
  it('K1 open a register at a location', async () => {
    setResponses([{ rows: [{ '?column?': 1 }] }, { rows: [] }, { rows: [{ id: SESS }] }]);
    const res = await reg({ action: 'open_register', location_id: LOC, opening_float: 100 });
    expect(res.status).toBe(201);
  });
  it('K2 cannot open a second register at the same location', async () => {
    setResponses([{ rows: [{ '?column?': 1 }] }, { rows: [{ id: SESS }] }]); // existing open
    const res = await reg({ action: 'open_register', location_id: LOC, opening_float: 100 });
    expect(res.status).toBe(409);
  });
  it('K3 close a register reconciles cash (short flagged)', async () => {
    setResponses([
      { rows: [{ id: SESS, status: 'open', opening_float: '100' }] }, // session
      { rows: [{ kind: 'sale_cash', amount: '50' }] }, // movements → expected 150
      { rowCount: 1 }, // update
    ]);
    const res = await reg({ action: 'close_register', session_id: SESS, counted_cash: 120 });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.drawer_status).toBe('short');
    expect(j.variance).toBe(-30);
  });
  it('K4 transfer stock between locations conserves units', async () => {
    setResponses([
      { rows: [{ '?column?': 1 }] }, { rows: [{ '?column?': 1 }] }, // both locations owned
      { rows: [{ quantity: 10 }] }, // from FOR UPDATE
      { rows: [{ quantity: 2 }] },  // to FOR UPDATE
      { rowCount: 1 }, { rowCount: 1 }, // two upserts
    ]);
    const res = await reg({ action: 'transfer_stock', product_id: 1, from_location_id: LOC, to_location_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', quantity: 3 });
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.from_after).toBe(7);
    expect(j.to_after).toBe(5);
  });
  it('K5 transfer to the same location → 400', async () => {
    setResponses([]);
    const res = await reg({ action: 'transfer_stock', product_id: 1, from_location_id: LOC, to_location_id: LOC, quantity: 3 });
    expect(res.status).toBe(400);
  });
});
