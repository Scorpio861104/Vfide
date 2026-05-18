/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { DELETE, GET, POST } from '../../../app/api/remittance/beneficiaries/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/remittance/beneficiaries', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const owner = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: owner } });
  });

  it('returns saved beneficiaries for the authenticated user', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 5,
          owner_address: owner,
          name: 'Amina',
          phone: '+254700123456',
          network: 'mpesa',
          country: 'KE',
          relationship: 'parent',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.beneficiaries).toHaveLength(1);
  });

  it('creates a beneficiary record', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 7,
          owner_address: owner,
          name: 'Kwame',
          phone: '+233555000111',
          network: 'mtn_momo',
          country: 'GH',
          relationship: 'sibling',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Kwame',
        phone: '+233555000111',
        network: 'mtn_momo',
        country: 'GH',
        relationship: 'sibling',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.beneficiary.id).toBe(7);
  });

  it('returns 400 when the beneficiary payload is invalid', async () => {
    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries', {
      method: 'POST',
      body: JSON.stringify({
        name: '',
        phone: '',
        network: 'invalid',
        country: 'KEN',
        relationship: '',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('deletes a beneficiary owned by the authenticated user', async () => {
    query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries?id=7', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns the limiter response when rate limited', async () => {
    withRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'rate limit' }, { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/api/remittance/beneficiaries');
    const response = await GET(request);
    expect(response.status).toBe(429);
  });
});
