import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH } from '../../../app/api/merchant/training/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: (request: NextRequest, user: { address: string }) => Promise<NextResponse>) => {
    return async (request: NextRequest) => {
      const { requireAuth } = require('@/lib/auth/middleware');
      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) {
        return authResult;
      }
      return handler(request, authResult.user);
    };
  },
  requireAuth: jest.fn(),
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
  isAdmin: jest.fn(() => false),
  verifyOnChainAdmin: jest.fn(async () => false),
  checkOwnership: jest.fn(() => true),
  withOwnership: jest.fn((_extractor: any, handler: any) => async (req: any, ctx?: any) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/merchant/training', () => {
  const { requireAuth } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { query } = require('@/lib/db');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: merchant } });
    query.mockReset();
  });

  it('returns default progress when no saved record exists', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost:3000/api/merchant/training');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.progress).toEqual({ completed_modules: [], quick_step: 0, updated_at: null });
  });

  it('returns saved progress when present', async () => {
    query.mockResolvedValueOnce({
      rows: [{ completed_modules: ['setup', 'sales'], quick_step: 2, updated_at: '2026-05-05T00:00:00.000Z' }],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/training');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.progress.completed_modules).toEqual(['setup', 'sales']);
    expect(data.progress.quick_step).toBe(2);
  });

  it('upserts training progress on PATCH', async () => {
    query.mockResolvedValueOnce({
      rows: [{ completed_modules: ['setup'], quick_step: 1, updated_at: '2026-05-05T00:00:00.000Z' }],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/training', {
      method: 'PATCH',
      body: JSON.stringify({ completed_modules: ['setup'], quick_step: 1 }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.progress.completed_modules).toEqual(['setup']);
    expect(data.progress.quick_step).toBe(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO merchant_training_progress'),
      [merchant, JSON.stringify(['setup']), 1]
    );
  });

  it('rejects invalid PATCH payloads', async () => {
    const request = new NextRequest('http://localhost:3000/api/merchant/training', {
      method: 'PATCH',
      body: JSON.stringify({ completed_modules: [123], quick_step: -1 }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
});
