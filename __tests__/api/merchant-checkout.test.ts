import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/merchant/checkout/[id]/route';

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
    http: jest.fn((url: string) => url),
    decodeEventLog: jest.fn(),
  };
});

describe('/api/merchant/checkout/[id] PATCH', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { createPublicClient, decodeEventLog } = require('viem');

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC;
    delete process.env.NEXT_PUBLIC_RPC_URL;
    delete process.env.RPC_URL;
    delete process.env.MERCHANT_PAYMENT_MIN_CONFIRMATIONS;

    decodeEventLog.mockReturnValue({
      eventName: 'PaymentProcessed',
      args: {
        customer: AUTH_ADDRESS,
        merchant: MERCHANT_ADDRESS,
        token: TOKEN_ADDRESS,
        amount: 10000000000000000000n,
      },
    });
  });

  it('returns 503 when tx verification is unavailable', async () => {
    withRateLimit.mockResolvedValue(null);
    query
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'sent', customer_address: AUTH_ADDRESS, merchant_address: MERCHANT_ADDRESS, token: TOKEN_ADDRESS, total: '10' }] })
      .mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost:3000/api/merchant/checkout/abc', {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'pay',
        tx_hash: '0x1111111111111111111111111111111111111111111111111111111111111111',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'abc' }) });
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toContain('verification temporarily unavailable');
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('returns 400 when tx hash is not confirmed on-chain', async () => {
    withRateLimit.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_RPC_URL = 'http://127.0.0.1:8545';
    process.env.MERCHANT_PAYMENT_MIN_CONFIRMATIONS = '2';

    query
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'sent', customer_address: AUTH_ADDRESS, merchant_address: MERCHANT_ADDRESS, token: TOKEN_ADDRESS, total: '10' }] })
      .mockResolvedValueOnce({ rows: [] });

    const getTransactionReceipt = jest.fn().mockRejectedValue(new Error('Transaction not found'));
    const readContract = jest.fn().mockResolvedValue(18);
    const getBlockNumber = jest.fn().mockResolvedValue(101n);
    createPublicClient.mockReturnValue({ getTransactionReceipt, readContract, getBlockNumber });

    const request = new NextRequest('http://localhost:3000/api/merchant/checkout/abc', {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'pay',
        tx_hash: '0x2222222222222222222222222222222222222222222222222222222222222222',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'abc' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/not found|not yet mined/i);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('moves invoice to pending_confirmation only after successful on-chain tx verification', async () => {
    withRateLimit.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_RPC_URL = 'http://127.0.0.1:8545';
    process.env.MERCHANT_PAYMENT_MIN_CONFIRMATIONS = '2';

    query
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'sent', customer_address: AUTH_ADDRESS, merchant_address: MERCHANT_ADDRESS, token: TOKEN_ADDRESS, total: '10' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const getTransactionReceipt = jest.fn().mockResolvedValue({
      status: 'success',
      to: PORTAL_ADDRESS,
      blockNumber: 100n,
      logs: [{ address: PORTAL_ADDRESS, data: '0x', topics: [] }],
    });
    const readContract = jest.fn().mockResolvedValue(18);
    const getBlockNumber = jest.fn().mockResolvedValue(101n);
    createPublicClient.mockReturnValue({ getTransactionReceipt, readContract, getBlockNumber });

    const request = new NextRequest('http://localhost:3000/api/merchant/checkout/abc', {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'pay',
        tx_hash: '0x3333333333333333333333333333333333333333333333333333333333333333',
      }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: 'abc' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(query).toHaveBeenCalledTimes(3);
  });
});
