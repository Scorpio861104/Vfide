import { NextRequest, NextResponse } from 'next/server';
import { GET } from '../../../app/api/security/webhook-replay-metrics/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('/api/security/webhook-replay-metrics', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { logger } = require('@/lib/logger');

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockReset();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
    process.env.SECURITY_MONITOR_REQUIRE_ALLOWLIST = 'false';
    process.env.SECURITY_MONITOR_ALLOWLIST = '';
    process.env.SECURITY_WEBHOOK_REPLAY_REJECT_THRESHOLD_1H = '25';
    process.env.SECURITY_MONITOR_API_TOKEN = '';
  });

  it('returns replay metrics for authenticated caller', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{
          accepted_1h: '12',
          rejected_1h: '3',
          accepted_24h: '100',
          rejected_24h: '15',
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ source: 'proxy:a1b2', rejected_count: '7' }],
      });

    const request = new NextRequest('http://localhost:3000/api/security/webhook-replay-metrics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.thresholdTriggered).toBe(false);
    expect(data.metrics).toEqual({
      accepted1h: 12,
      rejected1h: 3,
      accepted24h: 100,
      rejected24h: 15,
    });
    expect(data.topRejectedSources).toEqual([{ source: 'proxy:a1b2', rejectedCount: 7 }]);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('emits warning when rejection threshold is exceeded', async () => {
    process.env.SECURITY_WEBHOOK_REPLAY_REJECT_THRESHOLD_1H = '5';

    query.mockImplementation(async (sql: unknown) => {
      const text = String(sql ?? '');
      if (text.includes('COUNT(*) FILTER')) {
        return {
          rows: [{
            accepted_1h: '4',
            rejected_1h: '9',
            accepted_24h: '40',
            rejected_24h: '20',
          }],
        };
      }

      if (text.includes('GROUP BY source')) {
        return { rows: [] };
      }

      return { rows: [] };
    });

    const request = new NextRequest('http://localhost:3000/api/security/webhook-replay-metrics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.thresholdTriggered).toBe(true);
    expect(logger.warn).toHaveBeenCalledWith(
      'security.webhook_replay_spike',
      expect.objectContaining({ rejected1h: 9, threshold1h: 5 })
    );
  });

  it('returns 403 when allowlist is required and caller is not allowlisted', async () => {
    process.env.SECURITY_MONITOR_REQUIRE_ALLOWLIST = 'true';
    process.env.SECURITY_MONITOR_ALLOWLIST = '0x9999999999999999999999999999999999999999';

    const request = new NextRequest('http://localhost:3000/api/security/webhook-replay-metrics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
  });

  it('returns 401 for malformed authenticated address', async () => {
    requireAuth.mockResolvedValue({ user: { address: 'not-an-address' } });

    const request = new NextRequest('http://localhost:3000/api/security/webhook-replay-metrics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('propagates rate limit response', async () => {
    const rateLimitResponse = NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    withRateLimit.mockResolvedValue(rateLimitResponse);

    const request = new NextRequest('http://localhost:3000/api/security/webhook-replay-metrics');
    const response = await GET(request);

    expect(response.status).toBe(429);
  });

  it('allows machine-token access without wallet auth', async () => {
    process.env.SECURITY_MONITOR_API_TOKEN = 'monitor-token';

    query.mockImplementation(async (sql: unknown) => {
      const text = String(sql ?? '');
      if (text.includes('COUNT(*) FILTER')) {
        return {
          rows: [{
            accepted_1h: '1',
            rejected_1h: '0',
            accepted_24h: '8',
            rejected_24h: '2',
          }],
        };
      }
      if (text.includes('GROUP BY source')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const request = new NextRequest('http://localhost:3000/api/security/webhook-replay-metrics', {
      headers: {
        authorization: 'Bearer monitor-token',
      },
    });

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.accessMode).toBe('machine-token');
    expect(requireAuth).not.toHaveBeenCalled();
  });
});
