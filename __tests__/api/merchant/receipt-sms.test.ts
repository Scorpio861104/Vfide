/// <reference types="jest" />

import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/merchant/receipts/sms/route';

jest.mock('@/lib/sms', () => ({
  sendReceiptSMS: jest.fn(),
}));

describe('/api/merchant/receipts/sms', () => {
  const { sendReceiptSMS } = require('@/lib/sms');

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('sends a receipt SMS for a completed checkout', async () => {
    sendReceiptSMS.mockResolvedValue({ success: true, provider: 'twilio', messageId: 'msg_123' });

    const request = new NextRequest('http://localhost:3000/api/merchant/receipts/sms', {
      method: 'POST',
      body: JSON.stringify({
        to: '+233501234567',
        merchantName: 'Kofi Fabrics',
        amount: '17.50',
        currency: 'USD',
        txHash: '0xabc123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

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
