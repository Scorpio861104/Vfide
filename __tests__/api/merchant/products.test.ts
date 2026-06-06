import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/merchant/products/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: jest.fn((handler: any) => async (request: any, context?: any) => {
    return handler(request, { address: '0x1111111111111111111111111111111111111111', sub: 'test' }, context);
  }),
}));

describe('/api/merchant/products public reads', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { withAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
  });

  it('does not wrap GET with authentication', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [{ min_price: null, max_price: null }] });

    const response = await GET(new NextRequest('http://localhost:3000/api/merchant/products?q=&status=active'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.products).toEqual([]);
    expect(withAuth).not.toHaveBeenCalledWith(GET);
  });

  it('degrades public GET to an empty catalog when DATABASE_URL is missing', async () => {
    query.mockRejectedValue(new Error('DATABASE_URL is required. Set ALLOW_DEV_DB=true in development to use the local fallback.'));

    const response = await GET(new NextRequest('http://localhost:3000/api/merchant/products?q=&status=active&limit=12'));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      products: [],
      pagination: { page: 1, limit: 12, total: 0, pages: 0 },
      degraded: true,
      reason: 'database_unavailable',
    });
  });

  it('keeps mutation handlers authenticated', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Test Product', merchant_address: '0x1111111111111111111111111111111111111111' }] });

    const response = await POST(new NextRequest('http://localhost:3000/api/merchant/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Product',
        price: 10,
        product_type: 'physical',
        status: 'active',
      }),
    }));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.product).toMatchObject({ id: 1, name: 'Test Product' });
    expect(query.mock.calls[0][1]).toEqual(['0x1111111111111111111111111111111111111111']);
    expect(query.mock.calls[1][1][0]).toBe('0x1111111111111111111111111111111111111111');
  });
});
