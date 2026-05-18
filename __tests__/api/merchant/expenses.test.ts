/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { DELETE, GET, PATCH, POST } from '../../../app/api/merchant/expenses/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/merchant/expenses', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: merchant } });
  });

  it('returns expenses with revenue and profit summary', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            merchant_address: merchant,
            amount: '45.50',
            currency: 'USD',
            category: 'supplies',
            description: 'Milk and cups',
            receipt_image_url: null,
            expense_date: '2026-04-04',
            created_at: '2026-04-04T09:00:00.000Z',
            updated_at: '2026-04-04T09:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { category: 'supplies', total_amount: '45.50' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { revenue: '2500.00', order_count: '18' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { date: '2026-04-04', amount: '2500.00' },
        ],
      });

    const request = new NextRequest('http://localhost:3000/api/merchant/expenses');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.expenses).toHaveLength(1);
    expect(data.summary.revenue).toBe(2500);
    expect(data.summary.expenses).toBe(45.5);
    expect(data.summary.netProfit).toBe(2454.5);
    expect(data.summary.topCategories[0]).toEqual({ category: 'supplies', amount: 45.5 });
    expect(data.revenueSeries).toEqual([{ date: '2026-04-04', amount: 2500 }]);
  });

  it('creates a new expense entry', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 9,
          merchant_address: merchant,
          amount: '89.99',
          currency: 'USD',
          category: 'transport',
          description: 'Fuel for deliveries',
          receipt_image_url: null,
          expense_date: '2026-04-05',
          created_at: '2026-04-05T10:00:00.000Z',
          updated_at: '2026-04-05T10:00:00.000Z',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/expenses', {
      method: 'POST',
      body: JSON.stringify({
        amount: 89.99,
        category: 'transport',
        description: 'Fuel for deliveries',
        expenseDate: '2026-04-05',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.expense.amount).toBe(89.99);
    expect(data.expense.category).toBe('transport');
  });

  it('updates an existing expense entry', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 9,
          merchant_address: merchant,
          amount: '99.99',
          currency: 'USD',
          category: 'transport',
          description: 'Van fuel and parking',
          receipt_image_url: null,
          expense_date: '2026-04-05',
          created_at: '2026-04-05T10:00:00.000Z',
          updated_at: '2026-04-05T11:00:00.000Z',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/expenses', {
      method: 'PATCH',
      body: JSON.stringify({
        id: 9,
        amount: 99.99,
        description: 'Van fuel and parking',
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.expense.description).toContain('parking');
  });

  it('deletes an expense entry', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 9 }] });

    const request = new NextRequest('http://localhost:3000/api/merchant/expenses?id=9', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'rate limit' }, { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/api/merchant/expenses');
    const response = await GET(request);

    expect(response.status).toBe(429);
  });
});
