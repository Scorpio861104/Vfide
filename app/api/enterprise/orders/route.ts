/**
 * Enterprise Orders API
 *
 * POST — Create an enterprise payment order.
 *        Called by the Enterprise Gateway tab when the user submits the Create Order form.
 *
 * GET  — List orders created by the authenticated wallet.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const createOrderSchema = z.object({
  orderId: z.string().trim().min(1).max(100),
  amount: z.coerce.number().positive().finite(),
  metadata: z.string().trim().max(1000).optional(),
});

function resolveAddress(user: JWTPayload): string | NextResponse {
  const addr = typeof user?.address === 'string'
    ? user.address.trim().toLowerCase()
    : '';
  if (!addr || !isAddress(addr)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return addr;
}

async function postHandler(request: NextRequest, user: JWTPayload): Promise<NextResponse> {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const address = resolveAddress(user);
  if (address instanceof NextResponse) return address;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { orderId, amount, metadata } = parsed.data;

  try {
    // Resolve user row (nullable FK — enterprise_orders allows user_id = NULL)
    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1 LIMIT 1',
      [address],
    );
    const userId = userResult.rows[0]?.id ?? null;

    const metadataValue = metadata ? JSON.stringify({ note: metadata }) : null;

    const result = await query<{ id: number; order_id: string; status: string; created_at: string }>(
      `INSERT INTO enterprise_orders (user_id, order_id, amount, metadata, status)
            VALUES ($1, $2, $3, $4, 'pending')
       RETURNING id, order_id, status, created_at`,
      [userId, orderId, amount, metadataValue],
    );

    return NextResponse.json({ order: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Enterprise Orders] Failed to create order', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<NextResponse> {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const address = resolveAddress(user);
  if (address instanceof NextResponse) return address;

  try {
    const result = await query<{
      id: number;
      order_id: string;
      amount: string;
      status: string;
      created_at: string;
    }>(
      `SELECT eo.id, eo.order_id, eo.amount, eo.status, eo.created_at
         FROM enterprise_orders eo
         JOIN users u ON u.id = eo.user_id
        WHERE u.wallet_address = $1
        ORDER BY eo.created_at DESC
        LIMIT 50`,
      [address],
    );

    return NextResponse.json({ orders: result.rows });
  } catch (error) {
    logger.error('[Enterprise Orders] Failed to fetch orders', error);
    return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
export const GET = withAuth(getHandler);
