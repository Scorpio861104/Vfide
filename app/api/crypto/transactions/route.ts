/**
 * POST /api/crypto/transactions
 *
 * Logs a transaction record on the server side. Called by `saveTransaction()`
 * in `lib/crypto.ts` after a successful on-chain send. The user must own the
 * `from` address — we do not accept transactions claimed from another wallet.
 *
 * GET /api/crypto/transactions/[userId] handles reads; this file only adds POST.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

const transactionSchema = z.object({
  id: z.string().max(64),
  type: z.enum(['send', 'receive', 'tip', 'reward', 'payment_request', 'group_payment']),
  from: z.string().regex(ADDRESS_LIKE_REGEX),
  to: z.string().regex(ADDRESS_LIKE_REGEX),
  amount: z.string().max(64),
  tokenAmount: z.string().max(64).optional(),
  currency: z.enum(['ETH', 'VFIDE']),
  status: z.enum(['pending', 'confirmed', 'failed']),
  timestamp: z.number().int().nonnegative(),
  txHash: z.string().regex(TX_HASH_REGEX).optional(),
  message: z.string().max(500).optional(),
  fee: z.string().max(64).optional(),
  // Free-form additional context (orderId, paylinkId, etc)
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return ADDRESS_LIKE_REGEX.test(address) ? address : null;
}

async function postHandler(request: NextRequest, user: JWTPayload) {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;

  const authAddress = getAuthAddress(user);
  if (!authAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof transactionSchema>;
  try {
    const parsed = transactionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid transaction payload' }, { status: 400 });
    }
    body = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // The authenticated wallet must be EITHER the sender or the receiver — we
  // accept "receive" entries logged by the buyer side, and "send" entries
  // logged by the sender side. Refuse a write where neither side matches.
  const fromLower = body.from.toLowerCase();
  const toLower = body.to.toLowerCase();
  if (authAddress !== fromLower && authAddress !== toLower) {
    return NextResponse.json(
      { error: 'Authenticated wallet must be sender or receiver' },
      { status: 403 },
    );
  }

  try {
    // Upsert by `id` so a re-submit (e.g. pending → confirmed) doesn't create
    // a duplicate row. ON CONFLICT updates status + tx_hash if the second
    // call has more information than the first.
    const result = await query(
      `INSERT INTO transactions
         (id, user_address, type, from_address, to_address, amount, token_amount,
          currency, status, tx_hash, message, fee, metadata, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, to_timestamp($14 / 1000.0))
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         tx_hash = COALESCE(EXCLUDED.tx_hash, transactions.tx_hash),
         metadata = transactions.metadata || EXCLUDED.metadata
       RETURNING id, status`,
      [
        body.id,
        authAddress,
        body.type,
        fromLower,
        toLower,
        body.amount,
        body.tokenAmount ?? null,
        body.currency,
        body.status,
        body.txHash ?? null,
        body.message ?? null,
        body.fee ?? null,
        JSON.stringify(body.metadata ?? {}),
        body.timestamp,
      ],
    );
    return NextResponse.json({ id: result.rows[0]?.id, status: result.rows[0]?.status });
  } catch (error) {
    logger.error('[Transactions POST] Error:', error);
    return NextResponse.json({ error: 'Failed to save transaction' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
