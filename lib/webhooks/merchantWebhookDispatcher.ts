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
    Promise.allSettled(deliveries).catch(() => {});
  } catch (err) {
    logger.error('[Webhook] dispatch error:', err);
  }
}

// ─────────────────────────── Delivery with Retries

async function deliverWithRetries(
  endpoint: WebhookEndpoint,
  payload: WebhookPayload
): Promise<void> {
  const body = JSON.stringify(payload);
  const signature = signPayload(body, endpoint.secret);
  const timestamp = Math.floor(Date.now() / 1000).toString();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

      const response = await fetch(endpoint.url, {
        method: 'POST',
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
