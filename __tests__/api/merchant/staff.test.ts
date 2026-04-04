/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { DELETE, GET, PATCH, POST } from '../../../app/api/merchant/staff/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/merchant/staff', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: merchant } });
  });

  it('lists active staff sessions for the merchant', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'staff-1',
          merchant_address: merchant,
          staff_name: 'Alice',
          wallet_address: '0x2222222222222222222222222222222222222222',
          role: 'cashier',
          active: true,
          permissions: { processSales: true, viewProducts: true },
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/staff');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.staff).toHaveLength(1);
  });

  it('creates a new staff session and returns a pos link', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'staff-2',
          merchant_address: merchant,
          staff_name: 'Ben',
          wallet_address: '0x3333333333333333333333333333333333333333',
          role: 'manager',
          active: true,
          permissions: { processSales: true, editProducts: true },
          created_at: '2026-04-04T00:00:00.000Z',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/staff', {
      method: 'POST',
      body: JSON.stringify({
        staffName: 'Ben',
        walletAddress: '0x3333333333333333333333333333333333333333',
        role: 'manager',
        permissions: {
          processSales: true,
          viewProducts: true,
          editProducts: true,
          issueRefunds: false,
          viewAnalytics: true,
          maxSaleAmount: 500,
          dailySaleLimit: 3000,
        },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.posLink).toBe('string');
    expect(data.session.staff_name).toBe('Ben');
  });

  it('updates staff permissions', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'staff-3',
          role: 'cashier',
          permissions: { processSales: true, viewAnalytics: false },
          active: true,
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/staff', {
      method: 'PATCH',
      body: JSON.stringify({
        id: 'staff-3',
        role: 'cashier',
        permissions: {
          processSales: true,
          viewProducts: true,
          editProducts: false,
          issueRefunds: false,
          viewAnalytics: false,
          maxSaleAmount: 200,
          dailySaleLimit: 1200,
        },
      }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('revokes a staff session', async () => {
    query.mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const request = new NextRequest('http://localhost:3000/api/merchant/staff?id=staff-3', {
      method: 'DELETE',
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'rate limit' }, { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/api/merchant/staff');
    const response = await GET(request);
    expect(response.status).toBe(429);
  });
});
