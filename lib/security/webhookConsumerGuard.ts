import { Redis } from '@upstash/redis';
import { verifySignedWebhook } from './webhookVerification';

export interface WebhookReplayStore {
  setIfAbsent(key: string, ttlSeconds: number): Promise<boolean>;
}

export interface WebhookReplayTelemetryEvent {
  status: 'accepted' | 'rejected';
  reason?: string;
  source?: string;
  replayKey?: string;
  timestamp?: number;
}

export interface WebhookReplayTelemetry {
  record(event: WebhookReplayTelemetryEvent): Promise<void>;
}

export class InMemoryWebhookReplayStore implements WebhookReplayStore {
  private readonly entries = new Map<string, number>();

  async setIfAbsent(key: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);

    for (const [existingKey, existingExpiry] of this.entries) {
      if (existingExpiry <= now) {
        this.entries.delete(existingKey);
      }
    }

    const existing = this.entries.get(key);
    if (existing && existing > now) {
      return false;
    }

    this.entries.set(key, expiresAt);
    return true;
  }
}

export class UpstashWebhookReplayStore implements WebhookReplayStore {
  constructor(private readonly redis: Redis) {}

  async setIfAbsent(key: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(key, '1', {
      nx: true,
      ex: ttlSeconds,
    });

    return result === 'OK';
  }
}

export function createUpstashWebhookReplayStoreFromEnv(): WebhookReplayStore {
  return new UpstashWebhookReplayStore(Redis.fromEnv());
}

export interface VerifyAndGuardWebhookParams {
  body: string;
  signatureHeader: string | null | undefined;
  timestampHeader: string | null | undefined;
  secret: string;
  replayStore: WebhookReplayStore;
  telemetry?: WebhookReplayTelemetry;
  source?: string;
  nowMs?: number;
  maxSkewSeconds?: number;
  replayTtlSeconds?: number;
}

export interface VerifyAndGuardWebhookResult {
  valid: boolean;
  reason?: string;
  replayKey?: string;
  timestamp?: number;
}

function resolveReplayTtlSeconds(value: number | undefined, maxSkewSeconds: number | undefined): number {
  const base = Number.isFinite(value) && (value as number) > 0
    ? Math.floor(value as number)
    : 600;

  const skewFloor = Number.isFinite(maxSkewSeconds)
    ? Math.max(Math.floor(maxSkewSeconds as number) + 60, 120)
    : 120;

  return Math.max(base, skewFloor);
}

async function recordTelemetry(
  telemetry: WebhookReplayTelemetry | undefined,
  event: WebhookReplayTelemetryEvent
): Promise<void> {
  if (!telemetry) return;
  try {
    await telemetry.record(event);
  } catch {
    // Telemetry must not break webhook verification flow.
  }
}

export async function verifyAndGuardWebhookReplay(
  params: VerifyAndGuardWebhookParams
): Promise<VerifyAndGuardWebhookResult> {
  const verification = verifySignedWebhook({
    body: params.body,
    signatureHeader: params.signatureHeader,
    timestampHeader: params.timestampHeader,
    secret: params.secret,
    nowMs: params.nowMs,
    maxSkewSeconds: params.maxSkewSeconds,
  });

  if (!verification.valid || !verification.replayKey) {
    await recordTelemetry(params.telemetry, {
      status: 'rejected',
      reason: verification.reason || 'Invalid webhook signature',
      source: params.source,
      timestamp: verification.timestamp,
    });

    return {
      valid: false,
      reason: verification.reason || 'Invalid webhook signature',
    };
  }

  const replayTtlSeconds = resolveReplayTtlSeconds(params.replayTtlSeconds, params.maxSkewSeconds);
  const accepted = await params.replayStore.setIfAbsent(verification.replayKey, replayTtlSeconds);

  if (!accepted) {
    await recordTelemetry(params.telemetry, {
      status: 'rejected',
      reason: 'Replay detected',
      source: params.source,
      replayKey: verification.replayKey,
      timestamp: verification.timestamp,
    });

    return {
      valid: false,
      reason: 'Replay detected',
      replayKey: verification.replayKey,
      timestamp: verification.timestamp,
    };
  }

  await recordTelemetry(params.telemetry, {
    status: 'accepted',
    source: params.source,
    replayKey: verification.replayKey,
    timestamp: verification.timestamp,
  });

  return {
    valid: true,
    replayKey: verification.replayKey,
    timestamp: verification.timestamp,
  };
}
