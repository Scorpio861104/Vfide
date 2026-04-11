/// <reference types="jest" />

import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../../../app/api/merchant/receipts/sms/route';

jest.mock('@/lib/sms', () => ({
  sendReceiptSMS: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireOwnership: jest.fn(),
}));

describe('/api/merchant/receipts/sms', () => {
  const { sendReceiptSMS } = require('@/lib/sms');
  const { requireOwnership } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    requireOwnership.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111111' } });
  });

  it('rejects incomplete receipt payloads', async () => {
    const request = new NextRequest('http://localhost:3000/api/merchant/receipts/sms', {
      method: 'POST',
      body: JSON.stringify({ merchantName: 'Kofi Fabrics' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toMatch(/required/i);
  });

  it('blocks merchants from sending receipts for other wallets', async () => {
    requireOwnership.mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    );

    const request = new NextRequest('http://localhost:3000/api/merchant/receipts/sms', {
      method: 'POST',
      body: JSON.stringify({
        merchantAddress: '0x2222222222222222222222222222222222222222',
        to: '+233501234567',
        merchantName: 'Kofi Fabrics',
        amount: '17.50',
        currency: 'USD',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(403);
    expect(sendReceiptSMS).not.toHaveBeenCalled();
  });

  it('sends a receipt SMS for a completed checkout', async () => {
    sendReceiptSMS.mockResolvedValue({ success: true, provider: 'twilio', messageId: 'msg_123' });

    const request = new NextRequest('http://localhost:3000/api/merchant/receipts/sms', {
      method: 'POST',
      body: JSON.stringify({
        merchantAddress: '0x1111111111111111111111111111111111111111',
        to: '+233501234567',
        merchantName: 'Kofi Fabrics',
        amount: '17.50',
        currency: 'USD',
        txHash: '0xabc123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(requireOwnership).toHaveBeenCalledWith(request, '0x1111111111111111111111111111111111111111');
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(sendReceiptSMS).toHaveBeenCalledWith('+233501234567', {
      merchantName: 'Kofi Fabrics',
      amount: '17.50',
      currency: 'USD',
      txHash: '0xabc123',
    });
  });
});
