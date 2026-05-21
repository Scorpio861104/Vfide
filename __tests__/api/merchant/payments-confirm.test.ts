import { NextRequest, NextResponse } from 'next/server';

const mockMerchant = '0x1111111111111111111111111111111111111111';
const mockCustomer = '0x2222222222222222222222222222222222222222';
const mockPortal = '0x3333333333333333333333333333333333333333';
const mockToken = '0x4444444444444444444444444444444444444444';
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

// For an 18-decimal token, "1000" decimal = 1000 * 10^18 wei = 1e21
const AMOUNT_DECIMAL = '1000';
const AMOUNT_WEI = 10n ** 18n * 1000n;

// IMPORTANT: set env vars BEFORE importing the route, since
// CONTRACT_ADDRESSES.VFIDEToken is computed at module-load time.
// `mockToken` matches the token address we'll inject into the mocked
// PaymentProcessed event so `isAcceptedSettlementToken` accepts it.
process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS = mockToken;

// Mock auth at import time so `export const POST = withAuth(...)` works
// when the route module loads.
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
  withOwnership: jest.fn((_extractor: any, handler: any) => async (req: any, ctx?: any) => handler(req, { sub: 'test', address: '0x0000000000000000000000000000000000000000' }, ctx)),
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

// Use the real `parseUnits` and `formatUnits` from viem so the
// decimal→wei math is identical to production. The chain calls
// are stubbed.
jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    createPublicClient: jest.fn(),
    decodeEventLog: jest.fn(),
    getAddress: jest.fn((value: string) => value.toLowerCase()),
    http: jest.fn((value: string) => value),
    parseAbiItem: jest.fn((value: string) => value),
  };
});

import { POST } from '../../../app/api/merchant/payments/confirm/route';

describe('/api/merchant/payments/confirm', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { query } = require('@/lib/db');
  const { dispatchWebhook } = require('@/lib/webhooks/merchantWebhookDispatcher');
  const { createPublicClient, decodeEventLog } = require('viem');

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockResolvedValue({ rows: [] });
    process.env.RPC_URL = 'https://rpc.example';
    process.env.MERCHANT_PORTAL_ADDRESS = mockPortal;
    process.env.MERCHANT_PAYMENT_MIN_CONFIRMATIONS = '1';

    withRateLimit.mockResolvedValue(null);

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
      // readContract is called for the token decimals() lookup.
      readContract: jest.fn().mockResolvedValue(18),
    });
    decodeEventLog.mockReturnValue({
      eventName: 'PaymentProcessed',
      args: {
        customer: mockCustomer,
        merchant: mockMerchant,
        token: mockToken,
        amount: AMOUNT_WEI,
        orderId: 'order-1',
      },
    });
  });

  it('returns 400 when tx_hash is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: mockCustomer,
        amount: AMOUNT_DECIMAL,
        token: mockToken,
        order_id: 'order-1',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request body');
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });

  it('returns 400 when token is missing (schema now requires it)', async () => {
    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: mockCustomer,
        amount: AMOUNT_DECIMAL,
        order_id: 'order-1',
        tx_hash: TX_HASH,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });

  it('returns 422 when receipt does not contain a matching payment event', async () => {
    decodeEventLog.mockReturnValue({
      eventName: 'PaymentProcessed',
      args: {
        customer: mockCustomer,
        merchant: mockMerchant,
        token: mockToken,
        amount: AMOUNT_WEI - 1n, // off-by-one wei → no match
        orderId: 'order-1',
      },
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: mockCustomer,
        amount: AMOUNT_DECIMAL,
        token: mockToken,
        order_id: 'order-1',
        tx_hash: TX_HASH,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toContain('matching payment event');
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });

  it('does not use NEXT_PUBLIC_RPC_URL for server-side payment confirmation', async () => {
    delete process.env.RPC_URL;
    process.env.NEXT_PUBLIC_RPC_URL = 'https://public-rpc.example';

    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: mockCustomer,
        amount: AMOUNT_DECIMAL,
        token: mockToken,
        order_id: 'order-1',
        tx_hash: TX_HASH,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Without RPC_URL we fail at the new decimals-resolution step before
    // ever building the public client. Returns 503; never calls
    // createPublicClient; never dispatches a webhook.
    expect(response.status).toBe(503);
    expect(data.error).toContain('chain configuration');
    expect(createPublicClient).not.toHaveBeenCalled();
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });

  it('dispatches webhook when on-chain verification succeeds (decimal amount → wei match)', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: '1' }] });

    const request = new NextRequest('http://localhost:3000/api/merchant/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({
        customer_address: mockCustomer,
        amount: AMOUNT_DECIMAL, // "1000"
        order_id: 'order-1',
        token: mockToken,
        tx_hash: TX_HASH,
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
        // Amount in webhook is wei (matches event), for downstream
        // consumers that need the canonical on-chain value.
        amount: AMOUNT_WEI.toString(),
        order_id: 'order-1',
        tx_hash: TX_HASH,
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
        amount: AMOUNT_DECIMAL,
        token: mockToken,
        tx_hash: TX_HASH,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(429);
    expect(dispatchWebhook).not.toHaveBeenCalled();
  });
});
