/**
 * Ecosystem Activity API (Wave 47 rollout).
 *
 * GET — returns the authenticated user's recent ecosystem events, newest first, so the client
 * activity timeline can hydrate from durable storage instead of being limited to the current
 * session. RLS (lib/db.ts) already scopes rows to the authenticated user; the explicit
 * user_address filter is defence-in-depth.
 *
 * The plain-language line, layers, and Nexus node for each event are derived on the CLIENT from the
 * shared catalog (lib/events/eventTypes.ts) keyed by event_type — so this route stays a thin data
 * endpoint and the vocabulary lives in one place.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

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

async function getHandler(request: NextRequest, user: JWTPayload): Promise<Response> {
  const rl = await withRateLimit(request, 'read');
  if (rl) return rl;

  const authAddress = getAuthAddress(user);
  if (!authAddress) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Optional ?limit= (clamped) so a long-lived account doesn't return an unbounded list.
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

export const GET = withAuth(getHandler);
