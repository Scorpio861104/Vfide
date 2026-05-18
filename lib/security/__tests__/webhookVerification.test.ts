import { createHmac } from 'node:crypto';
import { verifySignedWebhook } from '../webhookVerification';

function sign(secret: string, timestamp: number, body: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `v1=${digest}`;
}

describe('verifySignedWebhook', () => {
  const secret = 'test_webhook_secret';
  const body = JSON.stringify({ event: 'security.critical_log', value: 1 });
  const timestamp = 1_700_000_000;
  const nowMs = timestamp * 1000;

  it('accepts a valid signed payload in skew window', () => {
    const result = verifySignedWebhook({
      body,
      secret,
      signatureHeader: sign(secret, timestamp, body),
      timestampHeader: String(timestamp),
      nowMs,
    });

    expect(result.valid).toBe(true);
    expect(result.replayKey).toMatch(/^[a-f0-9]{64}$/);
    expect(result.timestamp).toBe(timestamp);
  });

  it('rejects missing headers', () => {
    const result = verifySignedWebhook({
      body,
      secret,
      signatureHeader: null,
      timestampHeader: null,
      nowMs,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Missing signature headers');
  });

  it('rejects unsupported signature version', () => {
    const result = verifySignedWebhook({
      body,
      secret,
      signatureHeader: 'v2=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      timestampHeader: String(timestamp),
      nowMs,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Unsupported signature version');
  });

  it('rejects stale timestamp outside skew window', () => {
    const staleTimestamp = timestamp - 3600;
    const result = verifySignedWebhook({
      body,
      secret,
      signatureHeader: sign(secret, staleTimestamp, body),
      timestampHeader: String(staleTimestamp),
      nowMs,
      maxSkewSeconds: 300,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Timestamp outside allowed skew window');
  });

  it('rejects invalid signature', () => {
    const result = verifySignedWebhook({
      body,
      secret,
      signatureHeader: 'v1=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      timestampHeader: String(timestamp),
      nowMs,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid signature');
  });
});
