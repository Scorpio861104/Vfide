/**
 * /api/messages/tip
 * POST  attach a tip to an in-chat message after the on-chain tx. The tipper is
 *        the authenticated caller (NOT a body field); the recipient is supplied
 *        and the referenced transaction is verified on-chain before the record
 *        is written. Persisted to message_tips.
 * GET   ?messageId=  -> the tip record (visible to tipper or recipient via RLS).
 */
import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { verifyOnChainPayment, decidePaymentRecord } from '@/lib/payments/verifyOnChainPayment';

export const runtime = 'nodejs';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface TipRow {
  id: string;
  message_id: string;
  tipper_address: string;
  recipient_address: string;
  amount: string | null;
  currency: string | null;
  tx_hash: string | null;
  raw_transaction: unknown;
  verified: boolean;
  verification_status: string | null;
  created_at: Date;
}

function serialize(r: TipRow) {
  return {
    id: String(r.id),
    messageId: r.message_id,
    tipperAddress: r.tipper_address,
    recipientAddress: r.recipient_address,
    amount: r.amount ?? undefined,
    currency: r.currency ?? undefined,
    txHash: r.tx_hash ?? undefined,
    transaction: r.raw_transaction ?? undefined,
    verified: r.verified,
    verificationStatus: r.verification_status ?? undefined,
    timestamp: new Date(r.created_at).getTime(),
  };
}

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const messageId = typeof body.messageId === 'string' ? body.messageId : '';
  const recipientAddress = typeof body.recipientAddress === 'string' ? body.recipientAddress : '';
  const transaction =
    body.transaction && typeof body.transaction === 'object'
      ? (body.transaction as Record<string, unknown>)
      : null;

  if (!messageId || !transaction || !ADDRESS_RE.test(recipientAddress)) {
    return NextResponse.json(
      { error: 'messageId, recipientAddress and transaction are required' },
      { status: 400 },
    );
  }

  const txHash = typeof transaction.txHash === 'string' ? transaction.txHash : null;
  const amount = typeof transaction.amount === 'string' ? transaction.amount : null;
  const currency = typeof transaction.currency === 'string' ? transaction.currency : null;

  if (!txHash || !currency) {
    return NextResponse.json(
      { error: 'transaction.txHash and transaction.currency are required' },
      { status: 400 },
    );
  }

  const decision = decidePaymentRecord(
    await verifyOnChainPayment({
      txHash,
      expectedFrom: user.address,
      expectedTo: recipientAddress,
      currency,
      amount: amount ?? undefined,
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
      `INSERT INTO message_tips
         (message_id, tipper_address, recipient_address, amount, currency, tx_hash, raw_transaction, verified, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        messageId,
        user.address,
        recipientAddress.toLowerCase(),
        amount,
        currency,
        txHash,
        JSON.stringify(transaction),
        decision.verified,
        decision.verificationStatus,
      ],
    );
    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Failed to record message tip' }, { status: 500 });
    }
    return NextResponse.json({ success: true, messageId, tip: serialize(row) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to record message tip' }, { status: 500 });
  }
});

export const GET = withAuth(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const messageId = searchParams.get('messageId');
  if (!messageId) {
    return NextResponse.json({ error: 'messageId is required' }, { status: 400 });
  }
  try {
    // RLS scopes message_tips to the caller (tipper or recipient).
    const rows = (
      await query<TipRow>(
        `SELECT * FROM message_tips WHERE message_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [messageId],
      )
    ).rows;
    return NextResponse.json({ tip: rows[0] ? serialize(rows[0]) : null });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch message tip' }, { status: 500 });
  }
});
