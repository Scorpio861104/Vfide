/**
 * Merchant Continuity API (Wave 50, Priority 4).
 *
 * Real, merchant-scoped continuity — separate from PERSONAL continuity (vault heirs). Until now the
 * merchant "Business Continuity" surface linked to personal /inheritance and /vault/recover (a
 * veneer; Wave 44). This manages genuine business-continuity records:
 *   • succession — the designated business successor (who takes over if the owner can't continue).
 *   • operators  — emergency operators who can help run the business WITHOUT ownership.
 *   • readiness  — a computed checklist of how prepared the business is.
 *
 * GET  — returns readiness + current succession + active operators.
 * POST — actions: 'set_succession' | 'clear_succession' | 'grant_operator' | 'revoke_operator'.
 *        Emits MERCHANT_SUCCESSION_CONFIGURED / EMERGENCY_OPERATOR_ASSIGNED on the real action.
 *
 * SCOPE / HONESTY: this records designations and emits events — it does NOT execute an irreversible
 * handoff (reassigning every merchant_* row) or enforce operator access in the auth layer. Those are
 * the gated next step (large, partly on-chain, must be verified carefully). Designation + records +
 * readiness + events are real and complete; execution is explicitly deferred.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { emitServerEvent } from '@/lib/events/serverEmit';
import { z } from 'zod4';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return address ? address : null;
}

interface SuccessionRow { successor_address: string; note: string | null; configured_at: string }
interface OperatorRow { id: string; operator_address: string; role: string; note: string | null; granted_at: string }

interface ReadinessItem { id: string; label: string; met: boolean; detail: string }

async function loadState(merchant: string) {
  const succRes = await query<SuccessionRow>(
    `SELECT successor_address, note, configured_at FROM merchant_succession WHERE merchant_address = $1`,
    [merchant],
  );
  const opsRes = await query<OperatorRow>(
    `SELECT id, operator_address, role, note, granted_at
       FROM merchant_operators
      WHERE merchant_address = $1 AND revoked_at IS NULL
      ORDER BY granted_at DESC`,
    [merchant],
  );
  const profileRes = await query<{ display_name: string | null }>(
    `SELECT display_name FROM merchant_profiles WHERE merchant_address = $1`,
    [merchant],
  );

  const succession = succRes.rows[0] ?? null;
  const operators = opsRes.rows;
  const hasProfile = !!profileRes.rows[0]?.display_name;

  const readiness: ReadinessItem[] = [
    { id: 'has_store', label: 'Your business exists', met: hasProfile, detail: hasProfile ? 'Store set up' : 'Set up your store first' },
    { id: 'has_successor', label: 'Someone can take over', met: !!succession, detail: succession ? 'A successor is chosen' : 'Choose who takes over the business' },
    { id: 'has_operator', label: 'Someone can help in an emergency', met: operators.length > 0, detail: operators.length > 0 ? `${operators.length} emergency operator(s)` : 'Add an emergency operator (optional but recommended)' },
  ];
  const ready = readiness.filter((r) => r.id !== 'has_operator').every((r) => r.met); // operators optional

  return { succession, operators, readiness, ready };
}

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;
  const merchant = getAuthAddress(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const state = await loadState(merchant);
    return NextResponse.json(state);
  } catch (err) {
    logger.error('GET /api/merchant/continuity failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load continuity status' }, { status: 500 });
  }
}

const postSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('set_succession'), successor_address: z.string().regex(ADDRESS_RE), note: z.string().max(400).optional() }),
  z.object({ action: z.literal('clear_succession') }),
  z.object({ action: z.literal('grant_operator'), operator_address: z.string().regex(ADDRESS_RE), role: z.string().max(40).optional(), note: z.string().max(400).optional() }),
  z.object({ action: z.literal('revoke_operator'), operator_address: z.string().regex(ADDRESS_RE) }),
]);

async function postHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;
  const merchant = getAuthAddress(user);
  if (!merchant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  const data = parsed.data;

  try {
    if (data.action === 'set_succession') {
      const successor = data.successor_address.toLowerCase();
      if (successor === merchant) return NextResponse.json({ error: 'You cannot be your own successor' }, { status: 400 });
      const priorRes = await query<{ successor_address: string }>(
        `SELECT successor_address FROM merchant_succession WHERE merchant_address = $1`,
        [merchant],
      );
      const prior = priorRes.rows[0]?.successor_address ?? null;
      await query(
        `INSERT INTO merchant_succession (merchant_address, successor_address, note, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (merchant_address)
         DO UPDATE SET successor_address = EXCLUDED.successor_address, note = EXCLUDED.note, updated_at = NOW()`,
        [merchant, successor, data.note ?? null],
      );
      await emitServerEvent(merchant, 'MERCHANT_SUCCESSION_CONFIGURED', { successor }, 'api/merchant/continuity');
      if (prior && prior.toLowerCase() !== successor) {
        await emitServerEvent(merchant, 'SUCCESSOR_CHANGED', { from: prior, to: successor }, 'api/merchant/continuity');
      }
    } else if (data.action === 'clear_succession') {
      await query(`DELETE FROM merchant_succession WHERE merchant_address = $1`, [merchant]);
    } else if (data.action === 'grant_operator') {
      const operator = data.operator_address.toLowerCase();
      if (operator === merchant) return NextResponse.json({ error: 'You are already the owner' }, { status: 400 });
      // Re-granting a previously-revoked operator clears the revocation.
      await query(
        `INSERT INTO merchant_operators (merchant_address, operator_address, role, note)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (merchant_address, operator_address)
         DO UPDATE SET role = EXCLUDED.role, note = EXCLUDED.note, revoked_at = NULL, granted_at = NOW()`,
        [merchant, operator, data.role ?? 'operator', data.note ?? null],
      );
      await emitServerEvent(merchant, 'EMERGENCY_OPERATOR_ASSIGNED', { operator }, 'api/merchant/continuity');
    } else if (data.action === 'revoke_operator') {
      await query(
        `UPDATE merchant_operators SET revoked_at = NOW()
          WHERE merchant_address = $1 AND operator_address = $2 AND revoked_at IS NULL`,
        [merchant, data.operator_address.toLowerCase()],
      );
    }

    const state = await loadState(merchant);
    return NextResponse.json(state);
  } catch (err) {
    logger.error('POST /api/merchant/continuity failed', { action: data.action, error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to update continuity' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
