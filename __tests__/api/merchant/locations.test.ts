/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, POST } from '../../../app/api/merchant/locations/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireOwnership: jest.fn(),
}));

describe('/api/merchant/locations', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireOwnership } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireOwnership.mockResolvedValue({ user: { address: merchant } });
  });

  it('lists merchant locations', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'loc_1', name: 'Main Stall', city: 'Accra' }] });

    const request = new NextRequest(`http://localhost:3000/api/merchant/locations?merchant=${merchant}`);
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.locations).toHaveLength(1);
  });

  it('creates a location', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'loc_2', name: 'Harbor Shop', city: 'Tema' }] });

    const request = new NextRequest('http://localhost:3000/api/merchant/locations', {
      method: 'POST',
      body: JSON.stringify({ merchantAddress: merchant, name: 'Harbor Shop', city: 'Tema' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.location.name).toBe('Harbor Shop');
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(NextResponse.json({ error: 'rate limit' }, { status: 429 }));

    const request = new NextRequest(`http://localhost:3000/api/merchant/locations?merchant=${merchant}`);
    const response = await GET(request);

    expect(response.status).toBe(429);
  });
});
