import { NextRequest } from 'next/server';
import { GET } from '../../app/api/merchant/checkout/[id]/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/merchant/checkout/[id] GET', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
  });

  it('returns merchant identity details for the hosted checkout page', async () => {
    query
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            invoice_number: 'INV-202605-ABCD',
            merchant_address: '0x1111111111111111111111111111111111111111',
            merchant_name: 'Kofi Market',
            customer_address: null,
            customer_name: null,
            status: 'sent',
            token: '0x2222222222222222222222222222222222222222',
            subtotal: '10',
            tax_rate: '0',
            tax_amount: '0',
            total: '10',
            currency_display: 'USDC',
            memo: null,
            due_date: null,
            paid_at: null,
            tx_hash: null,
            created_at: '2026-05-03T00:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] });

    const request = new NextRequest('http://localhost:3000/api/merchant/checkout/pay_123');
    const response = await GET(request, { params: Promise.resolve({ id: 'pay_123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.invoice.merchant_name).toBe('Kofi Market');
    expect(data.invoice.merchant_address).toBe('0x1111111111111111111111111111111111111111');
    expect(data.invoice.id).toBeUndefined();
    expect(query.mock.calls[0][0]).toContain('LEFT JOIN merchant_profiles');
  });
});