/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { DELETE, GET, POST } from '../../../app/api/remittance/beneficiaries/route';

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

describe('/api/remittance/beneficiaries', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const owner = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: owner } });
  });

  it('returns saved beneficiaries for the authenticated user', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 5,
          owner_address: owner,
          name: 'Amina',
          phone: '+254700123456',
          network: 'mpesa',
          country: 'KE',
          relationship: 'parent',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.beneficiaries).toHaveLength(1);
  });

  it('creates a beneficiary record', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 7,
          owner_address: owner,
          name: 'Kwame',
          phone: '+233555000111',
          network: 'mtn_momo',
          country: 'GH',
          relationship: 'sibling',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Kwame',
        phone: '+233555000111',
        network: 'mtn_momo',
        country: 'GH',
        relationship: 'sibling',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.beneficiary.id).toBe(7);
  });

  it('returns 400 when the beneficiary payload is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries', {
      method: 'POST',
      body: JSON.stringify({
        name: '',
        phone: '',
        network: 'invalid',
        country: 'KEN',
        relationship: '',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('deletes a beneficiary owned by the authenticated user', async () => {
    query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries?id=7', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns the limiter response when rate limited', async () => {
    withRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'rate limit' }, { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries');
    const response = await GET(request);
    expect(response.status).toBe(429);
  });
});
