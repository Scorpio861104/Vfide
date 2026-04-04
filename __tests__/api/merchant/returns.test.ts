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
    query.mockResolvedValueOnce({
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
    query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

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
