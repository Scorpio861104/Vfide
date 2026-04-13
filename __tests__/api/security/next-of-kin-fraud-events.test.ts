import { NextRequest } from 'next/server';
import { GET, POST } from '../../../app/api/security/next-of-kin-fraud-events/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/security/next-of-kin-fraud-events', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({
      user: { address: '0x9999999999999999999999999999999999999999' },
    });
  });

  it('accepts valid next of kin fraud telemetry payload', async () => {
    const request = new NextRequest('http://localhost:3000/api/security/next-of-kin-fraud-events', {
      method: 'POST',
      body: JSON.stringify({
        vault: '0x1111111111111111111111111111111111111111',
        label: 'Family Legacy Vault',
        source: 'next-of-kin-inbox',
        nextOfKin: '0x2222222222222222222222222222222222222222',
        approvals: 1,
        threshold: 2,
        active: true,
        denied: false,
        watcher: '0x3333333333333333333333333333333333333333',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('rejects invalid vault address', async () => {
    const request = new NextRequest('http://localhost:3000/api/security/next-of-kin-fraud-events', {
      method: 'POST',
      body: JSON.stringify({
        vault: 'not-an-address',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns aggregated next of kin fraud telemetry from GET', async () => {
    const post = new NextRequest('http://localhost:3000/api/security/next-of-kin-fraud-events', {
      method: 'POST',
      body: JSON.stringify({
        vault: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        source: 'next-of-kin-inbox',
      }),
    });

    await POST(post);

    const getRequest = new NextRequest('http://localhost:3000/api/security/next-of-kin-fraud-events?sinceMinutes=120&limit=20');
    const response = await GET(getRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.total).toBeGreaterThanOrEqual(1);
    expect(data.summary.bySource['next-of-kin-inbox']).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(data.events)).toBe(true);
  });
});
