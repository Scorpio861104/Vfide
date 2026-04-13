import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/merchant/payments/confirm/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/webhooks/merchantWebhookDispatcher', () => ({
  dispatchWebhook: jest.fn(),
}));

jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    getTransactionReceipt: jest.fn(async () => ({
      status: 'success',
      to: '0x1111111111111111111111111111111111111111',
      blockNumber: 10n,
      logs: [{ address: '0x1111111111111111111111111111111111111111', data: '0x', topics: [] }],
    })),
    getBlockNumber: jest.fn(async () => 12n),
  })),
  decodeEventLog: jest.fn(() => ({
    eventName: 'PaymentProcessed',
    args: {
      customer: '0x2222222222222222222222222222222222222222',
      merchant: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      token: '0x3333333333333333333333333333333333333333',
      amount: 1000n,
      orderId: 'order-1',
    },
  })),
  getAddress: jest.fn((value: string) => value.toLowerCase()),
  http: jest.fn(() => ({})),
  parseAbiItem: jest.fn(() => ({})),
}));

describe('/api/merchant/payments/confirm idempotency', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { dispatchWebhook } = require('@/lib/webhooks/merchantWebhookDispatcher');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RPC_URL = 'https://rpc.example.test';
    process.env.MERCHANT_PORTAL_ADDRESS = '0x1111111111111111111111111111111111111111';

    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({
      user: { address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
    });
  });

  it('dispatches webhook on first unique tx_hash confirmation', async () => {
    // idempotency insert claimed
    query.mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: '0x2222222222222222222222222222222222222222',
        amount: '1000',
        token: '0x3333333333333333333333333333333333333333',
        order_id: 'order-1',
        tx_hash: '0x' + 'ab'.repeat(32),
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(dispatchWebhook).toHaveBeenCalledTimes(1);
  });

  it('returns idempotent duplicate response and skips webhook dispatch', async () => {
    // duplicate insert => no returned row
    query.mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: '0x2222222222222222222222222222222222222222',
        amount: '1000',
        token: '0x3333333333333333333333333333333333333333',
        order_id: 'order-1',
        tx_hash: '0x' + 'cd'.repeat(32),
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.idempotent).toBe(true);
    expect(data.duplicate).toBe(true);
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });
});
