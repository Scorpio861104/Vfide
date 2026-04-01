/**
 * Merchant Webhook Endpoints API
 * 
 * GET    — List webhook endpoints for authenticated merchant
 * POST   — Register a new webhook endpoint
 * PATCH  — Update an existing webhook endpoint
 * DELETE — Remove a webhook endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { isIP } from 'node:net';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{3,40}$/;

const VALID_EVENTS = [
  'payment.completed',
  'payment.failed',
  'refund.initiated',
  'refund.completed',
  'escrow.created',
  'escrow.funded',
  'escrow.released',
  'escrow.disputed',
  'escrow.resolved',
  'invoice.created',
  'invoice.paid',
  'invoice.overdue',
  'subscription.created',
  'subscription.renewed',
  'subscription.cancelled',
  'subscription.payment_failed',
  'merchant.suspended',
  'merchant.reinstated',
] as const;

const webhookCreateSchema = z.object({
  url: z.string().trim(),
  events: z.array(z.enum(VALID_EVENTS)).min(1),
  description: z.string().max(200).optional(),
});

const webhookPatchSchema = z.object({
  id: z.number().int().positive(),
  url: z.string().trim().optional(),
  events: z.array(z.enum(VALID_EVENTS)).min(1).optional(),
  description: z.string().max(200).optional(),
  status: z.enum(['active', 'paused']).optional(),
});

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;

    const hostname = parsed.hostname.toLowerCase();
    if (!hostname) return false;

    // Block obvious local targets.
    if (hostname === 'localhost' || hostname.endsWith('.local')) return false;

    // Block private/link-local/loopback literal IPs.
    const ipVersion = isIP(hostname);
    if (ipVersion === 4) {
      if (
        hostname.startsWith('10.') ||
        hostname.startsWith('127.') ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('169.254.')
      ) {
        return false;
      }

      const octets = hostname.split('.').map((v) => Number(v));
      const secondOctet = octets.length === 4 ? octets[1] : undefined;
      if (octets.length === 4 && octets[0] === 172 && typeof secondOctet === 'number' && secondOctet >= 16 && secondOctet <= 31) {
        return false;
      }
    }

    if (ipVersion === 6) {
      const normalized = hostname.replace(/\[|\]/g, '').toLowerCase();
      if (normalized === '::1' || normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

async function getAuthAddress(request: NextRequest): Promise<string | NextResponse> {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const address = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return address;
}

// ─────────────────────────── GET: List endpoints
export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const result = await query(
      `SELECT e.id, e.url, e.events, e.status, e.description, e.failure_count,
              e.last_success_at, e.last_failure_at, e.created_at,
              COALESCE(
                (SELECT json_agg(sub ORDER BY sub.created_at DESC)
                 FROM (
                   SELECT d.id, d.event_type, d.response_status, d.delivered, d.attempt, d.created_at
                   FROM merchant_webhook_deliveries d
                   WHERE d.endpoint_id = e.id
                   ORDER BY d.created_at DESC
                   LIMIT 10
                 ) sub),
                '[]'::json
              ) AS recent_deliveries
       FROM merchant_webhook_endpoints e
       WHERE e.merchant_address = $1
       ORDER BY e.created_at DESC`,
      [authAddress]
    );

    return NextResponse.json({ endpoints: result.rows });
  } catch (error) {
    logger.error('[Webhooks GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

// ─────────────────────────── POST: Create endpoint
export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = webhookCreateSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { url, events, description } = body;

    // Validate URL (HTTPS only)
    if (typeof url !== 'string' || !isValidUrl(url)) {
      return NextResponse.json({ error: 'URL must be a valid HTTPS URL' }, { status: 400 });
    }

    // Validate events
    // Limit endpoints per merchant
    const countResult = await query(
      'SELECT COUNT(*) as count FROM merchant_webhook_endpoints WHERE merchant_address = $1',
      [authAddress]
    );
    if (Number(countResult.rows[0]?.count) >= 10) {
      return NextResponse.json({ error: 'Maximum 10 webhook endpoints per merchant' }, { status: 400 });
    }

    // Generate signing secret
    const secret = randomBytes(32).toString('hex');

    const result = await query(
      `INSERT INTO merchant_webhook_endpoints
       (merchant_address, url, secret, events, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, url, events, status, description, created_at`,
      [authAddress, url, secret, events, description ?? null]
    );

    return NextResponse.json({
      endpoint: result.rows[0],
      secret, // Show once — merchant must store it
    }, { status: 201 });
  } catch (error) {
    logger.error('[Webhooks POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create webhook' }, { status: 500 });
  }
}

// ─────────────────────────── PATCH: Update endpoint
export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const parsedBody = webhookPatchSchema.safeParse(await request.json());
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const body = parsedBody.data;
    const { id, url, events, description, status } = body;

    // Verify ownership
    const existing = await query(
      'SELECT id FROM merchant_webhook_endpoints WHERE id = $1 AND merchant_address = $2',
      [id, authAddress]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 });
    }

    // Build dynamic update
    const updates: string[] = ['updated_at = NOW()'];
    const params: (string | number | boolean | string[] | null)[] = [];
    let paramIndex = 1;

    if (typeof url === 'string') {
      if (!isValidUrl(url)) {
        return NextResponse.json({ error: 'URL must be a valid HTTPS URL' }, { status: 400 });
      }
      updates.push(`url = $${paramIndex++}`);
      params.push(url);
    }
    if (events) {
      updates.push(`events = $${paramIndex++}`);
      params.push(events);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (status) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
      // Reset failure count when reactivating
      if (status === 'active') {
        updates.push('failure_count = 0');
      }
    }

    params.push(id);
    const result = await query(
      `UPDATE merchant_webhook_endpoints SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    return NextResponse.json({ endpoint: result.rows[0] });
  } catch (error) {
    logger.error('[Webhooks PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update webhook' }, { status: 500 });
  }
}

// ─────────────────────────── DELETE: Remove endpoint
export async function DELETE(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authAddress = await getAuthAddress(request);
  if (authAddress instanceof NextResponse) return authAddress;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id || !/^\d+$/.test(id)) {
      return NextResponse.json({ error: 'Valid endpoint ID required' }, { status: 400 });
    }

    const result = await query(
      'DELETE FROM merchant_webhook_endpoints WHERE id = $1 AND merchant_address = $2 RETURNING id',
      [Number(id), authAddress]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    logger.error('[Webhooks DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
