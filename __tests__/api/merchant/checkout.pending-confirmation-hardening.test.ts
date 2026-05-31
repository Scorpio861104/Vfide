import { NextRequest, NextResponse } from 'next/server';
import { PATCH } from '../../../app/api/merchant/checkout/[id]/route';

const AUTH_ADDRESS = '0x1111111111111111111111111111111111111111';
const MERCHANT_ADDRESS = '0x2222222222222222222222222222222222222222';
const TOKEN_ADDRESS = '0x3333333333333333333333333333333333333333';
const PORTAL_ADDRESS = '0x4444444444444444444444444444444444444444';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  withAuth: (handler: any) => (request: Request, context?: any) =>
    handler(request, { address: AUTH_ADDRESS }, context),
}));

jest.mock('@/lib/contracts', () => ({
  CONTRACT_ADDRESSES: {
    MerchantPortal: '0x4444444444444444444444444444444444444444',
    VFIDEToken: '0x3333333333333333333333333333333333333333',
    StablecoinRegistry: '0x5555555555555555555555555555555555555555',
  },
  StablecoinRegistryABI: [],
  isConfiguredContractAddress: jest.fn(() => true),
}));

jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    createPublicClient: jest.fn(),
    decodeEventLog: jest.fn(),
    http: jest.fn((url: string) => url),
  };
});

describe('/api/merchant/checkout/[id] payment hardening', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { createPublicClient, decodeEventLog } = require('viem');

  const paymentLinkId = 'a'.repeat(32);
  const txHash = '0x' + 'b'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_RPC_URL = 'http://127.0.0.1:8545';
    process.env.MERCHANT_PAYMENT_MIN_CONFIRMATIONS = '2';

    decodeEventLog.mockReturnValue({
      eventName: 'PaymentProcessed',
      args: {
        customer: AUTH_ADDRESS,
        merchant: MERCHANT_ADDRESS,
        token: TOKEN_ADDRESS,
        amount: 10000000000000000000n,
      },
    });

    createPublicClient.mockReturnValue({
      readContract: jest.fn().mockResolvedValue(18),
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: 'success',
        to: PORTAL_ADDRESS,
        blockNumber: 100n,
        logs: [{ address: PORTAL_ADDRESS, data: '0x', topics: [] }],
      }),
      getBlockNumber: jest.fn().mockResolvedValue(101n),
    });
  });

  it('rejects pay action when invoice is already pending_confirmation', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 42, status: 'pending_confirmation', customer_address: AUTH_ADDRESS, merchant_address: MERCHANT_ADDRESS, token: TOKEN_ADDRESS, total: '10' }],
    });

    const request = new NextRequest(`http://localhost:3000/api/merchant/checkout/${paymentLinkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'pay', tx_hash: txHash }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: paymentLinkId }) });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/pending confirmation/i);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('only transitions sent/viewed invoices to pending_confirmation', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 77, status: 'viewed', customer_address: AUTH_ADDRESS, merchant_address: MERCHANT_ADDRESS, token: TOKEN_ADDRESS, total: '10' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const request = new NextRequest(`http://localhost:3000/api/merchant/checkout/${paymentLinkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'pay', tx_hash: txHash }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: paymentLinkId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    const updateCall = query.mock.calls[2];
    expect(updateCall[0]).toContain("status IN ('sent', 'viewed')");
    expect(updateCall[1][0]).toBe(txHash);
    expect(updateCall[1][1]).toBe(77);
  });

  it('returns 409 when status changes before update', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 88, status: 'viewed', customer_address: AUTH_ADDRESS, merchant_address: MERCHANT_ADDRESS, token: TOKEN_ADDRESS, total: '10' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const request = new NextRequest(`http://localhost:3000/api/merchant/checkout/${paymentLinkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'pay', tx_hash: txHash }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: paymentLinkId }) });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/no longer allows payment update/i);
  });

  it('returns rate limit response when limiter blocks request', async () => {
    withRateLimit.mockResolvedValue(NextResponse.json({ error: 'rate limit' }, { status: 429 }));

    const request = new NextRequest(`http://localhost:3000/api/merchant/checkout/${paymentLinkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'pay', tx_hash: txHash }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: paymentLinkId }) });

    expect(response.status).toBe(429);
    expect(query).not.toHaveBeenCalled();
  });
});
