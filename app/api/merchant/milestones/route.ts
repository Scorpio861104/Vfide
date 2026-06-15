/**
 * Milestone Lifecycle API (Professional Services Operations — Phase 2)
 *
 * The acceptance + release layer over the engagement orchestration foundation. Each milestone maps to one
 * CommerceEscrow (whole-amount). This route records the lifecycle decisions and the escrow linkage:
 *
 *   action: 'link_escrow' — client funded an escrow on-chain for a milestone; record escrow_id (defined→funded)
 *   action: 'deliver'     — provider submits a deliverable → starts the acceptance window (funded→submitted)
 *   action: 'accept'      — client accepts → release is due (submitted→accepted; escrow_action=release)
 *   action: 'reject'      — client rejects WITH a reason → milestone-scoped dispute (submitted→in_dispute)
 *
 * BLOCKCHAIN BOUNDARY (honest, like 1C/1D): this route does NOT sign on-chain transactions. Funding, release,
 * and dispute are the client's/provider's wallet actions on CommerceEscrow; this records the orchestration
 * state + the escrow action the wallet must execute. `escrow_action` in the response names that call.
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { emitServerEvent } from '@/lib/events/serverEmit';
import {
  canFund, canSubmit, decideAccept, decideReject, acceptanceDeadline, engagementComplete,
  type MilestoneStatus,
} from '@/lib/commerce/milestoneEngine';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;

function authAddr(user: JWTPayload): string | null {
  const a = typeof user?.address === 'string' ? user.address.trim().toLowerCase() : '';
  return a && ADDRESS_LIKE_REGEX.test(a) ? a : null;
}
const newId = () => randomBytes(16).toString('hex');

const linkEscrow = z.object({ action: z.literal('link_escrow'), milestone_id: z.string().min(1), escrow_id: z.coerce.number().int().nonnegative(), tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional() });
const deliver = z.object({ action: z.literal('deliver'), milestone_id: z.string().min(1), content_hash: z.string().regex(HASH_REGEX).optional(), uri: z.string().max(2000).optional(), note: z.string().max(5000).optional() });
const accept = z.object({ action: z.literal('accept'), milestone_id: z.string().min(1) });
const reject = z.object({ action: z.literal('reject'), milestone_id: z.string().min(1), reason: z.string().trim().min(1).max(2000) });
const confirmRelease = z.object({ action: z.literal('confirm_release'), milestone_id: z.string().min(1), tx_hash: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional() });
const bodySchema = z.discriminatedUnion('action', [linkEscrow, deliver, accept, reject, confirmRelease]);

interface MilestoneRow {
  id: string; engagement_id: string; status: MilestoneStatus; escrow_id: number | null;
  acceptance_deadline: string | null; provider_address: string; client_address: string;
  acceptance_window_secs: number;
}

async function loadMilestone(milestoneId: string): Promise<MilestoneRow | null> {
  const row = (await query<MilestoneRow>(
    `SELECT m.id, m.engagement_id, m.status, m.escrow_id, m.acceptance_deadline,
            e.provider_address, e.client_address, e.acceptance_window_secs
       FROM engagement_milestones m
       JOIN service_engagements e ON e.id = m.engagement_id
      WHERE m.id = $1`,
    [milestoneId],
  )).rows[0];
  return row ?? null;
}

async function maybeCompleteEngagement(engagementId: string): Promise<void> {
  const statuses = (await query<{ status: MilestoneStatus }>(
    `SELECT status FROM engagement_milestones WHERE engagement_id = $1`, [engagementId],
  )).rows.map((r) => r.status);
  if (engagementComplete(statuses)) {
    await query(`UPDATE service_engagements SET status='completed', completed_at=NOW(), updated_at=NOW() WHERE id=$1`, [engagementId]);
  }
}

async function postHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const addr = authAddr(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await request.json()); }
  catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }); }

  const m = await loadMilestone(body.milestone_id);
  if (!m) return NextResponse.json({ error: 'Milestone not found' }, { status: 404 });
  const isProvider = m.provider_address === addr;
  const isClient = m.client_address === addr;
  if (!isProvider && !isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    if (body.action === 'link_escrow') {
      // The client funds the escrow on-chain, then records the escrow id here (defined → funded).
      if (!isClient) return NextResponse.json({ error: 'Only the client funds a milestone' }, { status: 403 });
      const gate = canFund({ status: m.status, escrow_id: m.escrow_id, acceptance_deadline: m.acceptance_deadline });
      if (!gate.ok) return NextResponse.json({ error: `Cannot fund: ${gate.reason}` }, { status: 409 });
      await query(
        `UPDATE engagement_milestones SET escrow_id=$2, status='funded', updated_at=NOW() WHERE id=$1`,
        [m.id, body.escrow_id],
      );
      emitServerEvent(m.provider_address, 'MILESTONE_FUNDED', { milestoneId: m.id, escrowId: body.escrow_id }, 'milestones').catch(() => {});
      return NextResponse.json({ milestone_id: m.id, status: 'funded', escrow_id: body.escrow_id });
    }

    if (body.action === 'deliver') {
      if (!isProvider) return NextResponse.json({ error: 'Only the provider submits deliverables' }, { status: 403 });
      const gate = canSubmit({ status: m.status, escrow_id: m.escrow_id, acceptance_deadline: m.acceptance_deadline });
      if (!gate.ok) return NextResponse.json({ error: `Cannot submit: ${gate.reason}` }, { status: 409 });

      const deadlineMs = acceptanceDeadline(Date.now(), Number(m.acceptance_window_secs));
      const client = await getClient();
      try {
        await client.query('BEGIN');
        // resubmission after a reject increments version
        const versionRow = (await client.query(
          `SELECT COALESCE(MAX(version),0)+1 AS v FROM milestone_deliverables WHERE milestone_id=$1`, [m.id],
        )).rows[0] as { v: number };
        await client.query(
          `INSERT INTO milestone_deliverables (id, milestone_id, content_hash, uri, note, version)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [newId(), m.id, body.content_hash ?? null, body.uri ?? null, body.note ?? null, versionRow.v],
        );
        await client.query(
          `UPDATE engagement_milestones
              SET status='submitted', submitted_at=NOW(), acceptance_deadline=$2, rejected_at=NULL, reject_reason=NULL, updated_at=NOW()
            WHERE id=$1`,
          [m.id, new Date(deadlineMs).toISOString()],
        );
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      emitServerEvent(m.client_address, 'MILESTONE_SUBMITTED', { milestoneId: m.id, acceptanceDeadline: new Date(deadlineMs).toISOString() }, 'milestones').catch(() => {});
      return NextResponse.json({ milestone_id: m.id, status: 'submitted', acceptance_deadline: new Date(deadlineMs).toISOString() });
    }

    if (body.action === 'accept') {
      if (!isClient) return NextResponse.json({ error: 'Only the client accepts' }, { status: 403 });
      const decision = decideAccept({ status: m.status, escrow_id: m.escrow_id, acceptance_deadline: m.acceptance_deadline });
      if (!decision.ok) return NextResponse.json({ error: `Cannot accept: ${decision.reason}` }, { status: 409 });
      await query(`UPDATE engagement_milestones SET status='accepted', accepted_at=NOW(), updated_at=NOW() WHERE id=$1`, [m.id]);
      emitServerEvent(m.provider_address, 'MILESTONE_ACCEPTED', { milestoneId: m.id, escrowId: m.escrow_id }, 'milestones').catch(() => {});
      // escrow_action tells the client's wallet to call CommerceEscrow.release(escrow_id)
      return NextResponse.json({ milestone_id: m.id, status: 'accepted', escrow_action: 'release', escrow_id: m.escrow_id });
    }

    if (body.action === 'reject') {
      if (!isClient) return NextResponse.json({ error: 'Only the client rejects' }, { status: 403 });
      const decision = decideReject({ status: m.status, escrow_id: m.escrow_id, acceptance_deadline: m.acceptance_deadline }, body.reason);
      if (!decision.ok) return NextResponse.json({ error: `Cannot reject: ${decision.reason}` }, { status: 409 });
      await query(
        `UPDATE engagement_milestones SET status='in_dispute', rejected_at=NOW(), reject_reason=$2, updated_at=NOW() WHERE id=$1`,
        [m.id, body.reason],
      );
      await query(`UPDATE service_engagements SET status='disputed', updated_at=NOW() WHERE id=$1`, [m.engagement_id]);
      emitServerEvent(m.provider_address, 'MILESTONE_REJECTED', { milestoneId: m.id, reason: body.reason }, 'milestones').catch(() => {});
      // escrow_action tells the wallet to call CommerceEscrow.dispute(escrow_id, reason)
      return NextResponse.json({ milestone_id: m.id, status: 'in_dispute', escrow_action: 'dispute', escrow_id: m.escrow_id });
    }

    if (body.action === 'confirm_release') {
      // Either party may record that the on-chain CommerceEscrow.release(escrow_id) has been confirmed
      // (accepted → released). This closes the milestone and may complete the engagement.
      if (m.status !== 'accepted') return NextResponse.json({ error: 'Milestone is not awaiting release' }, { status: 409 });
      if (m.escrow_id == null) return NextResponse.json({ error: 'Milestone has no linked escrow' }, { status: 409 });
      await query(`UPDATE engagement_milestones SET status='released', updated_at=NOW() WHERE id=$1`, [m.id]);
      emitServerEvent(m.provider_address, 'MILESTONE_RELEASED', { milestoneId: m.id, escrowId: m.escrow_id }, 'milestones').catch(() => {});
      await maybeCompleteEngagement(m.engagement_id);
      return NextResponse.json({ milestone_id: m.id, status: 'released', escrow_id: m.escrow_id });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    logger.error('POST /api/merchant/milestones failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to process milestone' }, { status: 500 });
  }
}

export const POST = withAuth(postHandler);
export { maybeCompleteEngagement };
