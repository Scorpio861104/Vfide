/**
 * DAO Override Ledger API (Phase 2 - "the DAO governs the Seer; both must be auditable").
 *
 * GET  - PUBLIC. The full override ledger, newest first, optionally filtered by type/subject. Anyone
 *        can audit the DAO. This is the transparency requirement made literal.
 * POST - ADMIN/GOVERNANCE ONLY (requireAdmin, on-chain verified, fail-closed). Records that the DAO
 *        overrode a Seer decision, with the original decision, the override, the reason, and the
 *        governing proposal. Append-only - there is no edit/delete path.
 *
 * This ledger does NOT grant override authority (that comes from on-chain governance). It records and
 * surfaces those decisions. Every override also lands in the central audit_events log for
 * defence-in-depth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAdmin } from '@/lib/auth/apiGuards';
import { writeAuditEvent } from '@/lib/audit/auditLog';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const OVERRIDE_TYPES = [
  'cooldown', 'stabilization_fee', 'emergency_decision', 'fraud_classification',
  'marketplace_penalty', 'lending_recommendation', 'extraction_classification', 'other',
] as const;

interface LedgerRow {
  id: string;
  override_type: string;
  subject_identity: string | null;
  original_decision: string;
  override_decision: string;
  reason: string;
  proposal_ref: string | null;
  votes_for: number | null;
  votes_against: number | null;
  recorded_by: string;
  impact: string | null;
  created_at: string;
}

async function getHandler(request: NextRequest): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  try {
    const type = request.nextUrl.searchParams.get('type')?.trim().toLowerCase();
    const subject = request.nextUrl.searchParams.get('subject')?.trim().toLowerCase();
    const where: string[] = [];
    const params: (string | number)[] = [];

    if (type && (OVERRIDE_TYPES as readonly string[]).includes(type)) {
      params.push(type);
      where.push(`override_type = $${params.length}`);
    }
    if (subject) {
      params.push(subject);
      where.push(`lower(subject_identity) = $${params.length}`);
    }

    const rows = (
      await query<LedgerRow>(
        `SELECT * FROM dao_override_ledger
          ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
          ORDER BY created_at DESC LIMIT 200`,
        params,
      )
    ).rows;

    // A small transparency summary alongside the entries.
    const summary = (
      await query<{ override_type: string; n: string }>(
        `SELECT override_type, COUNT(*)::text AS n FROM dao_override_ledger GROUP BY override_type`,
      )
    ).rows;

    return NextResponse.json({ overrides: rows, summary });
  } catch (err) {
    logger.error('GET /api/dao/overrides failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load override ledger' }, { status: 500 });
  }
}

const RecordSchema = z.object({
  override_type: z.enum(OVERRIDE_TYPES),
  subject_identity: z.string().max(120).optional(),
  original_decision: z.string().min(1).max(1000),
  override_decision: z.string().min(1).max(1000),
  reason: z.string().min(1).max(2000),
  proposal_ref: z.string().max(200).optional(),
  votes_for: z.number().int().nonnegative().optional(),
  votes_against: z.number().int().nonnegative().optional(),
  impact: z.string().max(1000).optional(),
});

async function postHandler(request: NextRequest): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;

  // Admin/governance only - on-chain verified, fail-closed.
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  const recordedBy = admin.user.address.toLowerCase();

  let body: z.infer<typeof RecordSchema>;
  try {
    body = RecordSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    const row = (
      await query<LedgerRow>(
        `INSERT INTO dao_override_ledger
           (override_type, subject_identity, original_decision, override_decision, reason,
            proposal_ref, votes_for, votes_against, recorded_by, impact)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [
          body.override_type,
          body.subject_identity?.toLowerCase() ?? null,
          body.original_decision,
          body.override_decision,
          body.reason,
          body.proposal_ref ?? null,
          body.votes_for ?? null,
          body.votes_against ?? null,
          recordedBy,
          body.impact ?? null,
        ],
      )
    ).rows[0];

    // Defence-in-depth: also record in the central append-only audit log.
    await writeAuditEvent({
      actorIdentity: recordedBy,
      eventType: 'config.threshold.changed',
      targetIdentity: body.subject_identity?.toLowerCase(),
      outcome: 'success',
      reason: `DAO override (${body.override_type}): ${body.reason}`.slice(0, 500),
      details: { dao_override_ledger_id: row?.id, override_type: body.override_type, proposal_ref: body.proposal_ref },
    });

    return NextResponse.json({ override: row }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/dao/overrides failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to record override' }, { status: 500 });
  }
}

export const GET = getHandler;
export const POST = postHandler;
