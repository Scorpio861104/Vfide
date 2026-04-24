import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../../../app/api/merchant/orders/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/webhooks/merchantWebhookDispatcher', () => ({
  dispatchWebhook: jest.fn(),
}));

describe('/api/merchant/orders webhook hardening', () => {
  const { requireAuth } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { getClient } = require('@/lib/db');
  const { dispatchWebhook } = require('@/lib/webhooks/merchantWebhookDispatcher');

  const mockMerchant = '0x1111111111111111111111111111111111111111';
  const mockCustomer = '0x2222222222222222222222222222222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: mockCustomer } });

    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ id: 123, order_number: 'ORD-20260422-ABC123', status: 'pending', payment_status: 'unpaid' }],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };

    getClient.mockResolvedValue(client);
  });

  it('does not emit payment.completed when creating unpaid order', async () => {
    const request = new NextRequest('http://localhost:3000/api/merchant/orders', {
      method: 'POST',
      body: JSON.stringify({
        merchant_address: mockMerchant,
        items: [
          {
            name: 'Test Product',
            quantity: 1,
            unit_price: 25,
          },
        ],
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.order).toBeDefined();
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });

  it('does not emit payment.completed even when tx_hash is present at order creation', async () => {
    const client = {
      query: jest
        .fn()
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({
          rows: [{ id: 124, order_number: 'ORD-20260422-DEF456', status: 'confirmed', payment_status: 'paid' }],
        })
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({}),
      release: jest.fn(),
    };
    getClient.mockResolvedValue(client);

    const request = new NextRequest('http://localhost:3000/api/merchant/orders', {
      method: 'POST',
      body: JSON.stringify({
        merchant_address: mockMerchant,
        tx_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        items: [
          {
            name: 'Test Product',
            quantity: 1,
            unit_price: 25,
          },
        ],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });

  it('returns rate-limit response when limiter blocks request', async () => {
    withRateLimit.mockResolvedValue(NextResponse.json({ error: 'rate limit' }, { status: 429 }));

    const request = new NextRequest('http://localhost:3000/api/merchant/orders', {
      method: 'POST',
      body: JSON.stringify({
        merchant_address: mockMerchant,
        items: [{ name: 'Test Product', quantity: 1, unit_price: 25 }],
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });
});
