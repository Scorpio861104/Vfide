/**
 * /api/social/tips
 * POST  record a social tip after the on-chain tx. The sender is the
 *        authenticated caller (NOT a body field). The referenced transaction is
 *        verified on-chain before the record is written; persisted to social_tips.
 * GET   public: tips for a post (?postId=) or by sender (?sender=).
 */
import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { verifyOnChainPayment, decidePaymentRecord } from '@/lib/payments/verifyOnChainPayment';

export const runtime = 'nodejs';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const ALLOWED_STATUS = new Set(['pending', 'confirmed', 'failed']);

interface TipRow {
  id: string;
  sender_address: string;
  recipient_address: string;
  post_id: string | null;
  comment_id: string | null;
  amount: string;
  currency: string;
  message: string | null;
  tx_hash: string | null;
  status: string;
  verified: boolean;
  verification_status: string | null;
  created_at: Date;
}

function serializeTip(r: TipRow) {
  return {
    id: String(r.id),
    postId: r.post_id ?? undefined,
    commentId: r.comment_id ?? undefined,
    senderAddress: r.sender_address,
    recipientAddress: r.recipient_address,
    amount: r.amount,
    currency: r.currency,
    message: r.message ?? undefined,
    txHash: r.tx_hash ?? undefined,
    status: r.status,
    verified: r.verified,
    verificationStatus: r.verification_status ?? undefined,
    timestamp: new Date(r.created_at).getTime(),
  };
}

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const recipientAddress = typeof body.recipientAddress === 'string' ? body.recipientAddress : '';
  const amount = typeof body.amount === 'string' ? body.amount : '';
  const currency = typeof body.currency === 'string' ? body.currency : '';
  const postId = typeof body.postId === 'string' ? body.postId : null;
  const commentId = typeof body.commentId === 'string' ? body.commentId : null;
  const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : null;
  const txHash = typeof body.txHash === 'string' ? body.txHash : null;
  const status =
    typeof body.status === 'string' && ALLOWED_STATUS.has(body.status) ? body.status : 'pending';

  if (!ADDRESS_RE.test(recipientAddress) || !amount || !currency || !txHash) {
    return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
  }

  const decision = decidePaymentRecord(
    await verifyOnChainPayment({
      txHash,
      expectedFrom: user.address,
      expectedTo: recipientAddress,
      currency,
      amount,
    }),
  );
  if (!decision.accept) {
    return NextResponse.json(
      { error: 'On-chain verification failed', reason: decision.errorReason },
      { status: decision.httpStatus ?? 422 },
    );
  }

  try {
    const result = await query<TipRow>(
      `INSERT INTO social_tips
         (sender_address, recipient_address, post_id, comment_id, amount, currency, message, tx_hash, status, verified, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        user.address,
        recipientAddress.toLowerCase(),
        postId,
        commentId,
        amount,
        currency,
        message,
        txHash,
        status,
        decision.verified,
        decision.verificationStatus,
      ],
    );
    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Failed to record tip' }, { status: 500 });
    }
    return NextResponse.json({ success: true, tip: serializeTip(row) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to record tip' }, { status: 500 });
  }
});

export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');
  const sender = searchParams.get('sender');

  try {
    let rows: TipRow[];
    if (postId) {
      rows = (
        await query<TipRow>(
          `SELECT * FROM social_tips WHERE post_id = $1 ORDER BY created_at DESC LIMIT 200`,
          [postId],
        )
      ).rows;
    } else if (sender && ADDRESS_RE.test(sender)) {
      rows = (
        await query<TipRow>(
          `SELECT * FROM social_tips WHERE LOWER(sender_address) = LOWER($1) ORDER BY created_at DESC LIMIT 200`,
          [sender],
        )
      ).rows;
    } else {
      return NextResponse.json({ tips: [] });
    }
    return NextResponse.json({ tips: rows.map(serializeTip) });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch tips' }, { status: 500 });
  }
}
