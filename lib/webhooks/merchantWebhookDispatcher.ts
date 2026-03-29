/**
 * Merchant Webhook Dispatcher
 * 
 * Delivers webhook events to merchant-registered endpoints with:
 * - HMAC-SHA256 signature verification
 * - Automatic retries with exponential backoff
 * - Delivery logging for auditability
 * - Auto-disable on repeated failures
 */

import { createHmac, randomUUID } from 'crypto';
import { lookup } from 'dns/promises';
import { isIP } from 'node:net';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

// ─────────────────────────── Types

export type WebhookEventType =
  | 'payment.completed'
  | 'payment.failed'
  | 'refund.initiated'
  | 'refund.completed'
  | 'escrow.created'
  | 'escrow.funded'
  | 'escrow.released'
  | 'escrow.disputed'
  | 'escrow.resolved'
  | 'invoice.created'
  | 'invoice.paid'
  | 'invoice.overdue'
  | 'subscription.created'
  | 'subscription.renewed'
  | 'subscription.cancelled'
  | 'subscription.payment_failed'
  | 'merchant.suspended'
  | 'merchant.reinstated';

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  created_at: string;
  data: Record<string, unknown>;
}

interface WebhookEndpoint {
  id: number;
  url: string;
  secret: string;
  events: string[];
  status: string;
  failure_count: number;
}

// ─────────────────────────── Constants

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 5000, 30000]; // 1s, 5s, 30s
const MAX_FAILURES_BEFORE_DISABLE = 10;
const DELIVERY_TIMEOUT_MS = 10000; // 10s per delivery attempt

function isBlockedIpAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map((part) => Number.parseInt(part, 10));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
      return true;
    }

    const [a, b] = parts;
    if (a === undefined || b === undefined) return true;
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (version === 6) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe80:')) return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    if (normalized.startsWith('::ffff:127.') || normalized.startsWith('::ffff:10.')) return true;
    return false;
  }

  return true;
}

async function validateWebhookDeliveryTarget(url: string): Promise<{ ok: true } | { ok: false; error: string }> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: 'Invalid webhook URL' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, error: 'Webhook URL must use HTTPS' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.local')) {
    return { ok: false, error: 'Webhook URL cannot target local hosts' };
  }

  try {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (records.length === 0) {
      return { ok: false, error: 'Webhook hostname did not resolve to any address' };
    }

    for (const record of records) {
      if (isBlockedIpAddress(record.address)) {
        return { ok: false, error: 'Webhook hostname resolves to a blocked private or loopback address' };
      }
    }
  } catch {
    return { ok: false, error: 'Failed to resolve webhook hostname' };
  }

  return { ok: true };
}

// ─────────────────────────── Signature

function signPayload(payload: string, secret: string): string {
  return `v1=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

// ─────────────────────────── Core Dispatch

/**
 * Dispatch a webhook event to all matching merchant endpoints.
 * Non-blocking — errors are logged, never thrown to caller.
 */
export async function dispatchWebhook(
  merchantAddress: string,
  eventType: WebhookEventType,
  data: Record<string, unknown>
): Promise<void> {
  try {
    // Find active endpoints that subscribe to this event type
    const result = await query<WebhookEndpoint>(
      `SELECT id, url, secret, events, status, failure_count
       FROM merchant_webhook_endpoints
       WHERE merchant_address = $1
         AND status = 'active'
         AND $2 = ANY(events)`,
      [merchantAddress.toLowerCase(), eventType]
    );

    if (result.rows.length === 0) return;

    const payload: WebhookPayload = {
      id: randomUUID(),
      event: eventType,
      created_at: new Date().toISOString(),
      data,
    };

    // Fire off deliveries in parallel (non-blocking)
    const deliveries = result.rows.map((endpoint) =>
      deliverWithRetries(endpoint, payload).catch(() => {
        // Swallow — already logged in deliverWithRetries
      })
    );

    // Don't await — let them complete in background
    void Promise.allSettled(deliveries);
  } catch (err) {
    logger.error('[Webhook] dispatch error:', err);
  }
}

// ─────────────────────────── Delivery with Retries

async function deliverWithRetries(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload
): Promise<void> {
  const targetValidation = await validateWebhookDeliveryTarget(endpoint.url);
  if (!targetValidation.ok) {
    await logDelivery(endpoint.id, payload.event, payload, null, null, 1, false, targetValidation.error);
    await query(
      `UPDATE merchant_webhook_endpoints
       SET failure_count = failure_count + 1,
           status = 'disabled',
           last_failure_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [endpoint.id]
    );
    return;
  }

  const body = JSON.stringify(payload);
  const signature = signPayload(body, endpoint.secret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Id': payload.id,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': timestamp,
          'User-Agent': 'VFIDE-Webhooks/1.0',
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody = await response.text().catch(() => '');

      // Log delivery
      await logDelivery(endpoint.id, payload.event, payload, response.status, responseBody, attempt, response.ok);

      if (response.ok) {
        // Reset failure count on success
        await query(
          `UPDATE merchant_webhook_endpoints
           SET failure_count = 0, last_success_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [endpoint.id]
        );
        return;
      }

      // Non-2xx response — retry if attempts remain
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 1000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      await logDelivery(endpoint.id, payload.event, payload, null, null, attempt, false, errorMessage);

      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt - 1] ?? 1000);
      }
    }
  }

  // All retries exhausted — increment failure count
  await query(
    `UPDATE merchant_webhook_endpoints
     SET failure_count = failure_count + 1,
         last_failure_at = NOW(),
         updated_at = NOW(),
         status = CASE WHEN failure_count + 1 >= $2 THEN 'disabled' ELSE status END
     WHERE id = $1`,
    [endpoint.id, MAX_FAILURES_BEFORE_DISABLE]
  );
}

// ─────────────────────────── Helpers

async function logDelivery(
  endpointId: number,
  eventType: string,
  payload: WebhookPayload,
  responseStatus: number | null,
  responseBody: string | null,
  attempt: number,
  delivered: boolean,
  error?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO merchant_webhook_deliveries
       (endpoint_id, event_type, payload, response_status, response_body, attempt, delivered, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [endpointId, eventType, JSON.stringify(payload), responseStatus, responseBody?.slice(0, 1000), attempt, delivered, error ?? null]
    );
  } catch (err) {
    logger.error('[Webhook] Failed to log delivery:', err);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
