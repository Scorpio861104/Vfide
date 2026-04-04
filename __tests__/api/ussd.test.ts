/// <reference types="jest" />

import { POST } from '../../app/api/ussd/route';

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/ussd', () => {
  it('returns the main USSD menu for a new session', async () => {
    const form = new URLSearchParams();
    form.set('sessionId', 'abc123');
    form.set('phoneNumber', '+233555000000');
    form.set('text', '');

    const request = new Request('http://localhost:3000/api/ussd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const response = await POST(request as any);
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain('CON Welcome to VFIDE');
    expect(text).toContain('1. Pay Merchant');
  });

  it('confirms a merchant payment flow', async () => {
    const form = new URLSearchParams();
    form.set('sessionId', 'xyz789');
    form.set('phoneNumber', '+233555000001');
    form.set('text', '1*SHOP001*25*1');

    const request = new Request('http://localhost:3000/api/ussd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });

    const response = await POST(request as any);
    const text = await response.text();

    expect(text).toContain('END Payment of 25 VFIDE to SHOP001 submitted');
  });
});
