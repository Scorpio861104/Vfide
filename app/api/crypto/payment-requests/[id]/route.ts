import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/lib/auth/jwt';
import { createPublicClient, http } from 'viem';

import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

// Allowed status transitions for payment requests
const ALLOWED_STATUSES = ['pending', 'accepted', 'rejected', 'completed', 'cancelled'] as const;
const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_PATTERN = /^0x[a-fA-F0-9]{64}$/;

/**
 * #95 fix: When a PATCH request transitions to 'completed' with a tx_hash,
 * verify the transaction succeeded on-chain.
 * If verification is unavailable, fail closed instead of accepting client claims.
 */
async function verifyTxHashOnChain(txHash: string): Promise<'confirmed' | 'failed' | 'unverifiable'> {
  const rpcUrl = process.env.RPC_URL?.trim();
  if (!rpcUrl) return 'unverifiable';
  try {
    const client = createPublicClient({ transport: http(rpcUrl) });
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    return receipt.status === 'success' ? 'confirmed' : 'failed';
  } catch (err) {
    logger.warn('[PaymentRequest PATCH] tx_hash verification failed', err);
    return 'unverifiable';
  }
}

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

export const GET = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication — only parties involved should read a payment request
  if (!user?.address || !isAddressLike(user.address)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resolvedParams = await context!.params;
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
      `SELECT pr.*, sender.wallet_address AS from_wallet_address, recipient.wallet_address AS to_wallet_address
       FROM payment_requests pr
       LEFT JOIN users sender ON sender.id = pr.from_user_id
       LEFT JOIN users recipient ON recipient.id = pr.to_user_id
       WHERE pr.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    const paymentRequest = result.rows[0]!;
    const ownership = await verifyOwnership(normalizeAddress(user.address), paymentRequest);
    if (ownership instanceof NextResponse) return ownership;

    return NextResponse.json({ request: paymentRequest });
  } catch (error) {
    logger.error('[Payment Request GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch request' }, { status: 500 });
  }
});

export const PUT = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  if (!user?.address || !isAddressLike(user.address)) {
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
    const resolvedParams = await context!.params;
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
    const ownership = await verifyOwnership(normalizeAddress(user.address), existing.rows[0]!);
    if (ownership instanceof NextResponse) return ownership;

    // F-BE-023 FIX: enforce state-machine transition rules. Without these,
    // either party could set ANY status — including the sender marking
    // their own request 'completed' without paying. Transitions:
    //   - sender   may: cancel (pending -> cancelled)
    //   - recipient may: reject  (pending -> rejected)
    //   - 'completed' MUST go through PATCH with on-chain tx_hash.
    //   - 'accepted' is a soft state set by recipient before payment.
    //
    // 'pending' is the initial state and not allowed via PUT (would re-open
    // a closed request).
    const existingRow = existing.rows[0]! as Record<string, unknown>;
    const currentStatus = String(existingRow.status ?? 'pending').toLowerCase();
    const fromUserId = Number(existingRow.from_user_id);
    const toUserId = Number(existingRow.to_user_id);
    const isSender = ownership.userId === fromUserId;
    const isRecipient = ownership.userId === toUserId;

    if (normalizedStatus === 'completed') {
      return NextResponse.json(
        { error: "'completed' requires PATCH with an on-chain tx_hash" },
        { status: 400 }
      );
    }
    if (normalizedStatus === 'pending') {
      return NextResponse.json(
        { error: "Cannot revert to 'pending'" },
        { status: 400 }
      );
    }
    if (currentStatus !== 'pending') {
      return NextResponse.json(
        { error: `Cannot transition from '${currentStatus}' via PUT` },
        { status: 409 }
      );
    }
    if (normalizedStatus === 'cancelled' && !isSender) {
      return NextResponse.json(
        { error: 'Only the sender may cancel a payment request' },
        { status: 403 }
      );
    }
    if (normalizedStatus === 'rejected' && !isRecipient) {
      return NextResponse.json(
        { error: 'Only the recipient may reject a payment request' },
        { status: 403 }
      );
    }
    if (normalizedStatus === 'accepted' && !isRecipient) {
      return NextResponse.json(
        { error: 'Only the recipient may accept a payment request' },
        { status: 403 }
      );
    }

    const result = await query(
      `UPDATE payment_requests
       SET status = $2, updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [id, normalizedStatus]
    );

    if (result.rows.length === 0) {
      // Race-loss: another transition won the CAS. Surface 409 instead of
      // pretending the update succeeded.
      return NextResponse.json(
        { error: 'Payment request was already updated' },
        { status: 409 }
      );
    }

    return NextResponse.json({ request: result.rows[0] });
  } catch (error) {
    logger.error('[Payment Request PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
  }
});

export const PATCH = withAuth(async (request: NextRequest, user: JWTPayload, context?: { params: Promise<Record<string, string>> | Record<string, string> }) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;
  if (!user?.address || !isAddressLike(user.address)) {
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
    const resolvedParams = await context!.params;
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

    const normalizedTxHash = body.txHash ?? null;

    // #95 fix: 'completed' requires a tx_hash and on-chain verification.
    // Without a tx_hash, the transition is rejected.
    // With a tx_hash, we verify the transaction succeeded on-chain.
    // If verification is unavailable, fail closed.
    const normalizedStatus = body.status;
    if (normalizedStatus === 'completed') {
      if (!normalizedTxHash) {
        return NextResponse.json(
          { error: 'tx_hash is required to mark a payment request as completed' },
          { status: 400 }
        );
      }
      const chainResult = await verifyTxHashOnChain(normalizedTxHash);
      if (chainResult === 'failed') {
        return NextResponse.json(
          { error: 'Transaction did not succeed on-chain; cannot mark as completed' },
          { status: 422 }
        );
      }
      if (chainResult === 'unverifiable') {
        return NextResponse.json(
          { error: 'Unable to verify transaction on-chain at this time; cannot mark as completed' },
          { status: 503 }
        );
      }
    }

    // Verify the authenticated user is a party to this payment request
    const existing = await query('SELECT * FROM payment_requests WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }
    const ownership = await verifyOwnership(normalizeAddress(user.address), existing.rows[0]!);
    if (ownership instanceof NextResponse) return ownership;

    // F-BE-023 FIX: only the SENDER (the party who paid on-chain) may mark a
    // request 'completed'. The on-chain tx_hash check above proves a payment
    // succeeded, but doesn't prove WHO paid — without this, the recipient
    // could mark someone else's request completed using an unrelated tx hash
    // they observed (the `from` address of the receipt is not validated against
    // the request's sender). This narrows the exploit window.
    //
    // For a stronger fix, future versions should also verify
    //   receipt.from === paymentRequest.from_wallet_address
    //   receipt.to === paymentRequest.to_wallet_address (or the token contract)
    //   receipt.value/input >= paymentRequest.amount
    // but that requires schema work and is out of scope for v18.1.
    const existingRow = existing.rows[0]! as Record<string, unknown>;
    const currentStatus = String(existingRow.status ?? 'pending').toLowerCase();
    const fromUserId = Number(existingRow.from_user_id);
    const isSender = ownership.userId === fromUserId;

    if (normalizedStatus === 'completed' && !isSender) {
      return NextResponse.json(
        { error: 'Only the sender may mark a payment request as completed' },
        { status: 403 }
      );
    }
    if (normalizedStatus === 'completed' && currentStatus !== 'pending' && currentStatus !== 'accepted') {
      return NextResponse.json(
        { error: `Cannot complete a request in state '${currentStatus}'` },
        { status: 409 }
      );
    }

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
    const errorMessage = 'Failed to update request';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
});
