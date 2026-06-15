/**
 * Disputes API (Fraud & Abuse + Marketplace Trust backend).
 *
 * A non-custodial dispute RECORD — mirrors the on-chain FraudRegistry philosophy: it records and
 * tracks, it never holds/delays/seizes funds, and it never unilaterally convicts. A buyer opens a
 * dispute against a merchant payment; the merchant can respond; either side (or a resolution) closes
 * it. Confirmed-fraud punishment stays with the on-chain FraudJury; this surfaces the human trail and
 * emits DISPUTE_OPENED / DISPUTE_RESOLVED so the Seer's risk signals + marketplace trust have real
 * inputs.
 *
 * GET  — disputes the caller is party to (opener or respondent).
 * POST — action: 'open' | 'respond' | 'resolve' | 'withdraw'. Role-scoped:
 *        opener opens & withdraws; respondent responds; either party may record a mutual resolution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { emitServerEvent } from '@/lib/events/serverEmit';

export const dynamic = 'force-dynamic';

function authAddr(user: JWTPayload): string | null {
  const a = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a ? a : null;
}

interface DisputeRow {
  id: string; opener_address: string; respondent_address: string; tx_hash: string | null;
  order_id: string | null; reason: string; detail: string | null; status: string;
  merchant_response: string | null; resolution_note: string | null;
  created_at: string; updated_at: string; resolved_at: string | null;
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const addr = authAddr(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rows = (
      await query<DisputeRow>(
        `SELECT * FROM disputes
          WHERE opener_address = $1 OR respondent_address = $1
          ORDER BY updated_at DESC LIMIT 100`,
        [addr],
      )
    ).rows;
    // Tell the client which side they are, so the UI can show the right actions.
    const disputes = rows.map((d) => ({ ...d, role: d.opener_address === addr ? 'opener' : 'respondent' }));
    return NextResponse.json({ disputes });
  } catch (err) {
    logger.error('GET /api/disputes failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load disputes' }, { status: 500 });
  }
}

const OpenSchema = z.object({
  action: z.literal('open'),
  respondent_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  reason: z.string().min(1).max(80),
  detail: z.string().max(2000).optional(),
  tx_hash: z.string().max(66).optional(),
  order_id: z.string().max(120).optional(),
});
const RespondSchema = z.object({ action: z.literal('respond'), id: z.string().uuid(), merchant_response: z.string().min(1).max(2000) });
const ResolveSchema = z.object({
  action: z.literal('resolve'),
  id: z.string().uuid(),
  outcome: z.enum(['refunded', 'settled', 'upheld']),
  resolution_note: z.string().max(2000).optional(),
});
const WithdrawSchema = z.object({ action: z.literal('withdraw'), id: z.string().uuid() });
const BodySchema = z.discriminatedUnion('action', [OpenSchema, RespondSchema, ResolveSchema, WithdrawSchema]);

async function postHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const addr = authAddr(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    if (body.action === 'open') {
      const respondent = body.respondent_address.toLowerCase();
      if (respondent === addr) return NextResponse.json({ error: 'You cannot open a dispute against yourself' }, { status: 400 });
      const row = (
        await query<DisputeRow>(
          `INSERT INTO disputes (opener_address, respondent_address, tx_hash, order_id, reason, detail, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'open') RETURNING *`,
          [addr, respondent, body.tx_hash ?? null, body.order_id ?? null, body.reason, body.detail ?? null],
        )
      ).rows[0];
      // Notify both parties' ecosystem feeds.
      await emitServerEvent(addr, 'DISPUTE_OPENED', { id: row?.id, role: 'opener' }, 'api/disputes');
      await emitServerEvent(respondent, 'DISPUTE_OPENED', { id: row?.id, role: 'respondent' }, 'api/disputes');
      return NextResponse.json({ dispute: row }, { status: 201 });
    }

    // For the remaining actions, load the dispute and enforce role + state.
    const existing = (await query<DisputeRow>(`SELECT * FROM disputes WHERE id = $1`, [body.id])).rows[0];
    if (!existing) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    const isOpener = existing.opener_address === addr;
    const isRespondent = existing.respondent_address === addr;
    if (!isOpener && !isRespondent) return NextResponse.json({ error: 'Not your dispute' }, { status: 403 });
    const isClosed = existing.status.startsWith('resolved_') || existing.status === 'withdrawn';
    if (isClosed) return NextResponse.json({ error: 'Dispute is already closed' }, { status: 409 });

    if (body.action === 'respond') {
      if (!isRespondent) return NextResponse.json({ error: 'Only the merchant can respond' }, { status: 403 });
      const row = (
        await query<DisputeRow>(
          `UPDATE disputes SET merchant_response = $2, status = CASE WHEN status = 'open' THEN 'responded' ELSE status END, updated_at = NOW()
           WHERE id = $1 RETURNING *`,
          [body.id, body.merchant_response],
        )
      ).rows[0];
      return NextResponse.json({ dispute: row });
    }

    if (body.action === 'withdraw') {
      if (!isOpener) return NextResponse.json({ error: 'Only the opener can withdraw' }, { status: 403 });
      const row = (
        await query<DisputeRow>(`UPDATE disputes SET status = 'withdrawn', updated_at = NOW(), resolved_at = NOW() WHERE id = $1 RETURNING *`, [body.id])
      ).rows[0];
      await emitServerEvent(addr, 'DISPUTE_RESOLVED', { id: body.id, outcome: 'withdrawn' }, 'api/disputes');
      await emitServerEvent(existing.respondent_address, 'DISPUTE_RESOLVED', { id: body.id, outcome: 'withdrawn' }, 'api/disputes');
      return NextResponse.json({ dispute: row });
    }

    // resolve
    const statusMap = { refunded: 'resolved_refunded', settled: 'resolved_settled', upheld: 'resolved_upheld' } as const;
    const row = (
      await query<DisputeRow>(
        `UPDATE disputes SET status = $2, resolution_note = $3, updated_at = NOW(), resolved_at = NOW() WHERE id = $1 RETURNING *`,
        [body.id, statusMap[body.outcome], body.resolution_note ?? null],
      )
    ).rows[0];
    await emitServerEvent(existing.opener_address, 'DISPUTE_RESOLVED', { id: body.id, outcome: body.outcome }, 'api/disputes');
    await emitServerEvent(existing.respondent_address, 'DISPUTE_RESOLVED', { id: body.id, outcome: body.outcome }, 'api/disputes');
    return NextResponse.json({ dispute: row });
  } catch (err) {
    logger.error('POST /api/disputes failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to update dispute' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
