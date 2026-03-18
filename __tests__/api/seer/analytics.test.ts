import { NextRequest } from 'next/server';
import { GET } from '../../../app/api/seer/analytics/route';

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

describe('/api/seer/analytics', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { query } = require('@/lib/db');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid windowHours', async () => {
    withRateLimit.mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/seer/analytics?windowHours=abc');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid windowHours');
  });

  it('returns 200 with summary payload when queries succeed', async () => {
    withRateLimit.mockResolvedValue(null);

    query
      .mockResolvedValueOnce({
        rows: [{
          total_events: 10,
          allowed_events: 6,
          warned_events: 1,
          delayed_events: 2,
          blocked_events: 1,
          score_set_events: 4,
          appeals_opened: 2,
          appeals_resolved: 1,
          unique_subjects: 3,
          avg_score_delta_abs: 1.2,
          avg_confidence: 0.8,
        }],
      })
      .mockResolvedValueOnce({
        rows: [{ day: new Date('2026-03-01T00:00:00.000Z'), total_events: 10, blocked_events: 1, delayed_events: 2, allowed_events: 6 }],
      })
      .mockResolvedValueOnce({
        rows: [{ reason_code: '121', count: 4 }],
      });

    const request = new NextRequest('http://localhost:3000/api/seer/analytics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.summary.totalEvents).toBe(10);
    expect(Array.isArray(data.trends)).toBe(true);
    expect(Array.isArray(data.topReasonCodes)).toBe(true);
  });

  it('returns degraded payload for database auth failure', async () => {
    withRateLimit.mockResolvedValue(null);
    const dbAuthError = Object.assign(new Error('password authentication failed for user "postgres"'), {
      code: '28P01',
    });
    query.mockRejectedValue(dbAuthError);

    const request = new NextRequest('http://localhost:3000/api/seer/analytics');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.degraded).toBe(true);
    expect(data.summary.totalEvents).toBe(0);
    expect(data.trends).toEqual([]);
    expect(data.topReasonCodes).toEqual([]);
  });
});
