import { NextRequest } from 'next/server';
import { PATCH } from '@/app/api/merchant/checkout/[id]/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    createPublicClient: jest.fn(),
    http: jest.fn((url: string) => url),
  };
});

describe('/api/merchant/checkout/[id] PATCH', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { createPublicClient } = require('viem');

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC;
    delete process.env.NEXT_PUBLIC_RPC_URL;
    delete process.env.RPC_URL;
  });

  it('returns 503 when tx verification is unavailable', async () => {
    withRateLimit.mockResolvedValue(null);
    query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'sent' }] });

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
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when tx hash is not confirmed on-chain', async () => {
    withRateLimit.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_RPC_URL = 'http://127.0.0.1:8545';

    query.mockResolvedValueOnce({ rows: [{ id: 1, status: 'sent' }] });

    const getTransactionReceipt = jest.fn().mockRejectedValue(new Error('Transaction not found'));
    createPublicClient.mockReturnValue({ getTransactionReceipt });

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
    expect(data.error).toContain('not confirmed on-chain');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('moves invoice to pending_confirmation only after successful on-chain tx verification', async () => {
    withRateLimit.mockResolvedValue(null);
    process.env.NEXT_PUBLIC_RPC_URL = 'http://127.0.0.1:8545';

    query
      .mockResolvedValueOnce({ rows: [{ id: 1, status: 'sent' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const getTransactionReceipt = jest.fn().mockResolvedValue({ status: 'success' });
    createPublicClient.mockReturnValue({ getTransactionReceipt });

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
    expect(query).toHaveBeenCalledTimes(2);
  });
});
