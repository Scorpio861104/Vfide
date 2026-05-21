import { NextRequest } from 'next/server';

const mockMerchant = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const mockToken = '0x3333333333333333333333333333333333333333';

// Set env vars BEFORE importing the route, since CONTRACT_ADDRESSES.VFIDEToken
// is computed at module-load time. `mockToken` matches the token in the
// mocked PaymentProcessed event so isAcceptedSettlementToken accepts it.
process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS = mockToken;

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => async (req: NextRequest, ctx?: any) => {
    return handler(req, { address: mockMerchant }, ctx);
  },
  requireAuth: jest.fn(),
  requireOwnership: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  requireAdmin: jest.fn(async () => ({ user: { sub: 'test', address: '0x0000000000000000000000000000000000000000' } })),
  verifyAuth: jest.fn(async () => ({ ok: true, user: { sub: 'test' } })),
  getRequestAuthToken: jest.fn(async () => null),
  optionalAuth: jest.fn(async () => null),
  isAdmin: jest.fn(() => false),
  verifyOnChainAdmin: jest.fn(async () => false),
  checkOwnership: jest.fn(() => true),
  withOwnership: jest.fn((extractor: any, handler: any) => async (req: any, ctx?: any) => {
    // V3: extract target address from request and use it as auth user, bubble up
    // requireAuth Response if set.
    const m = (jest.requireMock('@/lib/auth/middleware') as any);
    let user: any = { sub: 'test', address: '0x0000000000000000000000000000000000000000' };
    try {
      const r0 = typeof m.requireAuth === 'function' ? m.requireAuth(req) : null;
      const r = (r0 && typeof (r0 as any).then === 'function') ? await r0 : r0;
      if (r && typeof r.status === 'number' && typeof r.json === 'function') return r;
      if (r && r.user) user = r.user;
      else {
        const target = await extractor(req, ctx);
        if (typeof target === 'string' && target) {
          const addr = target.toLowerCase();
          user = { sub: addr, address: addr };
        }
      }
    } catch { /* ignore */ }
    return handler(req, user, ctx);
  }),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/webhooks/merchantWebhookDispatcher', () => ({
  dispatchWebhook: jest.fn(),
}));

// Use real parseUnits/formatUnits from viem so amount math is correct.
jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    createPublicClient: jest.fn(() => ({
      getTransactionReceipt: jest.fn(async () => ({
        status: 'success',
        to: '0x1111111111111111111111111111111111111111',
        blockNumber: 10n,
        logs: [{ address: '0x1111111111111111111111111111111111111111', data: '0x', topics: [] }],
      })),
      getBlockNumber: jest.fn(async () => 12n),
      readContract: jest.fn(async () => 18),
    })),
    decodeEventLog: jest.fn(() => ({
      eventName: 'PaymentProcessed',
      args: {
        customer: '0x2222222222222222222222222222222222222222',
        merchant: mockMerchant,
        token: '0x3333333333333333333333333333333333333333',
        // "1000" decimal × 10^18 = 1e21 wei
        amount: 10n ** 18n * 1000n,
        orderId: 'order-1',
      },
    })),
    getAddress: jest.fn((value: string) => value.toLowerCase()),
    http: jest.fn(() => ({})),
    parseAbiItem: jest.fn(() => ({})),
  };
});

import { POST } from '../../../app/api/merchant/payments/confirm/route';

describe('/api/merchant/payments/confirm idempotency', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { dispatchWebhook } = require('@/lib/webhooks/merchantWebhookDispatcher');

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RPC_URL = 'https://rpc.example.test';
    process.env.MERCHANT_PORTAL_ADDRESS = '0x1111111111111111111111111111111111111111';
    withRateLimit.mockResolvedValue(null);
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
