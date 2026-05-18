/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';

// Set env BEFORE importing the route so that any module-load-time reads
// of process.env see the test values.
process.env.NEXT_PUBLIC_USDC_ADDRESS = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

// IMPORTANT: withAuth is applied at module-load time when the route file
// does `export const POST = withAuth(handler)`. We have to mock it with
// the actual unwrap behavior so the inner handler runs with our fake
// user. A `jest.fn()` placeholder would leave POST as undefined.
jest.mock('@/lib/auth/middleware', () => {
  const merchant = '0x1111111111111111111111111111111111111111';
  return {
    withAuth: (handler: any) =>
      async (request: NextRequest, ctx?: any) => {
        return handler(request, { address: merchant }, ctx);
      },
  };
});

import { GET, POST } from '../../../app/api/merchant/withdraw/route';

describe('/api/merchant/withdraw', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  const merchant = '0x1111111111111111111111111111111111111111';
  const usdcAddress = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    // Re-set env in case a previous test deleted it.
    process.env.NEXT_PUBLIC_USDC_ADDRESS = usdcAddress;
    process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
  });

  it('returns recent withdrawals + balances summary for the authenticated merchant', async () => {
    // Two query mock results: (1) recent withdrawals list, (2) per-token
    // balance summary. The GET handler issues both queries in order.
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 7,
          merchant_address: merchant,
          amount: '125.50',
          token: 'USDC',
          provider: 'transak',
          network: 'mpesa',
          status: 'requested',
          created_at: '2026-04-04T00:00:00.000Z',
        },
      ],
    });
    query.mockResolvedValueOnce({
      rows: [
        { token: usdcAddress, confirmed_wei: '500000000', reserved_wei: '125500000' },
      ],
    });

    const request = new NextRequest(`http://localhost:3000/api/merchant/withdraw?merchant=${merchant}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.withdrawals).toHaveLength(1);
    expect(data.balances).toEqual([
      { token: usdcAddress, confirmed_wei: '500000000', reserved_wei: '125500000' },
    ]);
  });

  it('rejects invalid withdrawal requests (bad enums)', async () => {
    const request = new NextRequest('http://localhost:3000/api/merchant/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount: -1,
        token: 'BAD',
        provider: 'unknown',
        mobileNumber: '',
        network: 'other',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 422 when the token is not configured for this environment', async () => {
    // Remove USDC mapping; DAI also isn't set in this test setup.
    delete process.env.NEXT_PUBLIC_USDC_ADDRESS;

    const request = new NextRequest('http://localhost:3000/api/merchant/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount: '50',
        token: 'USDC',
        provider: 'transak',
        mobileNumber: '+254700123456',
        network: 'mpesa',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    // Merchant profile lookup hasn't run yet; we fail before that with
    // a clear "token not configured" message.
    expect(response.status).toBe(422);
    expect(data.error).toContain('not configured');
  });

  it('returns 422 when confirmed balance is insufficient', async () => {
    // 1: merchant profile exists
    query.mockResolvedValueOnce({ rows: [{ id: 42 }] });
    // 2: balance query returns 50 USDC available; user is asking for 100.
    query.mockResolvedValueOnce({ rows: [{ net_balance: '50.00' }] });

    const request = new NextRequest('http://localhost:3000/api/merchant/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount: '100',
        token: 'USDC',
        provider: 'transak',
        mobileNumber: '+254700123456',
        network: 'mpesa',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toContain('Insufficient confirmed balance');
    // The error response now exposes the available balance so the UI
    // can show "you can withdraw up to X" without a separate roundtrip.
    expect(data.available).toBe('50.00');
  });

  it('creates a withdrawal request and returns a provider redirect URL', async () => {
    // 1: merchant profile exists
    query.mockResolvedValueOnce({ rows: [{ id: 42 }] });
    // 2: balance query returns enough confirmed balance to cover the ask
    query.mockResolvedValueOnce({ rows: [{ net_balance: '500.00' }] });
    // 3: insert returns the inserted row
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 42,
          merchant_address: merchant,
          amount: '100',
          token: 'USDC',
          provider: 'transak',
          mobile_number_hint: '***3456',
          network: 'mpesa',
          status: 'requested',
          provider_tx_id: 'wd_42',
          created_at: '2026-04-04T00:00:00.000Z',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount: '100',
        token: 'USDC',
        provider: 'transak',
        mobileNumber: '+254700123456',
        network: 'mpesa',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.request.id).toBe(42);
    expect(typeof data.redirectUrl).toBe('string');
    expect(data.redirectUrl).toContain('transak');
  });

  it('returns the limiter response when the request is rate limited', async () => {
    withRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'rate limit' }, { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/api/merchant/withdraw');
    const response = await GET(request);

    expect(response.status).toBe(429);
  });
});
