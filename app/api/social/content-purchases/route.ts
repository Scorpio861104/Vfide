/**
 * /api/social/content-purchases
 * GET   list purchases where the caller is buyer or seller (RLS-scoped).
 * POST  record a content purchase. The buyer is the authenticated caller (NOT a
 *        body field). The referenced transaction is verified on-chain before the
 *        record is written. Idempotent on tx_hash.
 */
import { NextRequest, NextResponse } from 'next/server';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/db';
import { verifyOnChainPayment, decidePaymentRecord } from '@/lib/payments/verifyOnChainPayment';

export const runtime = 'nodejs';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface PurchaseRow {
  id: string;
  buyer_address: string;
  seller_address: string;
  content_id: string;
  content_type: string | null;
  price: string | null;
  currency: string | null;
  tx_hash: string | null;
  verified: boolean;
  verification_status: string | null;
  created_at: Date;
}

function serialize(r: PurchaseRow) {
  return {
    id: String(r.id),
    buyerAddress: r.buyer_address,
    sellerAddress: r.seller_address,
    contentId: r.content_id,
    contentType: r.content_type ?? undefined,
    price: r.price ?? undefined,
    currency: r.currency ?? undefined,
    txHash: r.tx_hash ?? undefined,
    verified: r.verified,
    verificationStatus: r.verification_status ?? undefined,
    timestamp: new Date(r.created_at).getTime(),
    accessGranted: true,
  };
}

export const GET = withAuth(async () => {
  try {
    // RLS scopes content_purchases to rows where the caller is buyer or seller.
    const rows = (
      await query<PurchaseRow>(
        `SELECT * FROM content_purchases ORDER BY created_at DESC LIMIT 200`,
      )
    ).rows;
    return NextResponse.json({ purchases: rows.map(serialize) });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const contentId = typeof body.contentId === 'string' ? body.contentId : '';
  const sellerAddress = typeof body.sellerAddress === 'string' ? body.sellerAddress : '';
  const contentType = typeof body.contentType === 'string' ? body.contentType : null;
  const price = typeof body.price === 'string' ? body.price : null;
  const currency = typeof body.currency === 'string' ? body.currency : null;
  const txHash = typeof body.txHash === 'string' ? body.txHash : null;

  if (!contentId || !ADDRESS_RE.test(sellerAddress) || !currency || !txHash) {
    return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 });
  }
  if (sellerAddress.toLowerCase() === user.address.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot purchase your own content' }, { status: 400 });
  }

  const decision = decidePaymentRecord(
    await verifyOnChainPayment({
      txHash,
      expectedFrom: user.address,
      expectedTo: sellerAddress,
      currency,
      amount: price ?? undefined,
    }),
  );
  if (!decision.accept) {
    return NextResponse.json(
      { error: 'On-chain verification failed', reason: decision.errorReason },
      { status: decision.httpStatus ?? 422 },
    );
  }

  try {
    // Idempotent on tx_hash: a repeated submission of the same tx returns the
    // existing record instead of creating a duplicate.
    const existing = (
      await query<PurchaseRow>(`SELECT * FROM content_purchases WHERE tx_hash = $1 LIMIT 1`, [
        txHash,
      ])
    ).rows[0];
    if (existing) {
      return NextResponse.json(
        { success: true, purchase: serialize(existing), accessGranted: true },
        { status: 200 },
      );
    }

    const result = await query<PurchaseRow>(
      `INSERT INTO content_purchases
         (buyer_address, seller_address, content_id, content_type, price, currency, tx_hash, verified, verification_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        user.address,
        sellerAddress.toLowerCase(),
        contentId,
        contentType,
        price,
        currency,
        txHash,
        decision.verified,
        decision.verificationStatus,
      ],
    );
    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
    }
    return NextResponse.json(
      { success: true, purchase: serialize(row), accessGranted: true },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 });
  }
});
