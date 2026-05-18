/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '../../../app/api/merchant/wholesale/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireOwnership: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('/api/merchant/wholesale', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireOwnership } = require('@/lib/auth/middleware');

  const buyer = '0x1111111111111111111111111111111111111111';
  const seller = '0x2222222222222222222222222222222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireOwnership.mockResolvedValue({ user: { address: buyer } });
  });

  it('lists wholesale products and active group buys from live data', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 101,
            name: 'Bulk Rice',
            price: '20.00',
            inventory_count: 500,
            merchant_name: 'Kofi Textiles',
            merchant_address: seller,
            merchant_score: 8200,
            metadata: {
              wholesale_tiers: [
                { min_qty: 10, price: 18 },
                { min_qty: 50, price: 15 },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'gb_1',
            product_id: 101,
            product_name: 'Bulk Rice',
            merchant_name: 'Kofi Textiles',
            initiator_merchant_address: buyer,
            target_quantity: 50,
            current_quantity: 20,
            current_unit_price: '18.00',
            status: 'open',
            notes: 'Join this bulk order',
          },
        ],
      });

    const request = new NextRequest(`http://localhost:3000/api/merchant/wholesale?buyer=${buyer}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.products).toHaveLength(1);
    expect(data.products[0].name).toBe('Bulk Rice');
    expect(data.products[0].tiers[0].minQty).toBe(10);
    expect(data.groupBuys).toHaveLength(1);
    expect(data.groupBuys[0].current_quantity).toBe(20);
  });

  it('creates a persisted wholesale group buy', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 101,
            name: 'Bulk Rice',
            price: '20.00',
            merchant_address: seller,
            merchant_name: 'Kofi Textiles',
            metadata: { wholesale_tiers: [{ min_qty: 10, price: 18 }, { min_qty: 50, price: 15 }] },
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'gb_2',
            product_id: 101,
            initiator_merchant_address: buyer,
            target_quantity: 50,
            current_quantity: 20,
            current_unit_price: '18.00',
            status: 'open',
            notes: 'Need stock for market day',
            product_name: 'Bulk Rice',
            merchant_name: 'Kofi Textiles',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ group_buy_id: 'gb_2' }] });

    const request = new NextRequest('http://localhost:3000/api/merchant/wholesale', {
      method: 'POST',
      body: JSON.stringify({
        action: 'createGroupBuy',
        merchantAddress: buyer,
        productId: 101,
        quantity: 20,
        targetQty: 50,
        note: 'Need stock for market day',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.groupBuy.status).toBe('open');
    expect(data.groupBuy.current_quantity).toBe(20);
  });

  it('creates a direct wholesale order using tier pricing', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 101,
            name: 'Bulk Rice',
            price: '20.00',
            merchant_address: seller,
            merchant_name: 'Kofi Textiles',
            metadata: { wholesale_tiers: [{ min_qty: 10, price: 18 }, { min_qty: 50, price: 15 }] },
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'wo_1',
            buyer_merchant_address: buyer,
            seller_merchant_address: seller,
            product_id: 101,
            quantity: 10,
            unit_price: '18.00',
            total: '180.00',
            status: 'submitted',
          },
        ],
      });

    const request = new NextRequest('http://localhost:3000/api/merchant/wholesale', {
      method: 'POST',
      body: JSON.stringify({
        action: 'createOrder',
        merchantAddress: buyer,
        productId: 101,
        quantity: 10,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.order.total).toBe('180.00');
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(NextResponse.json({ error: 'rate limit' }, { status: 429 }));

    const request = new NextRequest(`http://localhost:3000/api/merchant/wholesale?buyer=${buyer}`);
    const response = await GET(request);

    expect(response.status).toBe(429);
  });
});
