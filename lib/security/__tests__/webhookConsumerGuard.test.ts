import { createHmac } from 'node:crypto';
import {
  InMemoryWebhookReplayStore,
  verifyAndGuardWebhookReplay,
  type WebhookReplayStore,
  type WebhookReplayTelemetry,
} from '../webhookConsumerGuard';

function sign(secret: string, timestamp: number, body: string): string {
  const digest = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return `v1=${digest}`;
}

describe('verifyAndGuardWebhookReplay', () => {
  const secret = 'consumer_test_secret';
  const body = JSON.stringify({ event: 'security.critical_log', id: 1 });
  const timestamp = 1_700_000_000;
  const nowMs = timestamp * 1000;

  it('accepts valid signed webhook and stores replay key', async () => {
    const replayStore = new InMemoryWebhookReplayStore();

    const result = await verifyAndGuardWebhookReplay({
      body,
      signatureHeader: sign(secret, timestamp, body),
      timestampHeader: String(timestamp),
      secret,
      replayStore,
      nowMs,
    });

    expect(result.valid).toBe(true);
    expect(result.replayKey).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects duplicate replay key on second delivery', async () => {
    const replayStore = new InMemoryWebhookReplayStore();

    const params = {
      body,
      signatureHeader: sign(secret, timestamp, body),
      timestampHeader: String(timestamp),
      secret,
      replayStore,
      nowMs,
    };

    const first = await verifyAndGuardWebhookReplay(params);
    const second = await verifyAndGuardWebhookReplay(params);

    expect(first.valid).toBe(true);
    expect(second.valid).toBe(false);
    expect(second.reason).toContain('Replay detected');
  });

  it('rejects invalid signature before replay store write', async () => {
    const replayStore: WebhookReplayStore = {
      setIfAbsent: jest.fn().mockResolvedValue(true),
    };

    const result = await verifyAndGuardWebhookReplay({
      body,
      signatureHeader: 'v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      timestampHeader: String(timestamp),
      secret,
      replayStore,
      nowMs,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid signature');
    expect(replayStore.setIfAbsent).not.toHaveBeenCalled();
  });

  it('uses replay TTL floor derived from skew window', async () => {
    const storeCalls: Array<{ key: string; ttlSeconds: number }> = [];
    const replayStore: WebhookReplayStore = {
      setIfAbsent: async (key, ttlSeconds) => {
        storeCalls.push({ key, ttlSeconds });
        return true;
      },
    };

    await verifyAndGuardWebhookReplay({
      body,
      signatureHeader: sign(secret, timestamp, body),
      timestampHeader: String(timestamp),
      secret,
      replayStore,
      nowMs,
      maxSkewSeconds: 300,
      replayTtlSeconds: 30,
    });

    expect(storeCalls).toHaveLength(1);
    expect(storeCalls[0]?.ttlSeconds).toBeGreaterThanOrEqual(360);
  });

  it('emits accepted telemetry event', async () => {
    const replayStore = new InMemoryWebhookReplayStore();
    const telemetryEvents: Array<{ status: string; reason?: string }> = [];
    const telemetry: WebhookReplayTelemetry = {
      record: async (event) => {
        telemetryEvents.push({ status: event.status, reason: event.reason });
      },
    };

    const result = await verifyAndGuardWebhookReplay({
      body,
      signatureHeader: sign(secret, timestamp, body),
      timestampHeader: String(timestamp),
      secret,
      replayStore,
      telemetry,
      source: 'unit-test-source',
      nowMs,
    });

    expect(result.valid).toBe(true);
    expect(telemetryEvents).toEqual([{ status: 'accepted', reason: undefined }]);
  });

  it('emits replay-rejected telemetry event', async () => {
    const replayStore = new InMemoryWebhookReplayStore();
    const telemetryEvents: Array<{ status: string; reason?: string }> = [];
    const telemetry: WebhookReplayTelemetry = {
      record: async (event) => {
        telemetryEvents.push({ status: event.status, reason: event.reason });
      },
    };

    const params = {
      body,
      signatureHeader: sign(secret, timestamp, body),
      timestampHeader: String(timestamp),
      secret,
      replayStore,
      telemetry,
      source: 'unit-test-source',
      nowMs,
    };

    await verifyAndGuardWebhookReplay(params);
    const second = await verifyAndGuardWebhookReplay(params);

    expect(second.valid).toBe(false);
    expect(telemetryEvents[1]).toEqual({ status: 'rejected', reason: 'Replay detected' });
  });
});
