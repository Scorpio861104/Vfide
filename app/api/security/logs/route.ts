import { NextRequest, NextResponse } from 'next/server';
import { createHash, createHmac } from 'node:crypto';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';
import { getRequestCorrelationContext } from '@/lib/security/requestContext';
import { logger } from '@/lib/logger';

const DEFAULT_LOGS_LIMIT = 200;
const MAX_LOGS_LIMIT = 1000;
const MAX_TYPE_LENGTH = 64;
const MAX_SEVERITY_LENGTH = 16;
const MAX_MESSAGE_LENGTH = 2000;
const MAX_USER_AGENT_LENGTH = 1024;
const MAX_LOCATION_LENGTH = 128;
const MAX_DEVICE_ID_LENGTH = 128;
const SECURITY_LOG_RETENTION_DAYS_ENV = 'SECURITY_LOG_RETENTION_DAYS';
const SECURITY_ALERT_WEBHOOK_URL_ENV = 'SECURITY_ALERT_WEBHOOK_URL';
const SECURITY_ALERT_WEBHOOK_TIMEOUT_MS_ENV = 'SECURITY_ALERT_WEBHOOK_TIMEOUT_MS';
const SECURITY_ALERT_WEBHOOK_SECRET_ENV = 'SECURITY_ALERT_WEBHOOK_SECRET';
const SECURITY_ALERT_RUNBOOK_URL_ENV = 'SECURITY_ALERT_RUNBOOK_URL';
const SECURITY_ALERT_DEDUP_WINDOW_SECONDS_ENV = 'SECURITY_ALERT_DEDUP_WINDOW_SECONDS';
const SECURITY_ALERT_DEDUP_KEY_SALT_ENV = 'SECURITY_ALERT_DEDUP_KEY_SALT';
const DEFAULT_SECURITY_LOG_RETENTION_DAYS = 30;
const MIN_SECURITY_LOG_RETENTION_DAYS = 1;
const MAX_SECURITY_LOG_RETENTION_DAYS = 365;
const DEFAULT_ALERT_TIMEOUT_MS = 5000;
const DEFAULT_ALERT_DEDUP_WINDOW_SECONDS = 300;
const MIN_ALERT_DEDUP_WINDOW_SECONDS = 30;
const MAX_ALERT_DEDUP_WINDOW_SECONDS = 24 * 60 * 60;
const VALID_SEVERITIES = ['info', 'warning', 'critical'] as const;
const VALID_TYPES = [
  'login',
  'logout',
  'failed_login',
  '2fa_enabled',
  '2fa_disabled',
  '2fa_verified',
  '2fa_failed',
  'biometric_enrolled',
  'biometric_removed',
  'biometric_verified',
  'biometric_failed',
  'password_changed',
  'email_changed',
  'session_expired',
  'suspicious_activity',
  'threat_detected',
  'security_setting_changed',
] as const;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;

let initSecurityEventLogsTablePromise: Promise<void> | null = null;
let initSecurityAlertDispatchesTablePromise: Promise<void> | null = null;
let lastSecurityLogsCleanupAtMs = 0;
const SECURITY_LOG_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

function parsePositiveInteger(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function parseEnvInteger(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function resolveSecurityLogRetentionDays(): number {
  const configured = parseEnvInteger(process.env[SECURITY_LOG_RETENTION_DAYS_ENV]);
  if (configured === null) {
    return DEFAULT_SECURITY_LOG_RETENTION_DAYS;
  }
  if (configured < MIN_SECURITY_LOG_RETENTION_DAYS) {
    return MIN_SECURITY_LOG_RETENTION_DAYS;
  }
  if (configured > MAX_SECURITY_LOG_RETENTION_DAYS) {
    return MAX_SECURITY_LOG_RETENTION_DAYS;
  }
  return configured;
}

function resolveAlertTimeoutMs(): number {
  const configured = parseEnvInteger(process.env[SECURITY_ALERT_WEBHOOK_TIMEOUT_MS_ENV]);
  if (configured === null) {
    return DEFAULT_ALERT_TIMEOUT_MS;
  }
  return Math.min(configured, 30000);
}

function resolveAlertDedupWindowSeconds(): number {
  const configured = parseEnvInteger(process.env[SECURITY_ALERT_DEDUP_WINDOW_SECONDS_ENV]);
  if (configured === null) {
    return DEFAULT_ALERT_DEDUP_WINDOW_SECONDS;
  }
  if (configured < MIN_ALERT_DEDUP_WINDOW_SECONDS) {
    return MIN_ALERT_DEDUP_WINDOW_SECONDS;
  }
  if (configured > MAX_ALERT_DEDUP_WINDOW_SECONDS) {
    return MAX_ALERT_DEDUP_WINDOW_SECONDS;
  }
  return configured;
}

function buildCriticalAlertDedupKey(params: { address: string; type: string; message: string }): string {
  const salt = process.env[SECURITY_ALERT_DEDUP_KEY_SALT_ENV] || '';
  const canonical = `${params.address.toLowerCase()}|${params.type.toLowerCase()}|${params.message.trim().toLowerCase()}`;
  return createHash('sha256').update(`${salt}:${canonical}`).digest('hex');
}

function normalizeOptionalString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, maxLength);
}

function isValidSeverity(value: string): value is (typeof VALID_SEVERITIES)[number] {
  return VALID_SEVERITIES.includes(value as (typeof VALID_SEVERITIES)[number]);
}

function isValidType(value: string): value is (typeof VALID_TYPES)[number] {
  return VALID_TYPES.includes(value as (typeof VALID_TYPES)[number]);
}

async function ensureSecurityEventLogsTable(): Promise<void> {
  if (initSecurityEventLogsTablePromise) {
    await initSecurityEventLogsTablePromise;
    return;
  }

  initSecurityEventLogsTablePromise = (async () => {
    await query(
      `CREATE TABLE IF NOT EXISTS security_event_logs (
         id BIGSERIAL PRIMARY KEY,
         address TEXT NOT NULL,
         ts TIMESTAMPTZ NOT NULL,
         type TEXT NOT NULL,
         severity TEXT NOT NULL,
         message TEXT NOT NULL,
         details JSONB,
         user_agent TEXT,
         location TEXT,
         device_id TEXT,
         ip_hash TEXT,
         created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );

    await query(
      'CREATE INDEX IF NOT EXISTS idx_security_event_logs_address_ts ON security_event_logs(address, ts DESC)'
    );
  })().catch((error) => {
    initSecurityEventLogsTablePromise = null;
    throw error;
  });

  await initSecurityEventLogsTablePromise;
}

async function ensureSecurityAlertDispatchesTable(): Promise<void> {
  if (initSecurityAlertDispatchesTablePromise) {
    await initSecurityAlertDispatchesTablePromise;
    return;
  }

  initSecurityAlertDispatchesTablePromise = (async () => {
    await query(
      `CREATE TABLE IF NOT EXISTS security_alert_dispatches (
         dedup_key TEXT PRIMARY KEY,
         last_sent_at TIMESTAMPTZ NOT NULL,
         suppressed_count INTEGER NOT NULL DEFAULT 0,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       )`
    );

    await query(
      'CREATE INDEX IF NOT EXISTS idx_security_alert_dispatches_last_sent_at ON security_alert_dispatches(last_sent_at DESC)'
    );
  })().catch((error) => {
    initSecurityAlertDispatchesTablePromise = null;
    throw error;
  });

  await initSecurityAlertDispatchesTablePromise;
}

async function maybeRunSecurityLogsCleanup(): Promise<void> {
  const now = Date.now();
  if (now - lastSecurityLogsCleanupAtMs < SECURITY_LOG_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastSecurityLogsCleanupAtMs = now;

  try {
    const retentionDays = resolveSecurityLogRetentionDays();
    await query(
      `DELETE FROM security_event_logs
       WHERE ts < NOW() - ($1::int * INTERVAL '1 day')`,
      [retentionDays]
    );

    await query(
      `DELETE FROM security_alert_dispatches
       WHERE last_sent_at < NOW() - INTERVAL '7 days'`
    );
  } catch (error) {
    logger.warn('[Security Logs Cleanup] Failed:', error);
  }
}

async function shouldDispatchCriticalAlert(params: {
  address: string;
  type: string;
  message: string;
}): Promise<{ shouldDispatch: boolean; suppressedCount: number }> {
  try {
    await ensureSecurityAlertDispatchesTable();
    const dedupWindowSeconds = resolveAlertDedupWindowSeconds();
    const dedupKey = buildCriticalAlertDedupKey(params);

    const existingResult = await query<{ last_sent_at: string; suppressed_count: string }>(
      `SELECT last_sent_at::text, suppressed_count::text
       FROM security_alert_dispatches
       WHERE dedup_key = $1
       LIMIT 1`,
      [dedupKey]
    );

    const existing = existingResult.rows[0];
    if (existing) {
      const lastSentMs = Date.parse(existing.last_sent_at);
      if (Number.isFinite(lastSentMs) && Date.now() - lastSentMs < dedupWindowSeconds * 1000) {
        await query(
          `UPDATE security_alert_dispatches
           SET suppressed_count = suppressed_count + 1,
               updated_at = NOW()
           WHERE dedup_key = $1`,
          [dedupKey]
        );
        return { shouldDispatch: false, suppressedCount: 0 };
      }

      const suppressedCount = Number.parseInt(existing.suppressed_count || '0', 10);

      await query(
        `INSERT INTO security_alert_dispatches (dedup_key, last_sent_at, suppressed_count, updated_at)
         VALUES ($1, NOW(), 0, NOW())
         ON CONFLICT (dedup_key)
         DO UPDATE SET
           last_sent_at = EXCLUDED.last_sent_at,
           suppressed_count = 0,
           updated_at = NOW()`,
        [dedupKey]
      );

      return {
        shouldDispatch: true,
        suppressedCount: Number.isNaN(suppressedCount) ? 0 : suppressedCount,
      };
    }

    await query(
      `INSERT INTO security_alert_dispatches (dedup_key, last_sent_at, suppressed_count, updated_at)
       VALUES ($1, NOW(), 0, NOW())
       ON CONFLICT (dedup_key)
       DO UPDATE SET
         last_sent_at = EXCLUDED.last_sent_at,
         suppressed_count = 0,
         updated_at = NOW()`,
      [dedupKey]
    );

    return { shouldDispatch: true, suppressedCount: 0 };
  } catch (error) {
    // Fail-open to avoid suppressing critical alerts due infra issues.
    logger.warn('[Security Logs Alert] Dedup check failed, dispatching alert:', error);
    return { shouldDispatch: true, suppressedCount: 0 };
  }
}

async function notifyCriticalSecurityLog(params: {
  address: string;
  type: string;
  message: string;
  suppressedCount: number;
  requestId: string;
  ipHash: string;
  ipSource: string;
}): Promise<void> {
  const webhookUrl = process.env[SECURITY_ALERT_WEBHOOK_URL_ENV]?.trim();
  if (!webhookUrl) {
    return;
  }

  const webhookSecret = process.env[SECURITY_ALERT_WEBHOOK_SECRET_ENV]?.trim();
  const runbookUrl = process.env[SECURITY_ALERT_RUNBOOK_URL_ENV]?.trim() || null;

  const timeoutMs = resolveAlertTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const payload = {
    event: 'security.critical_log',
    alertKind: params.suppressedCount > 0 ? 'critical_log_rollup' : 'critical_log',
    address: params.address,
    type: params.type,
    message: params.message,
    suppressedCount: params.suppressedCount,
    requestId: params.requestId,
    ipHash: params.ipHash,
    ipSource: params.ipSource,
    runbook_url: runbookUrl,
    timestamp: new Date().toISOString(),
  };
  const body = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (webhookSecret) {
    const sentAtUnix = Math.floor(Date.now() / 1000).toString();
    const signaturePayload = `${sentAtUnix}.${body}`;
    const signature = createHmac('sha256', webhookSecret).update(signaturePayload).digest('hex');
    headers['X-VFIDE-Alert-Timestamp'] = sentAtUnix;
    headers['X-VFIDE-Alert-Signature'] = `v1=${signature}`;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn('[Security Logs Alert] Webhook returned non-success status', response.status);
    }
  } catch (error) {
    logger.warn('[Security Logs Alert] Webhook dispatch failed:', error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';

  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureSecurityEventLogsTable();

    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get('limit');
    const parsedLimit = rawLimit === null
      ? DEFAULT_LOGS_LIMIT
      : parsePositiveInteger(rawLimit);

    if (parsedLimit === null) {
      return NextResponse.json({ error: 'Invalid limit parameter' }, { status: 400 });
    }

    await maybeRunSecurityLogsCleanup();

    const limit = Math.min(parsedLimit, MAX_LOGS_LIMIT);

    const result = await query<{
      id: string;
      ts: string;
      type: string;
      severity: string;
      message: string;
      details: Record<string, unknown> | null;
      user_agent: string | null;
      location: string | null;
      device_id: string | null;
    }>(
      `SELECT id::text, ts::text, type, severity, message, details, user_agent, location, device_id
       FROM security_event_logs
       WHERE address = $1
       ORDER BY ts DESC
       LIMIT $2`,
      [authAddress, limit]
    );

    return NextResponse.json({ logs: result.rows });
  } catch (error) {
    logger.error('[Security Logs GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch security logs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';

  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureSecurityEventLogsTable();
    await maybeRunSecurityLogsCleanup();

    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 });
    }

    const type = typeof body.type === 'string' ? body.type.trim() : '';
    const severity = typeof body.severity === 'string' ? body.severity.trim().toLowerCase() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!type || !severity || !message) {
      return NextResponse.json({ error: 'type, severity, and message are required' }, { status: 400 });
    }

    if (type.length > MAX_TYPE_LENGTH || !isValidType(type)) {
      return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
    }

    if (severity.length > MAX_SEVERITY_LENGTH || !isValidSeverity(severity)) {
      return NextResponse.json({ error: 'Invalid severity' }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `message too long (max ${MAX_MESSAGE_LENGTH})` }, { status: 400 });
    }

    const details = isRecord(body.details) ? body.details : null;
    const detailsJson = details ? JSON.stringify(details) : null;
    const userAgent = normalizeOptionalString(body.userAgent, MAX_USER_AGENT_LENGTH);
    const location = normalizeOptionalString(body.location, MAX_LOCATION_LENGTH);
    const deviceId = normalizeOptionalString(body.deviceId, MAX_DEVICE_ID_LENGTH);

    const correlation = getRequestCorrelationContext(request.headers);

    const result = await query<{
      id: string;
      ts: string;
      type: string;
      severity: string;
      message: string;
      details: Record<string, unknown> | null;
      user_agent: string | null;
      location: string | null;
      device_id: string | null;
    }>(
      `INSERT INTO security_event_logs (
         address, ts, type, severity, message, details, user_agent, location, device_id, ip_hash
       )
       VALUES ($1, NOW(), $2, $3, $4, $5::jsonb, $6, $7, $8, $9)
       RETURNING id::text, ts::text, type, severity, message, details, user_agent, location, device_id`,
      [authAddress, type, severity, message, detailsJson, userAgent, location, deviceId, correlation.ipHash]
    );

    if (severity === 'critical') {
      const dedupDecision = await shouldDispatchCriticalAlert({ address: authAddress, type, message });
      if (dedupDecision.shouldDispatch) {
        await notifyCriticalSecurityLog({
          address: authAddress,
          type,
          message,
          suppressedCount: dedupDecision.suppressedCount,
          requestId: correlation.requestId,
          ipHash: correlation.ipHash,
          ipSource: correlation.ipSource,
        });
      }
    }

    return NextResponse.json({ success: true, log: result.rows[0] });
  } catch (error) {
    logger.error('[Security Logs POST] Error:', error);
    return NextResponse.json({ error: 'Failed to store security log' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';

  if (!authAddress || !isAddressLike(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureSecurityEventLogsTable();
    await maybeRunSecurityLogsCleanup();
    await query('DELETE FROM security_event_logs WHERE address = $1', [authAddress]);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Security Logs DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to clear security logs' }, { status: 500 });
  }
}
