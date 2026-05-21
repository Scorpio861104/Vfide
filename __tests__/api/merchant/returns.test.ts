/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH, POST } from '../../../app/api/merchant/returns/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  requireOwnership: jest.fn(),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
  isAdmin: jest.fn(() => false),
  verifyOnChainAdmin: jest.fn(async () => false),
  checkOwnership: jest.fn(() => true),
  withAuth: jest.fn((handler: any) => async (req: any, ctx?: any) => {
    // V3: consult requireAuth (sync or async) so tests that set its return value flow through.
    const m = (jest.requireMock('@/lib/auth/middleware') as any);
    let user: any = { sub: 'test', address: '0x0000000000000000000000000000000000000000' };
    try {
      const r0 = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;
      const r = (r0 && typeof (r0 as any).then === 'function') ? await r0 : r0;
      if (r && typeof r.status === 'number' && typeof r.json === 'function') return r;
      if (r && r.user) user = r.user;
    } catch { /* ignore */ }
    return handler(req, user, ctx);
  }),
  withOwnership: jest.fn((extractor: any, handler: any) => async (req: any, ctx?: any) => {
    // V3: extract target address from request and use it as auth user, bubble up
    // requireAuth Response if set.
    const m = (jest.requireMock('@/lib/auth/middleware') as any);
    let user: any = { sub: 'test', address: '0x0000000000000000000000000000000000000000' };
    try {
      const r0 = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;
      const r = (r0 && typeof (r0 as any).then === 'function') ? await r0 : r0;
      if (r && typeof r.status === 'number' && typeof r.json === 'function') return r;
      if (r && r.user) user = r.user;
      else {
        const target = await extractor(req, ctx);
        if (typeof target === 'string' && target) {
          const addr = target.toLowerCase();
          user = { sub: addr, address: addr };
        }
      }
    } catch { /* ignore */ }
    return handler(req, user, ctx);
  }),
}));

describe('/api/merchant/returns', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, requireOwnership } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: merchant } });
    requireOwnership.mockResolvedValue({ user: { address: merchant } });
  });

  it('lists return requests for a merchant', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'ret_1', order_id: 'order-1', status: 'requested' }],
    });

    const request = new NextRequest(`http://localhost:3000/api/merchant/returns?merchant=${merchant}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.returns).toHaveLength(1);
  });

  it('creates a return request', async () => {
    // Route now performs (1) order ownership check, (2) item validation,
    // (3) the INSERT. Mock all three calls in order. The auth user (= merchant
    // in this fixture) is also the order's customer_address since the V3
    // withAuth mock and requireAuth share the same address.
    query
      .mockResolvedValueOnce({ rows: [{ customer_address: merchant }] }) // order ownership lookup
      .mockResolvedValueOnce({ rows: [] }) // order item product_id lookup (empty allowed)
      .mockResolvedValueOnce({
        rows: [{ id: 'ret_2', order_id: 'order-2', status: 'requested' }],
      });

    const request = new NextRequest('http://localhost:3000/api/merchant/returns', {
      method: 'POST',
      body: JSON.stringify({
        merchantAddress: merchant,
        orderId: 'order-2',
        type: 'refund',
        items: [{ quantity: 1, reason: 'Damaged' }],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.return.order_id).toBe('order-2');
  });

  it('updates a return request status', async () => {
    // Route now does (1) state-machine SELECT, (2) UPDATE. Mock both. The
    // current status must legally transition to 'approved' — only 'pending'
    // -> 'approved' is allowed by the state map.
    query
      .mockResolvedValueOnce({ rows: [{ status: 'pending', items: [] }] }) // state SELECT
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // UPDATE

    const request = new NextRequest('http://localhost:3000/api/merchant/returns', {
      method: 'PATCH',
      body: JSON.stringify({ returnId: 'ret_2', merchantAddress: merchant, status: 'approved' }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(NextResponse.json({ error: 'rate limit' }, { status: 429 }));

    const request = new NextRequest(`http://localhost:3000/api/merchant/returns?merchant=${merchant}`);
    const response = await GET(request);

    expect(response.status).toBe(429);
  });
});
