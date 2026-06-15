/**
 * Ecosystem Activity API (Wave 47, extended in Wave 49).
 *
 * GET  — the authenticated user's recent ecosystem events (durable timeline hydrate).
 * POST — persist a single ecosystem event for the authenticated user. Used by client emitters that
 *        don't flow through another API route (notably on-chain continuity/protection/governance
 *        actions, where the on-chain tx is the real proof and this records it for coordination).
 *
 * RLS (lib/db.ts) scopes every row to the authenticated user. The POST validates the event type
 * against the shared catalog so arbitrary strings can't be written.
 *
 * HONESTY / TRUST BOUNDARY: a POSTed event is SELF-ATTESTED — the server does not re-verify that the
 * underlying action happened. These events drive DISPLAY (timeline, Nexus live pulse, notifications)
 * only. Authoritative state (a node being "established", trust/preparedness gating) must continue to
 * derive from on-chain / server-verified reads, never from this event log. Server-emitted events
 * (from routes that just performed the write) are the trustworthy ones; client POSTs are for UX.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';
import { EVENT_ROUTES, type VfideEventType } from '@/lib/events/eventTypes';

export const dynamic = 'force-dynamic';

function getAuthAddress(user: JWTPayload): string | null {
  const address = typeof user.address === 'string' ? user.address.trim().toLowerCase() : '';
  return address ? address : null;
}

interface EcosystemEventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  source: string | null;
  created_at: string;
}

// Valid event types come from the shared catalog — a POST can only write a known type.
const VALID_EVENT_TYPES = Object.keys(EVENT_ROUTES) as VfideEventType[];

const postEventSchema = z.object({
  type: z.enum(VALID_EVENT_TYPES as [VfideEventType, ...VfideEventType[]]),
  payload: z.record(z.string(), z.unknown()).optional(),
  source: z.string().max(120).optional(),
});

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limitParam = Number(new URL(request.url).searchParams.get('limit'));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 100) : 50;

  try {
    const result = await query<EcosystemEventRow>(
      `SELECT id, event_type, payload, source, created_at
         FROM ecosystem_events
        WHERE user_address = $1
        ORDER BY created_at DESC
        LIMIT $2`,
      [authAddress, limit],
    );
    return NextResponse.json({ events: result.rows });
  } catch (err) {
    logger.error('GET /api/events failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to load activity' }, { status: 500 });
  }
}

async function postHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'write');
  if (rl) return rl;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = postEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
  }

  try {
    const result = await query<EcosystemEventRow>(
      `INSERT INTO ecosystem_events (user_address, event_type, payload, source)
       VALUES ($1, $2, $3::jsonb, $4)
       RETURNING id, event_type, payload, source, created_at`,
      [authAddress, parsed.data.type, JSON.stringify(parsed.data.payload ?? {}), parsed.data.source ?? null],
    );
    return NextResponse.json({ event: result.rows[0] }, { status: 201 });
  } catch (err) {
    logger.error('POST /api/events failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
