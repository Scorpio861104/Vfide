/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH } from '../../../app/api/merchant/customers/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/merchant/customers', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';
  const customer = '0x2222222222222222222222222222222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: merchant } });
  });

  it('lists aggregated customers for the merchant', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            customer_address: customer,
            customer_name: 'Ada',
            order_count: '3',
            total_spent: '120.50',
            last_visit: '2026-04-04T00:00:00.000Z',
            first_visit: '2026-03-01T00:00:00.000Z',
            favorite_product: 'Kente Wrap',
            notes: 'VIP regular',
            tags: ['vip'],
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ total: '1' }] });

    const request = new NextRequest('http://localhost:3000/api/merchant/customers');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.customers).toHaveLength(1);
    expect(data.customers[0].walletAddress).toBe(customer);
    expect(data.customers[0].favoriteProduct).toBe('Kente Wrap');
  });

  it('upserts customer notes and tags', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          merchant_address: merchant,
          customer_address: customer,
          notes: 'Prefers blue fabrics',
          tags: ['vip', 'wholesale'],
          updated_at: '2026-04-04T00:00:00.000Z',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/customers', {
      method: 'PATCH',
      body: JSON.stringify({
        customerAddress: customer,
        notes: 'Prefers blue fabrics',
        tags: ['vip', 'wholesale'],
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.note.tags).toEqual(['vip', 'wholesale']);
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'rate limit' }, { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/api/merchant/customers');
    const response = await GET(request);
    expect(response.status).toBe(429);
  });
});
