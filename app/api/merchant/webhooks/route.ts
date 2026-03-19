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
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

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

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
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
      `SELECT id, url, events, status, description, failure_count,
              last_success_at, last_failure_at, created_at
       FROM merchant_webhook_endpoints
       WHERE merchant_address = $1
       ORDER BY created_at DESC`,
      [authAddress]
    );

    // Fetch recent deliveries for each endpoint
    const endpoints = await Promise.all(
      result.rows.map(async (ep) => {
        const deliveries = await query(
          `SELECT id, event_type, response_status, delivered, attempt, created_at
           FROM merchant_webhook_deliveries
           WHERE endpoint_id = $1
           ORDER BY created_at DESC
           LIMIT 10`,
          [ep.id]
        );
        return { ...ep, recent_deliveries: deliveries.rows };
      })
    );

    return NextResponse.json({ endpoints });
  } catch (error) {
    console.error('[Webhooks GET] Error:', error);
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
    const body = await request.json() as Record<string, unknown>;
    const { url, events, description } = body;

    // Validate URL (HTTPS only)
    if (typeof url !== 'string' || !isValidUrl(url)) {
      return NextResponse.json({ error: 'URL must be a valid HTTPS URL' }, { status: 400 });
    }

    // Validate events
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'At least one event type is required' }, { status: 400 });
    }
    const invalidEvents = events.filter((e) => !VALID_EVENTS.includes(e as typeof VALID_EVENTS[number]));
    if (invalidEvents.length > 0) {
      return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(', ')}` }, { status: 400 });
    }

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
      [authAddress, url, secret, events, typeof description === 'string' ? description.slice(0, 200) : null]
    );

    return NextResponse.json({
      endpoint: result.rows[0],
      secret, // Show once — merchant must store it
    }, { status: 201 });
  } catch (error) {
    console.error('[Webhooks POST] Error:', error);
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
    const body = await request.json() as Record<string, unknown>;
    const { id, url, events, description, status } = body;

    if (typeof id !== 'number') {
      return NextResponse.json({ error: 'Endpoint ID required' }, { status: 400 });
    }

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
    if (Array.isArray(events)) {
      const invalidEvents = events.filter((e) => !VALID_EVENTS.includes(e as typeof VALID_EVENTS[number]));
      if (invalidEvents.length > 0) {
        return NextResponse.json({ error: `Invalid events: ${invalidEvents.join(', ')}` }, { status: 400 });
      }
      updates.push(`events = $${paramIndex++}`);
      params.push(events);
    }
    if (typeof description === 'string') {
      updates.push(`description = $${paramIndex++}`);
      params.push(description.slice(0, 200));
    }
    if (typeof status === 'string' && ['active', 'paused'].includes(status)) {
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
    console.error('[Webhooks PATCH] Error:', error);
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
    console.error('[Webhooks DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }
}
