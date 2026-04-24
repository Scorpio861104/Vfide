import { NextRequest, NextResponse } from 'next/server';
import { PATCH } from '../../../app/api/merchant/checkout/[id]/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/merchant/checkout/[id] payment hardening', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  const paymentLinkId = 'a'.repeat(32);
  const txHash = '0x' + 'b'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
  });

  it('rejects pay action when invoice is already pending_confirmation', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 42, status: 'pending_confirmation' }],
    });

    const request = new NextRequest(`http://localhost:3000/api/merchant/checkout/${paymentLinkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'pay', tx_hash: txHash }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: paymentLinkId }) });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/pending confirmation/i);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('only transitions sent/viewed invoices to pending_confirmation', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 77, status: 'viewed' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    const request = new NextRequest(`http://localhost:3000/api/merchant/checkout/${paymentLinkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'pay', tx_hash: txHash }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: paymentLinkId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);

    const updateCall = query.mock.calls[1];
    expect(updateCall[0]).toContain("status IN ('sent', 'viewed')");
    expect(updateCall[1][0]).toBe(txHash);
    expect(updateCall[1][1]).toBe(77);
  });

  it('returns 409 when status changes before update', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 88, status: 'viewed' }] })
      .mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const request = new NextRequest(`http://localhost:3000/api/merchant/checkout/${paymentLinkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'pay', tx_hash: txHash }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: paymentLinkId }) });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toMatch(/no longer allows payment update/i);
  });

  it('returns rate limit response when limiter blocks request', async () => {
    withRateLimit.mockResolvedValue(NextResponse.json({ error: 'rate limit' }, { status: 429 }));

    const request = new NextRequest(`http://localhost:3000/api/merchant/checkout/${paymentLinkId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'pay', tx_hash: txHash }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: paymentLinkId }) });

    expect(response.status).toBe(429);
    expect(query).not.toHaveBeenCalled();
  });
});
