/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { GET, PATCH, POST } from '../../../app/api/merchant/coupons/route';
import { GET as VALIDATE_GET } from '../../../app/api/merchant/coupons/validate/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/merchant/coupons', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const merchant = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: merchant } });
  });

  it('lists coupons for the merchant', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'coupon_1',
          merchant_address: merchant,
          code: 'WELCOME10',
          discount_type: 'percentage',
          discount_value: '10',
          min_order_amount: '20',
          max_discount: '15',
          max_uses: 100,
          uses: 5,
          per_customer_limit: 1,
          valid_from: '2026-04-04T00:00:00.000Z',
          valid_until: '2026-05-01T00:00:00.000Z',
          active: true,
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/coupons');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.coupons).toHaveLength(1);
    expect(data.coupons[0].code).toBe('WELCOME10');
  });

  it('creates a coupon', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'coupon_2',
          merchant_address: merchant,
          code: 'FRIENDS20',
          discount_type: 'percentage',
          discount_value: '20',
          min_order_amount: '0',
          max_discount: '25',
          max_uses: 250,
          uses: 0,
          per_customer_limit: 1,
          valid_from: '2026-04-04T00:00:00.000Z',
          valid_until: '2026-06-01T00:00:00.000Z',
          active: true,
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/coupons', {
      method: 'POST',
      body: JSON.stringify({
        code: 'FRIENDS20',
        discountType: 'percentage',
        discountValue: 20,
        maxDiscount: 25,
        maxUses: 250,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.coupon.code).toBe('FRIENDS20');
  });

  it('toggles coupon active state', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'coupon_1',
          code: 'WELCOME10',
          active: false,
          uses: 5,
          valid_from: '2026-04-04T00:00:00.000Z',
        },
      ],
    });

    const request = new NextRequest('http://localhost:3000/api/merchant/coupons', {
      method: 'PATCH',
      body: JSON.stringify({ id: 'coupon_1', active: false }),
    });

    const response = await PATCH(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.coupon.active).toBe(false);
  });

  it('validates a coupon code for checkout', async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          id: 'coupon_1',
          code: 'WELCOME10',
          discount_type: 'percentage',
          discount_value: '10',
          min_order_amount: '20',
          max_discount: '15',
          max_uses: 100,
          uses: 5,
          per_customer_limit: 1,
          valid_from: '2026-04-01T00:00:00.000Z',
          valid_until: '2026-05-01T00:00:00.000Z',
          active: true,
        },
      ],
    });
    query.mockResolvedValueOnce({ rows: [{ redemption_count: '0' }] });

    const request = new NextRequest(`http://localhost:3000/api/merchant/coupons/validate?code=WELCOME10&merchant=${merchant}&amount=50`);
    const response = await VALIDATE_GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.valid).toBe(true);
    expect(data.discount).toBe(5);
    expect(data.newTotal).toBe(45);
  });

  it('returns the limiter response when blocked', async () => {
    withRateLimit.mockResolvedValue(
      NextResponse.json({ error: 'rate limit' }, { status: 429 })
    );

    const request = new NextRequest('http://localhost:3000/api/merchant/coupons');
    const response = await GET(request);
    expect(response.status).toBe(429);
  });
});
