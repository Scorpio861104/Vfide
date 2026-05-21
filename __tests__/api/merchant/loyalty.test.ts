/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH } from '../../../app/api/merchant/loyalty/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
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

describe('/api/merchant/loyalty', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: merchant } });
  });

  it('returns the merchant loyalty program and top members', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            merchant_address: merchant,
            name: 'Coffee Club',
            type: 'stamp',
            stamps_required: 10,
            points_per_unit: 1,
            reward_description: 'Free coffee',
            reward_type: 'free_item',
            reward_value: '1',
            active: true,
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            customer_address: '0x2222222222222222222222222222222222222222',
            stamps: 4,
            rewards_earned: 0,
            rewards_redeemed: 0,
            updated_at: '2026-04-04T00:00:00.000Z',
          },
        ],
      });

    const request = new NextRequest('http://localhost:3000/api/merchant/loyalty');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.program.name).toBe('Coffee Club');
    expect(data.members).toHaveLength(1);
  });

  it('upserts the merchant loyalty program', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          merchant_address: merchant,
          name: 'Coffee Club',
          type: 'stamp',
          stamps_required: 10,
          points_per_unit: 1,
          reward_description: 'Free coffee',
          reward_type: 'free_item',
          reward_value: '1',
          active: true,
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/loyalty', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Coffee Club',
        type: 'stamp',
        stampsRequired: 10,
        rewardDescription: 'Free coffee',
        rewardType: 'free_item',
        rewardValue: 1,
        active: true,
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.program.active).toBe(true);
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'rate limit' }, { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/api/merchant/loyalty');
    const response = await GET(request);
    expect(response.status).toBe(429);
  });
});
