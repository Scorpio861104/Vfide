/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH, POST } from '../../../app/api/merchant/gift-cards/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  requireOwnership: jest.fn(),
}));

describe('/api/merchant/gift-cards', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth, requireOwnership } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: merchant } });
    requireOwnership.mockResolvedValue({ user: { address: merchant } });
  });

  it('validates a public gift card code', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: 'gc_1',
        remaining_amount: '25.00',
        currency: 'USD',
        status: 'active',
        expires_at: null,
      }],
    });

    const request = new NextRequest(`http://localhost:3000/api/merchant/gift-cards?code=GC-ABCD1234&merchant=${merchant}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.balance).toBe(25);
  });

  it('creates a new gift card', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'gc_2', code: 'GC-NEWCODE', original_amount: '50.00' }],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/gift-cards', {
      method: 'POST',
      body: JSON.stringify({ merchantAddress: merchant, amount: 50, recipientName: 'Amina' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.giftCard.code).toContain('GC-');
  });

  it('redeems available balance and returns the remainder', async () => {
    query.mockResolvedValueOnce({
      rows: [{ remaining_amount: '12.50' }],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/gift-cards', {
      method: 'PATCH',
      body: JSON.stringify({ code: 'GC-ABCD1234', merchantAddress: merchant, redeemAmount: 12.5 }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.remainingBalance).toBe(12.5);
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(NextResponse.json({ error: 'rate limit' }, { status: 429 }));

    const request = new NextRequest(`http://localhost:3000/api/merchant/gift-cards?merchant=${merchant}`);
    const response = await GET(request);

    expect(response.status).toBe(429);
  });
});
