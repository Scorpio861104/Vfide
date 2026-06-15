/**
 * Sanctum API (Institution 6 — Stewardship). The Seer proposes; the DAO approves.
 *
 * GET  — the prioritized community support queue (public; ranked by the Seer's advisory priority).
 * POST — action: 'submit' (create a request; the Seer scores it on insert) | 'withdraw' (requester).
 *
 * NON-CUSTODIAL: nothing here moves funds. Disbursement is an on-chain DAO vote (SanctumVault). A
 * 'recommended' row is an advisory shortlist entry, not an approval. DAO approve/decline is a
 * governance action recorded on-chain; this surfaces the ranked requests that feed it.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { scoreSanctumRequest, type SanctumCategory } from '@/lib/seer/sanctum';
import { computeBuilderRecord } from '@/lib/seer/marketStability/builderRecord';
import { deriveBuilderSignals } from '@/lib/seer/marketStability/signals';

export const dynamic = 'force-dynamic';

function authAddr(user: JWTPayload): string | null {
  const a = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a ? a : null;
}

interface RequestRow {
  id: string; requester_address: string; category: string; title: string; description: string | null;
  amount_vfide: string; stated_beneficiaries: number; priority_score: number | null;
  recommendation: string | null; status: string; dao_note: string | null;
  created_at: string; updated_at: string;
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  if (!authAddr(user)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Public, ranked queue — open requests first, highest Seer priority on top.
    const rows = (
      await query<RequestRow>(
        `SELECT * FROM sanctum_requests
          WHERE status IN ('submitted','recommended')
          ORDER BY COALESCE(priority_score, 0) DESC, created_at ASC
          LIMIT 100`,
      )
    ).rows;
    return NextResponse.json({ requests: rows });
  } catch (err) {
    logger.error('GET /api/sanctum failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load Sanctum queue' }, { status: 500 });
  }
}

const SubmitSchema = z.object({
  action: z.literal('submit'),
  category: z.enum(['emergency_relief', 'community_project', 'merchant_grant', 'public_good', 'education']),
  title: z.string().min(1).max(120),
  description: z.string().max(4000).optional(),
  amount_vfide: z.number().positive().max(1_000_000),
  stated_beneficiaries: z.number().int().min(0).max(1_000_000).optional(),
});
const WithdrawSchema = z.object({ action: z.literal('withdraw'), id: z.string().uuid() });
const BodySchema = z.discriminatedUnion('action', [SubmitSchema, WithdrawSchema]);

async function readProofScore(address: string): Promise<number> {
  try {
    const row = (
      await query<{ score: string }>(
        `SELECT data->>'newScore' AS score FROM indexed_events
          WHERE event_type = 'score' AND lower(data->>'subject') = $1
          ORDER BY block_number DESC LIMIT 1`,
        [address],
      )
    ).rows[0];
    const s = Number(row?.score);
    return Number.isFinite(s) ? s : 5000;
  } catch { return 5000; }
}

async function reliefInLast12Months(address: string): Promise<boolean> {
  try {
    const row = (
      await query<{ c: string }>(
        `SELECT COUNT(*)::text AS c FROM sanctum_requests
          WHERE requester_address = $1 AND status = 'approved' AND updated_at > NOW() - INTERVAL '12 months'`,
        [address],
      )
    ).rows[0];
    return Number(row?.c ?? 0) > 0;
  } catch { return false; }
}

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
    if (body.action === 'withdraw') {
      const existing = (await query<RequestRow>(`SELECT * FROM sanctum_requests WHERE id = $1`, [body.id])).rows[0];
      if (!existing) return NextResponse.json({ error: 'Request not found' }, { status: 404 });
      if (existing.requester_address !== addr) return NextResponse.json({ error: 'Not your request' }, { status: 403 });
      if (existing.status === 'approved' || existing.status === 'declined') return NextResponse.json({ error: 'Request already decided' }, { status: 409 });
      const row = (await query<RequestRow>(`UPDATE sanctum_requests SET status = 'withdrawn', updated_at = NOW() WHERE id = $1 RETURNING *`, [body.id])).rows[0];
      return NextResponse.json({ request: row });
    }

    // submit — score with the Seer on insert.
    const builder = computeBuilderRecord(await deriveBuilderSignals(addr));
    const proofScore = await readProofScore(addr);
    const recentRelief = await reliefInLast12Months(addr);
    const rec = scoreSanctumRequest({
      category: body.category as SanctumCategory,
      amountVfide: body.amount_vfide,
      builder,
      proofScore,
      statedBeneficiaries: body.stated_beneficiaries ?? 1,
      reliefInLast12Months: recentRelief,
    });

    const row = (
      await query<RequestRow>(
        `INSERT INTO sanctum_requests
           (requester_address, category, title, description, amount_vfide, stated_beneficiaries, priority_score, recommendation, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'recommended') RETURNING *`,
        [addr, body.category, body.title, body.description ?? null, body.amount_vfide, body.stated_beneficiaries ?? 1, rec.priorityScore, rec.recommendation],
      )
    ).rows[0];

    return NextResponse.json({ request: row, recommendation: rec }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/sanctum failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
