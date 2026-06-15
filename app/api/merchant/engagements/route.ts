/**
 * Service Engagements API (Professional Services Operations — Phase 1)
 *
 * The engagement orchestration layer over VFIDE's existing primitives. This route is the FOUNDATIONAL,
 * money-free slice: it manages the agreement (scope/terms), the proposal/acceptance handshake, and the
 * ordered milestone definitions. Funding, deliverable submission, acceptance/release, and disputes are
 * handled by sibling routes that broker the existing CommerceEscrow functions (one escrow per milestone).
 *
 * On-chain truth lives in the linked CommerceEscrow ids; these tables only sequence them.
 * See docs/PROFESSIONAL_SERVICES_OPERATIONS_BUILD_SPEC.md.
 *
 * GET   — list engagements where the caller is provider OR client (role-scoped view)
 * POST  — action: 'create' (provider drafts) | 'propose' (provider → client) | 'accept' (client accepts terms)
 *               | 'add_milestone' (provider defines a milestone on a draft/proposed engagement)
 *               | 'cancel' (either party, before any milestone is funded)
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { query, getClient } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { emitServerEvent } from '@/lib/events/serverEmit';
import { z } from 'zod4';

const ADDRESS_LIKE_REGEX = /^0x[a-fA-F0-9]{40}$/;
const HASH_REGEX = /^0x[a-fA-F0-9]{64}$/;
const ENGAGEMENT_TYPES = ['fixed_milestone', 'retainer', 'hourly_capped'] as const;

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  if (!address || !ADDRESS_LIKE_REGEX.test(address)) return null;
  return address;
}

function newId(): string {
  return randomBytes(16).toString('hex');
}

const createSchema = z.object({
  action: z.literal('create'),
  client_address: z.string().trim().toLowerCase().regex(ADDRESS_LIKE_REGEX),
  title: z.string().trim().min(1).max(200),
  scope: z.string().max(20000).optional(),
  terms_hash: z.string().regex(HASH_REGEX).optional(),
  engagement_type: z.enum(ENGAGEMENT_TYPES).optional(),
  acceptance_window_secs: z.coerce.number().int().min(3600).max(7776000).optional(), // 1h..90d
});

const proposeSchema = z.object({ action: z.literal('propose'), id: z.string().min(1) });
const acceptSchema = z.object({ action: z.literal('accept'), id: z.string().min(1) });
const cancelSchema = z.object({ action: z.literal('cancel'), id: z.string().min(1) });

const addMilestoneSchema = z.object({
  action: z.literal('add_milestone'),
  id: z.string().min(1),
  seq: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20000).optional(),
  amount: z.coerce.number().positive().max(99999999.99),
});

const bodySchema = z.discriminatedUnion('action', [
  createSchema, proposeSchema, acceptSchema, cancelSchema, addMilestoneSchema,
]);

// ─────────────────────────── GET: role-scoped list
async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const addr = getAuthAddress(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Detail mode: one engagement + its milestones (role-scoped).
    const detailId = new URL(request.url).searchParams.get('engagement_id');
    if (detailId) {
      const eng = (await query(`SELECT * FROM service_engagements WHERE id = $1`, [detailId])).rows[0];
      if (!eng) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
      if (eng.provider_address !== addr && eng.client_address !== addr) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const milestones = (await query(
        `SELECT id, seq, title, description, amount, escrow_id, status, acceptance_deadline,
                submitted_at, accepted_at, rejected_at, reject_reason
           FROM engagement_milestones WHERE engagement_id = $1 ORDER BY seq`,
        [detailId],
      )).rows;
      return NextResponse.json({
        engagement: { ...eng, role: eng.provider_address === addr ? 'provider' : 'client' },
        milestones,
      });
    }

    const rows = (await query(
      `SELECT e.*,
              (SELECT COUNT(*) FROM engagement_milestones m WHERE m.engagement_id = e.id) AS milestone_count
         FROM service_engagements e
        WHERE e.provider_address = $1 OR e.client_address = $1
        ORDER BY e.updated_at DESC
        LIMIT 200`,
      [addr],
    )).rows;
    // Tell the client which side they are so the UI can render the right actions.
    const engagements = rows.map((e) => ({ ...e, role: e.provider_address === addr ? 'provider' : 'client' }));
    return NextResponse.json({ engagements });
  } catch (err) {
    logger.error('GET /api/merchant/engagements failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load engagements' }, { status: 500 });
  }
}

// ─────────────────────────── POST: state transitions
async function postHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const addr = getAuthAddress(user);
  if (!addr) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  try {
    if (body.action === 'create') {
      if (body.client_address === addr) {
        return NextResponse.json({ error: 'Provider and client must differ' }, { status: 400 });
      }
      const id = newId();
      await query(
        `INSERT INTO service_engagements
           (id, provider_address, client_address, title, scope, terms_hash, status, engagement_type, acceptance_window_secs)
         VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8)`,
        [id, addr, body.client_address, body.title, body.scope ?? '', body.terms_hash ?? null,
         body.engagement_type ?? 'fixed_milestone', body.acceptance_window_secs ?? 604800],
      );
      return NextResponse.json({ id, status: 'draft' }, { status: 201 });
    }

    // All other actions operate on an existing engagement; load + authorize.
    const eng = (await query(`SELECT * FROM service_engagements WHERE id = $1`, [body.id])).rows[0];
    if (!eng) return NextResponse.json({ error: 'Engagement not found' }, { status: 404 });
    const isProvider = eng.provider_address === addr;
    const isClient = eng.client_address === addr;
    if (!isProvider && !isClient) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (body.action === 'add_milestone') {
      if (!isProvider) return NextResponse.json({ error: 'Only the provider may define milestones' }, { status: 403 });
      if (!['draft', 'proposed'].includes(eng.status)) {
        return NextResponse.json({ error: 'Milestones can only be added before the engagement is accepted' }, { status: 409 });
      }
      const mid = newId();
      const client = await getClient();
      try {
        await client.query('BEGIN');
        await client.query(
          `INSERT INTO engagement_milestones (id, engagement_id, seq, title, description, amount, status)
           VALUES ($1,$2,$3,$4,$5,$6,'defined')`,
          [mid, eng.id, body.seq, body.title, body.description ?? '', body.amount],
        );
        await client.query(
          `UPDATE service_engagements
              SET total_amount = COALESCE((SELECT SUM(amount) FROM engagement_milestones WHERE engagement_id = $1), 0),
                  updated_at = NOW()
            WHERE id = $1`,
          [eng.id],
        );
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
      return NextResponse.json({ milestone_id: mid, status: 'defined' }, { status: 201 });
    }

    if (body.action === 'propose') {
      if (!isProvider) return NextResponse.json({ error: 'Only the provider may propose' }, { status: 403 });
      if (eng.status !== 'draft') return NextResponse.json({ error: 'Only a draft can be proposed' }, { status: 409 });
      await query(`UPDATE service_engagements SET status='proposed', proposed_at=NOW(), updated_at=NOW() WHERE id=$1`, [eng.id]);
      emitServerEvent(eng.client_address, 'ENGAGEMENT_PROPOSED', { engagementId: eng.id }, 'engagements').catch(() => {});
      return NextResponse.json({ id: eng.id, status: 'proposed' });
    }

    if (body.action === 'accept') {
      if (!isClient) return NextResponse.json({ error: 'Only the client may accept' }, { status: 403 });
      if (eng.status !== 'proposed') return NextResponse.json({ error: 'Only a proposed engagement can be accepted' }, { status: 409 });
      await query(`UPDATE service_engagements SET status='active', accepted_at=NOW(), updated_at=NOW() WHERE id=$1`, [eng.id]);
      emitServerEvent(eng.provider_address, 'ENGAGEMENT_ACCEPTED', { engagementId: eng.id }, 'engagements').catch(() => {});
      return NextResponse.json({ id: eng.id, status: 'active' });
    }

    if (body.action === 'cancel') {
      // Either party may cancel, but only while no milestone has been funded (escrow_id set).
      const funded = (await query(
        `SELECT 1 FROM engagement_milestones WHERE engagement_id=$1 AND escrow_id IS NOT NULL LIMIT 1`, [eng.id],
      )).rows.length > 0;
      if (funded) return NextResponse.json({ error: 'Cannot cancel after a milestone is funded; resolve milestones individually' }, { status: 409 });
      if (['completed', 'cancelled'].includes(eng.status)) {
        return NextResponse.json({ error: 'Engagement already finalized' }, { status: 409 });
      }
      await query(`UPDATE service_engagements SET status='cancelled', cancelled_at=NOW(), updated_at=NOW() WHERE id=$1`, [eng.id]);
      return NextResponse.json({ id: eng.id, status: 'cancelled' });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    logger.error('POST /api/merchant/engagements failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to process engagement' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
