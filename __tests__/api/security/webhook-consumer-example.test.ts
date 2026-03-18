import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/security/webhook-consumer-example/route';

jest.mock('@/lib/security/webhookConsumerGuard', () => ({
  createUpstashWebhookReplayStoreFromEnv: jest.fn(() => ({
    setIfAbsent: jest.fn().mockResolvedValue(true),
  })),
  verifyAndGuardWebhookReplay: jest.fn(),
}));

jest.mock('@/lib/security/requestContext', () => ({
  getRequestCorrelationContext: jest.fn(() => ({
    ipSource: 'forwarded',
    ipHash: 'abc123',
  })),
}));

jest.mock('@/lib/security/webhookReplayTelemetry', () => ({
  PostgresWebhookReplayTelemetry: jest.fn().mockImplementation(() => ({
    record: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('/api/security/webhook-consumer-example', () => {
  const { verifyAndGuardWebhookReplay } = require('@/lib/security/webhookConsumerGuard');

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SECURITY_ALERT_WEBHOOK_SECRET;
  });

  it('returns 500 when webhook secret is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/security/webhook-consumer-example', {
      method: 'POST',
      body: JSON.stringify({ event: 'security.alert' }),
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toContain('Webhook secret is not configured');
  });

  it('returns 401 when signature verification fails', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_SECRET = 'test-secret';
    verifyAndGuardWebhookReplay.mockResolvedValue({
      valid: false,
      reason: 'Replay detected',
    });

    const request = new NextRequest('http://localhost:3000/api/security/webhook-consumer-example', {
      method: 'POST',
      body: JSON.stringify({ event: 'security.alert' }),
      headers: {
        'content-type': 'application/json',
        'x-vfide-alert-signature': 'bad-sig',
        'x-vfide-alert-timestamp': String(Math.floor(Date.now() / 1000)),
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Replay detected');
  });

  it('returns 200 when webhook is valid', async () => {
    process.env.SECURITY_ALERT_WEBHOOK_SECRET = 'test-secret';
    verifyAndGuardWebhookReplay.mockResolvedValue({
      valid: true,
      replayKey: 'replay-key-1',
    });

    const request = new NextRequest('http://localhost:3000/api/security/webhook-consumer-example', {
      method: 'POST',
      body: JSON.stringify({ event: 'security.alert' }),
      headers: {
        'content-type': 'application/json',
        'x-vfide-alert-signature': 'good-sig',
        'x-vfide-alert-timestamp': String(Math.floor(Date.now() / 1000)),
      },
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toMatchObject({
      ok: true,
      replayKey: 'replay-key-1',
    });
  });
});
