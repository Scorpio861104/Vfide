import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../../../app/api/merchant/payments/confirm/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
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

jest.mock('viem', () => ({
  createPublicClient: jest.fn(),
  decodeEventLog: jest.fn(),
  getAddress: jest.fn((value: string) => value.toLowerCase()),
  http: jest.fn((value: string) => value),
  parseAbiItem: jest.fn((value: string) => value),
}));

describe('/api/merchant/payments/confirm', () => {
  const { requireAuth } = require('@/lib/auth/middleware');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { query } = require('@/lib/db');
  const { dispatchWebhook } = require('@/lib/webhooks/merchantWebhookDispatcher');
  const { createPublicClient, decodeEventLog } = require('viem');

  const mockMerchant = '0x1111111111111111111111111111111111111111';
  const mockCustomer = '0x2222222222222222222222222222222222222222';
  const mockPortal = '0x3333333333333333333333333333333333333333';

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockResolvedValue({ rows: [] });
    process.env.RPC_URL = 'https://rpc.example';
    process.env.MERCHANT_PORTAL_ADDRESS = mockPortal;
    process.env.MERCHANT_PAYMENT_MIN_CONFIRMATIONS = '1';

    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: mockMerchant } });
    createPublicClient.mockReturnValue({
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: 'success',
        to: mockPortal,
        blockNumber: 100n,
        logs: [{
          address: mockPortal,
          topics: ['0xtopic'],
          data: '0x',
        }],
      }),
      getBlockNumber: jest.fn().mockResolvedValue(100n),
    });
    decodeEventLog.mockReturnValue({
      eventName: 'PaymentProcessed',
      args: {
        customer: mockCustomer,
        merchant: mockMerchant,
        token: '0x4444444444444444444444444444444444444444',
        amount: 1000n,
        orderId: 'order-1',
      },
    });
  });

  it('returns 400 when tx_hash is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: mockCustomer,
        amount: '1000',
        order_id: 'order-1',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });

  it('returns 422 when receipt does not contain a matching payment event', async () => {
    decodeEventLog.mockReturnValue({
      eventName: 'PaymentProcessed',
      args: {
        customer: mockCustomer,
        merchant: mockMerchant,
        token: '0x4444444444444444444444444444444444444444',
        amount: 999n,
        orderId: 'order-1',
      },
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: mockCustomer,
        amount: '1000',
        order_id: 'order-1',
        tx_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toContain('matching payment event');
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });

  it('dispatches webhook when on-chain verification succeeds', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: mockCustomer,
        amount: '1000',
        order_id: 'order-1',
        token: '0x4444444444444444444444444444444444444444',
        tx_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(dispatchWebhook).toHaveBeenCalledWith(
      mockMerchant,
      'payment.completed',
      expect.objectContaining({
        customer_address: mockCustomer,
        amount: '1000',
        order_id: 'order-1',
        tx_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      })
    );
  });

  it('returns rate-limit response when limiter blocks request', async () => {
    withRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'rate limit' }, { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: mockCustomer,
        amount: '1000',
        tx_hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });
});
