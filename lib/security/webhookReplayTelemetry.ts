import { createHash } from 'node:crypto';
import { query } from '@/lib/db';
import type { WebhookReplayTelemetry, WebhookReplayTelemetryEvent } from './webhookConsumerGuard';

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const RETENTION_DAYS_ENV = 'SECURITY_WEBHOOK_REPLAY_TELEMETRY_RETENTION_DAYS';
const DEFAULT_RETENTION_DAYS = 30;
const MIN_RETENTION_DAYS = 1;
const MAX_RETENTION_DAYS = 365;
let lastCleanupMs = 0;
let replayTelemetrySchemaReady: Promise<void> | null = null;

async function ensureReplayTelemetrySchema(): Promise<void> {
  if (!replayTelemetrySchemaReady) {
    replayTelemetrySchemaReady = (async () => {
      await query(`
        CREATE TABLE IF NOT EXISTS security_webhook_replay_events (
          id BIGSERIAL PRIMARY KEY,
          ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          status TEXT NOT NULL,
          reason TEXT,
          source TEXT,
          replay_key_hash TEXT,
          event_timestamp TIMESTAMPTZ
        )
      `);
    })().catch((error) => {
      replayTelemetrySchemaReady = null;
      throw error;
    });
  }

  await replayTelemetrySchemaReady;
}

function parseEnvPositiveInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function resolveRetentionDays(): number {
  const configured = parseEnvPositiveInt(process.env[RETENTION_DAYS_ENV]);
  if (configured === null) return DEFAULT_RETENTION_DAYS;
  if (configured < MIN_RETENTION_DAYS) return MIN_RETENTION_DAYS;
  if (configured > MAX_RETENTION_DAYS) return MAX_RETENTION_DAYS;
  return configured;
}

function hashReplayKey(value: string | undefined): string | null {
  if (!value) return null;
  return createHash('sha256').update(value).digest('hex');
}

async function maybeCleanupTelemetry(): Promise<void> {
  await ensureReplayTelemetrySchema();

  const now = Date.now();
  if (now - lastCleanupMs < CLEANUP_INTERVAL_MS) return;
  lastCleanupMs = now;

  const retentionDays = resolveRetentionDays();
  try {
    await query(
      `DELETE FROM security_webhook_replay_events
       WHERE ts < NOW() - ($1::int * INTERVAL '1 day')`,
      [retentionDays]
    );
  } catch {
    // Cleanup should never block event recording.
  }
}

export class PostgresWebhookReplayTelemetry implements WebhookReplayTelemetry {
  async record(event: WebhookReplayTelemetryEvent): Promise<void> {
    await maybeCleanupTelemetry();

    await query(
      `INSERT INTO security_webhook_replay_events (
         status, reason, source, replay_key_hash, event_timestamp
       )
       VALUES ($1, $2, $3, $4, $5)`,
      [
        event.status,
        event.reason ?? null,
        event.source ?? null,
        hashReplayKey(event.replayKey),
        event.timestamp ?? null,
      ]
    );
  }
}
