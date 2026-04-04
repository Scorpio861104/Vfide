/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '../../../app/api/merchant/withdraw/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/merchant/withdraw', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: merchant } });
  });

  it('returns recent withdrawals for the authenticated merchant', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 7,
          merchant_address: merchant,
          amount: '125.50',
          token: 'USDC',
          provider: 'transak',
          network: 'mpesa',
          status: 'pending',
          created_at: '2026-04-04T00:00:00.000Z',
        },
      ],
    });

    const request = new NextRequest(`http://localhost:3000/api/merchant/withdraw?merchant=${merchant}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.withdrawals).toHaveLength(1);
  });

  it('rejects invalid withdrawal requests', async () => {
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

  it('creates a withdrawal request and returns a provider redirect URL', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 42, registered: true }] });
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 42,
          merchant_address: merchant,
          amount: '100.00',
          token: 'USDC',
          provider: 'transak',
          mobile_number_hint: '***6789',
          network: 'mpesa',
          status: 'pending',
          provider_tx_id: 'wd_42',
          created_at: '2026-04-04T00:00:00.000Z',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/withdraw', {
      method: 'POST',
      body: JSON.stringify({
        amount: 100,
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
