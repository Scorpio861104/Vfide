/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH, POST } from '../../../app/api/merchant/suppliers/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireOwnership: jest.fn(),
}));

describe('/api/merchant/suppliers', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireOwnership } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireOwnership.mockResolvedValue({ user: { address: merchant } });
  });

  it('lists suppliers and purchase orders', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 'sup_1', supplier_name: 'Fresh Farms' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'po_1', supplier_name: 'Fresh Farms', status: 'sent' }] });

    const request = new NextRequest(`http://localhost:3000/api/merchant/suppliers?merchant=${merchant}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.suppliers).toHaveLength(1);
    expect(data.purchaseOrders).toHaveLength(1);
  });

  it('creates a supplier record', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'sup_2', supplier_name: 'Bulk Foods' }] });

    const request = new NextRequest('http://localhost:3000/api/merchant/suppliers', {
      method: 'POST',
      body: JSON.stringify({ merchantAddress: merchant, supplierName: 'Bulk Foods' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.supplier.supplier_name).toBe('Bulk Foods');
  });

  it('updates purchase order status', async () => {
    query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const request = new NextRequest('http://localhost:3000/api/merchant/suppliers', {
      method: 'PATCH',
      body: JSON.stringify({ merchantAddress: merchant, purchaseOrderId: 'po_1', status: 'delivered' }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(NextResponse.json({ error: 'rate limit' }, { status: 429 }));

    const request = new NextRequest(`http://localhost:3000/api/merchant/suppliers?merchant=${merchant}`);
    const response = await GET(request);

    expect(response.status).toBe(429);
  });
});
