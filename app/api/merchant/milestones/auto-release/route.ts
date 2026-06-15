/**
 * Milestone Auto-Release Keeper (Professional Services Operations — Phase 2)
 *
 * SILENCE = ACCEPTANCE. When a provider submits a deliverable, an acceptance window starts. If the client
 * neither accepts nor rejects before the window elapses, the milestone auto-accepts and the escrow release
 * becomes due. This endpoint is the keeper that sweeps elapsed submissions and marks them accepted.
 *
 * Auth: keeper-only. Guarded by a shared secret header (CRON_SECRET) so only the scheduled job / DAO keeper can
 * trigger it — it is NOT a user action.
 *
 * BLOCKCHAIN BOUNDARY (honest): marking a milestone `accepted` records the acceptance DECISION (silence = yes).
 * The actual on-chain CommerceEscrow.release(escrow_id) for an absent client is realized by the DAO/relayer or
 * the escrow's settleByInheritance/continuity path — server code cannot sign it. This keeper produces the list
 * of escrow ids whose release is now due; it does not move funds itself. The `released` status is set only once
 * the on-chain release is confirmed (via the milestones route / a chain watcher), not here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { emitServerEvent } from '@/lib/events/serverEmit';
import { autoAcceptIfElapsed, type MilestoneStatus } from '@/lib/commerce/milestoneEngine';

interface DueRow {
  id: string; engagement_id: string; status: MilestoneStatus; escrow_id: number | null;
  acceptance_deadline: string | null; provider_address: string; client_address: string;
}

export async function POST(request: NextRequest): Promise<Response> {
  // Keeper auth: a shared secret, not a user session.
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get('x-cron-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = Date.now();
    // candidates: submitted milestones with an elapsed acceptance deadline and a linked escrow
    const due = (await query<DueRow>(
      `SELECT m.id, m.engagement_id, m.status, m.escrow_id, m.acceptance_deadline,
              e.provider_address, e.client_address
         FROM engagement_milestones m
         JOIN service_engagements e ON e.id = m.engagement_id
        WHERE m.status = 'submitted'
          AND m.escrow_id IS NOT NULL
          AND m.acceptance_deadline IS NOT NULL
          AND m.acceptance_deadline <= NOW()
        LIMIT 500`,
    )).rows;

    const autoAccepted: Array<{ milestone_id: string; escrow_id: number | null }> = [];
    for (const m of due) {
      const decision = autoAcceptIfElapsed(
        { status: m.status, escrow_id: m.escrow_id, acceptance_deadline: m.acceptance_deadline },
        now,
      );
      if (!decision) continue; // double-check via the pure rule
      // mark accepted-by-silence; record that this was automatic (acceptance was not explicit)
      const updated = await query(
        `UPDATE engagement_milestones
            SET status='accepted', accepted_at=NOW(), reject_reason=NULL, updated_at=NOW()
          WHERE id=$1 AND status='submitted' AND acceptance_deadline <= NOW()`,
        [m.id],
      );
      if ((updated.rowCount ?? 0) > 0) {
        autoAccepted.push({ milestone_id: m.id, escrow_id: m.escrow_id });
        emitServerEvent(m.provider_address, 'MILESTONE_AUTO_ACCEPTED', { milestoneId: m.id, escrowId: m.escrow_id }, 'milestones-keeper').catch(() => {});
        emitServerEvent(m.client_address, 'MILESTONE_AUTO_ACCEPTED', { milestoneId: m.id, escrowId: m.escrow_id }, 'milestones-keeper').catch(() => {});
      }
    }

    // escrow ids whose on-chain release is now due (realized by DAO/relayer/continuity path — not signed here)
    return NextResponse.json({
      swept: due.length,
      auto_accepted: autoAccepted.length,
      release_due_escrow_ids: autoAccepted.map((a) => a.escrow_id).filter((x) => x != null),
    });
  } catch (err) {
    logger.error('milestone auto-release keeper failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Keeper run failed' }, { status: 500 });
  }
}
