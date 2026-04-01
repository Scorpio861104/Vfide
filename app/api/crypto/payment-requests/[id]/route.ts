import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

// Allowed status transitions for payment requests
const ALLOWED_STATUSES = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'] as const;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{3,64}$/;
const TX_HASH_PATTERN = /^0x[a-fA-F0-9]{3,130}$/;

const paymentStatusSchema = z.string().trim().toLowerCase().refine(
  (value) => ALLOWED_STATUSES.includes(value as (typeof ALLOWED_STATUSES)[number]),
  { message: 'Invalid status' }
);

const putPaymentRequestSchema = z.object({
  status: paymentStatusSchema,
});

const patchPaymentRequestSchema = z.object({
  status: paymentStatusSchema,
  txHash: z.string().trim().regex(TX_HASH_PATTERN).optional(),
});

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function isAddressLike(value: string): boolean {
  return ADDRESS_PATTERN.test(value);
}

/**
 * Look up the authenticated user's DB id and verify they are a party to the given payment request.
 * Returns the userId on success, or a NextResponse error if the check fails.
 */
async function verifyOwnership(
  authAddress: string,
  pr: Record<string, unknown>
): Promise<{ userId: number } | NextResponse> {
  const userResult = await query(
    'SELECT id FROM users WHERE wallet_address = $1',
    [authAddress.toLowerCase()]
  );
  if (userResult.rows.length === 0) {
    return NextResponse.json({ error: 'User not found' }, { status: 403 });
  }
  const userId = (userResult.rows[0] as { id: number }).id;
  if (pr.from_user_id !== userId && pr.to_user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return { userId };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication — only parties involved should read a payment request
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  if (!authResult.user?.address || !isAddressLike(authResult.user.address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await params;
    const id =
      typeof resolvedParams?.id === 'string'
        ? parsePositiveInteger(resolvedParams.id.trim())
        : null;

    if (id === null) {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const result = await query(
      `SELECT * FROM payment_requests WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    const paymentRequest = result.rows[0]!;
    const ownership = await verifyOwnership(normalizeAddress(authResult.user.address), paymentRequest);
    if (ownership instanceof NextResponse) return ownership;

    return NextResponse.json({ request: paymentRequest });
  } catch (error) {
    logger.error('[Payment Request GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  if (!authResult.user?.address || !isAddressLike(authResult.user.address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof putPaymentRequestSchema>;
  try {
    const rawBody = await request.json();
    const parsed = putPaymentRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Payment Request PUT] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const resolvedParams = await params;
    const id =
      typeof resolvedParams?.id === 'string'
        ? parsePositiveInteger(resolvedParams.id.trim())
        : null;

    if (id === null) {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const normalizedStatus = body.status;

    // Verify the authenticated user is a party to this payment request
    const existing = await query('SELECT * FROM payment_requests WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    const ownership = await verifyOwnership(normalizeAddress(authResult.user.address), existing.rows[0]!);
    if (ownership instanceof NextResponse) return ownership;

    const result = await query(
      `UPDATE payment_requests
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, normalizedStatus]
    );

    return NextResponse.json({ request: result.rows[0] });
  } catch (error) {
    logger.error('[Payment Request PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  if (!authResult.user?.address || !isAddressLike(authResult.user.address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof patchPaymentRequestSchema>;
  try {
    const rawBody = await request.json();
    const parsed = patchPaymentRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Payment Request PATCH] Invalid JSON body', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const resolvedParams = await params;
    const id =
      typeof resolvedParams?.id === 'string'
        ? parsePositiveInteger(resolvedParams.id.trim())
        : null;

    if (id === null) {
      return NextResponse.json(
        { error: 'Invalid id parameter' },
        { status: 400 }
      );
    }

    const normalizedStatus = body.status;
    const normalizedTxHash = body.txHash ?? null;

    // Verify the authenticated user is a party to this payment request
    const existing = await query('SELECT * FROM payment_requests WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }
    const ownership = await verifyOwnership(normalizeAddress(authResult.user.address), existing.rows[0]!);
    if (ownership instanceof NextResponse) return ownership;

    const result = await query(
      `UPDATE payment_requests
       SET status = $2, tx_hash = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, normalizedStatus, normalizedTxHash]
    );

    return NextResponse.json({ success: true, request: result.rows[0] });
  } catch (error) {
    logger.error('[Payment Request PATCH] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update request';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
