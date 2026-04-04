/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH, POST } from '../../../app/api/merchant/installments/route';

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

describe('/api/merchant/installments', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, requireOwnership } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';
  const customer = '0x2222222222222222222222222222222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: customer } });
    requireOwnership.mockResolvedValue({ user: { address: merchant } });
  });

  it('lists installment plans for a merchant', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'plan_1', order_id: 'ord-1', total_amount: '90.00', paid_count: 1 }],
    });

    const request = new NextRequest(`http://localhost:3000/api/merchant/installments?merchant=${merchant}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.plans).toHaveLength(1);
  });

  it('creates a new installment plan', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'plan_2', order_id: 'ord-2', total_amount: '120.00', installment_count: 3 }],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/installments', {
      method: 'POST',
      body: JSON.stringify({
        merchantAddress: merchant,
        customerAddress: customer,
        orderId: 'ord-2',
        totalAmount: 120,
        installmentCount: 3,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.plan.order_id).toBe('ord-2');
  });

  it('records a payment against a plan', async () => {
    query
      .mockResolvedValueOnce({ rowCount: 1, rows: [] })
      .mockResolvedValueOnce({ rows: [{ paid_count: 1, installment_count: 3, interval_days: 30 }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const request = new NextRequest('http://localhost:3000/api/merchant/installments', {
      method: 'PATCH',
      body: JSON.stringify({ planId: 'plan_2', amount: 40 }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.paidCount).toBe(2);
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(NextResponse.json({ error: 'rate limit' }, { status: 429 }));

    const request = new NextRequest(`http://localhost:3000/api/merchant/installments?merchant=${merchant}`);
    const response = await GET(request);

    expect(response.status).toBe(429);
  });
});
