import { NextRequest } from 'next/server';
import { GET, POST } from '../../../app/api/security/qr-signature-events/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/security/qr-signature-events', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: '0x1234567890123456789012345678901234567890' } });
  });

  it('accepts valid telemetry payload', async () => {
    const request = new NextRequest('http://localhost:3000/api/security/qr-signature-events', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'invalid',
        merchant: '0x1111111111111111111111111111111111111111',
        orderId: 'INV-100',
        source: 'qr',
        settlement: 'instant',
        exp: Math.floor(Date.now() / 1000) + 600,
        sigPrefix: '0xabc123',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('rejects invalid eventType', async () => {
    const request = new NextRequest('http://localhost:3000/api/security/qr-signature-events', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'other',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for malformed JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/security/qr-signature-events', {
      method: 'POST',
      body: '{"eventType":',
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns aggregated telemetry summary from GET', async () => {
    const postOne = new NextRequest('http://localhost:3000/api/security/qr-signature-events', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'invalid',
        merchant: '0x1111111111111111111111111111111111111111',
        orderId: 'INV-100',
        source: 'qr',
        settlement: 'instant',
      }),
    });

    const postTwo = new NextRequest('http://localhost:3000/api/security/qr-signature-events', {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'missing',
        merchant: '0x1111111111111111111111111111111111111111',
        orderId: 'INV-101',
        source: 'qr',
        settlement: 'instant',
      }),
    });

    await POST(postOne);
    await POST(postTwo);

    const getRequest = new NextRequest('http://localhost:3000/api/security/qr-signature-events?sinceMinutes=120&limit=20');
    const response = await GET(getRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.total).toBeGreaterThanOrEqual(2);
    expect(data.summary.byEventType.invalid).toBeGreaterThanOrEqual(1);
    expect(data.summary.byEventType.missing).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(data.events)).toBe(true);
    expect(Array.isArray(data.summary.topMerchants)).toBe(true);
  });
});
