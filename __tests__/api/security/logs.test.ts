import { NextRequest, NextResponse } from 'next/server';
import { DELETE, GET, POST } from '../../../app/api/security/logs/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

jest.mock('@/lib/security/requestContext', () => ({
  getRequestCorrelationContext: jest.fn(() => ({
    requestId: 'req_test',
    ipHash: 'iphash_test',
    ipSource: 'x-forwarded-for',
  })),
}));

describe('/api/security/logs', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const originalFetch = global.fetch;
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    query.mockReset();
    mockFetch.mockReset();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: '0x1111111111111111111111111111111111111123' } });
    process.env.SECURITY_ALERT_WEBHOOK_URL = '';
    process.env.SECURITY_ALERT_WEBHOOK_SECRET = '';
    process.env.SECURITY_ALERT_DEDUP_WINDOW_SECONDS = '300';
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe('GET', () => {
    it('returns logs for authenticated user', async () => {
      query
        .mockResolvedValueOnce({ rowCount: 0 }) // retention cleanup
        .mockResolvedValueOnce({ rowCount: 0 }) // dispatch cleanup
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              ts: new Date().toISOString(),
              type: 'login',
              severity: 'info',
              message: 'Signed in',
              details: { source: 'test' },
              user_agent: 'jest',
              location: 'UTC',
              device_id: 'device-1',
            },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/security/logs?limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.logs).toHaveLength(1);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        ['0x1111111111111111111111111111111111111123', 10]
      );
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM security_event_logs'),
        [30]
      );
    });

    it('rejects invalid limit', async () => {
      const request = new NextRequest('http://localhost:3000/api/security/logs?limit=bad');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid limit parameter');
    });
  });

  describe('POST', () => {
    it('stores validated security log', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // create table
        .mockResolvedValueOnce({ rows: [] }) // create index
        .mockResolvedValueOnce({ rowCount: 0 }) // retention cleanup
        .mockResolvedValueOnce({
          rows: [
            {
              id: '2',
              ts: new Date().toISOString(),
              type: 'failed_login',
              severity: 'warning',
              message: 'Failed login attempt',
              details: { count: 1 },
              user_agent: 'jest',
              location: 'UTC',
              device_id: 'device-2',
            },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'POST',
        body: JSON.stringify({
          type: 'failed_login',
          severity: 'warning',
          message: 'Failed login attempt',
          details: { count: 1 },
          userAgent: 'jest',
          location: 'UTC',
          deviceId: 'device-2',
          ipAddress: '8.8.8.8',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(query).toHaveBeenLastCalledWith(
        expect.stringContaining('ip_hash'),
        [
          '0x1111111111111111111111111111111111111123',
          'failed_login',
          'warning',
          'Failed login attempt',
          JSON.stringify({ count: 1 }),
          'jest',
          'UTC',
          'device-2',
          'iphash_test',
        ]
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('sends webhook alert for critical logs when configured', async () => {
      process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://alerts.example.com/webhook';
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      query
        .mockResolvedValueOnce({ rows: [] }) // create table
        .mockResolvedValueOnce({ rows: [] }) // create index
        .mockResolvedValueOnce({ rowCount: 0 }) // retention cleanup
        .mockResolvedValueOnce({
          rows: [
            {
              id: '9',
              ts: new Date().toISOString(),
              type: 'threat_detected',
              severity: 'critical',
              message: 'Critical threat',
              details: { source: 'test' },
              user_agent: 'jest',
              location: 'UTC',
              device_id: 'device-9',
            },
          ],
        });

      const request = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'POST',
        body: JSON.stringify({
          type: 'threat_detected',
          severity: 'critical',
          message: 'Critical threat',
          details: { source: 'test' },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://alerts.example.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('signs webhook payload when secret is configured', async () => {
      process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://alerts.example.com/webhook';
      process.env.SECURITY_ALERT_WEBHOOK_SECRET = 'test_webhook_secret';
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      query.mockImplementation(async (sql: unknown) => {
        const text = String(sql ?? '');
        if (text.includes('CREATE TABLE IF NOT EXISTS security_event_logs')) return { rows: [] };
        if (text.includes('idx_security_event_logs_address_ts')) return { rows: [] };
        if (text.includes('DELETE FROM security_event_logs')) return { rowCount: 0 };
        if (text.includes('DELETE FROM security_alert_dispatches')) return { rowCount: 0 };
        if (text.includes('INSERT INTO security_event_logs')) {
          return {
            rows: [{
              id: '13',
              ts: new Date().toISOString(),
              type: 'threat_detected',
              severity: 'critical',
              message: 'Signed critical threat',
              details: { source: 'test' },
              user_agent: 'jest',
              location: 'UTC',
              device_id: 'device-13',
            }],
          };
        }
        if (text.includes('CREATE TABLE IF NOT EXISTS security_alert_dispatches')) return { rows: [] };
        if (text.includes('idx_security_alert_dispatches_last_sent_at')) return { rows: [] };
        if (text.includes('SELECT last_sent_at::text, suppressed_count::text')) return { rows: [] };
        if (text.includes('INSERT INTO security_alert_dispatches')) return { rowCount: 1 };
        return { rows: [] };
      });

      const request = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'POST',
        body: JSON.stringify({
          type: 'threat_detected',
          severity: 'critical',
          message: 'Signed critical threat',
          details: { source: 'test' },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, init] = mockFetch.mock.calls[0];
      const headers = (init as { headers: Record<string, string> }).headers;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-VFIDE-Alert-Timestamp']).toMatch(/^\d+$/);
      expect(headers['X-VFIDE-Alert-Signature']).toMatch(/^v1=[a-f0-9]{64}$/);
    });

    it('suppresses duplicate critical webhook alerts inside dedup window', async () => {
      process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://alerts.example.com/webhook';
      process.env.SECURITY_ALERT_DEDUP_WINDOW_SECONDS = '3600';
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      let logInsertCount = 0;
      let hasSentAlert = false;
      query.mockImplementation(async (sql: unknown) => {
        const text = String(sql ?? '');
        if (text.includes('CREATE TABLE IF NOT EXISTS security_event_logs')) return { rows: [] };
        if (text.includes('idx_security_event_logs_address_ts')) return { rows: [] };
        if (text.includes('DELETE FROM security_event_logs')) return { rowCount: 0 };
        if (text.includes('DELETE FROM security_alert_dispatches')) return { rowCount: 0 };
        if (text.includes('INSERT INTO security_event_logs')) {
          logInsertCount += 1;
          return {
            rows: [{
              id: String(9 + logInsertCount),
              ts: new Date().toISOString(),
              type: 'threat_detected',
              severity: 'critical',
              message: 'Duplicate critical threat',
              details: { source: 'test' },
              user_agent: 'jest',
              location: 'UTC',
              device_id: 'device-10',
            }],
          };
        }
        if (text.includes('CREATE TABLE IF NOT EXISTS security_alert_dispatches')) return { rows: [] };
        if (text.includes('idx_security_alert_dispatches_last_sent_at')) return { rows: [] };
        if (text.includes('SELECT last_sent_at::text')) {
          return hasSentAlert
            ? { rows: [{ last_sent_at: new Date().toISOString() }] }
            : { rows: [] };
        }
        if (text.includes('INSERT INTO security_alert_dispatches')) {
          hasSentAlert = true;
          return { rowCount: 1 };
        }
        if (text.includes('UPDATE security_alert_dispatches')) return { rowCount: 1 };
        return { rows: [] };
      });

      const body = {
        type: 'threat_detected',
        severity: 'critical',
        message: 'Duplicate critical threat',
        details: { source: 'test' },
      };

      const firstRequest = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      const secondRequest = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const first = await POST(firstRequest);
      const second = await POST(secondRequest);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('includes suppressedCount when dispatching rollup alert after dedup window', async () => {
      process.env.SECURITY_ALERT_WEBHOOK_URL = 'https://alerts.example.com/webhook';
      process.env.SECURITY_ALERT_DEDUP_WINDOW_SECONDS = '60';
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      query.mockImplementation(async (sql: unknown) => {
        const text = String(sql ?? '');
        if (text.includes('CREATE TABLE IF NOT EXISTS security_event_logs')) return { rows: [] };
        if (text.includes('idx_security_event_logs_address_ts')) return { rows: [] };
        if (text.includes('DELETE FROM security_event_logs')) return { rowCount: 0 };
        if (text.includes('DELETE FROM security_alert_dispatches')) return { rowCount: 0 };
        if (text.includes('INSERT INTO security_event_logs')) {
          return {
            rows: [{
              id: '12',
              ts: new Date().toISOString(),
              type: 'threat_detected',
              severity: 'critical',
              message: 'Recovered critical threat',
              details: { source: 'test' },
              user_agent: 'jest',
              location: 'UTC',
              device_id: 'device-12',
            }],
          };
        }
        if (text.includes('CREATE TABLE IF NOT EXISTS security_alert_dispatches')) return { rows: [] };
        if (text.includes('idx_security_alert_dispatches_last_sent_at')) return { rows: [] };
        if (text.includes('SELECT last_sent_at::text, suppressed_count::text')) {
          return {
            rows: [{
              last_sent_at: new Date(Date.now() - (10 * 60 * 1000)).toISOString(),
              suppressed_count: '4',
            }],
          };
        }
        if (text.includes('INSERT INTO security_alert_dispatches')) return { rowCount: 1 };
        return { rows: [] };
      });

      const request = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'POST',
        body: JSON.stringify({
          type: 'threat_detected',
          severity: 'critical',
          message: 'Recovered critical threat',
          details: { source: 'test' },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [, init] = mockFetch.mock.calls[0];
      const body = JSON.parse((init as { body: string }).body);
      expect(body.alertKind).toBe('critical_log_rollup');
      expect(body.suppressedCount).toBe(4);
    });

    it('rejects invalid type', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // create table
        .mockResolvedValueOnce({ rows: [] }); // create index

      const request = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'POST',
        body: JSON.stringify({
          type: 'unknown_type',
          severity: 'warning',
          message: 'x',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid log type');
    });

    it('rejects invalid severity', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // create table
        .mockResolvedValueOnce({ rows: [] }); // create index

      const request = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'POST',
        body: JSON.stringify({
          type: 'login',
          severity: 'high',
          message: 'x',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid severity');
    });
  });

  describe('DELETE', () => {
    it('clears logs for authenticated user', async () => {
      query
        .mockResolvedValueOnce({ rows: [] }) // create table
        .mockResolvedValueOnce({ rows: [] }) // create index
        .mockResolvedValueOnce({ rowCount: 0 }) // retention cleanup
        .mockResolvedValueOnce({ rowCount: 5 });

      const request = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'DELETE',
      });

      const response = await DELETE(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(query).toHaveBeenLastCalledWith('DELETE FROM security_event_logs WHERE address = $1', [
        '0x1111111111111111111111111111111111111123',
      ]);
    });

    it('propagates auth failure', async () => {
      requireAuth.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));

      const request = new NextRequest('http://localhost:3000/api/security/logs', {
        method: 'DELETE',
      });
      const response = await DELETE(request);

      expect(response.status).toBe(401);
    });
  });
});
