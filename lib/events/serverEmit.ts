/**
 * Server-side ecosystem event emission (Wave 47 rollout).
 *
 * The durable half of the event architecture. After an API route successfully changes state, it
 * calls `emitServerEvent(...)` to persist a row in `ecosystem_events`. The client hydrates its
 * activity timeline from GET /api/events, so coordination survives refresh and reaches other
 * devices — the part the client-side bus alone cannot do.
 *
 * Shares the event vocabulary with the client via `VfideEventType` from lib/events/eventTypes.ts, so
 * server and client can never disagree on event names. RLS in lib/db.ts scopes the insert to the
 * authenticated user (user_address = app.current_user_address), so the address is taken from the
 * request auth context, not trusted from the caller.
 *
 * RESILIENCE: persistence is best-effort. A failure here is logged and swallowed — recording that an
 * action happened must NEVER break or roll back the action itself.
 */

import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import type { VfideEventType } from '@/lib/events/eventTypes';

/**
 * Persist an ecosystem event for the authenticated user.
 *
 * @param userAddress  The acting user's address (lower-cased). Must match the request auth context
 *                     so the RLS insert policy passes.
 * @param type         A catalog event type.
 * @param payload      Optional structured detail (amounts, ids, slugs…). Kept small.
 * @param source       Optional provenance string (e.g. the route name).
 */
export async function emitServerEvent(
  userAddress: string,
  type: VfideEventType,
  payload?: Record<string, unknown>,
  source?: string,
): Promise<void> {
  const addr = userAddress?.trim().toLowerCase();
  if (!addr) return; // no authenticated user → nothing to scope the row to

  try {
    await query(
      `INSERT INTO ecosystem_events (user_address, event_type, payload, source)
       VALUES ($1, $2, $3::jsonb, $4)`,
      [addr, type, JSON.stringify(payload ?? {}), source ?? null],
    );
  } catch (err) {
    // Best-effort: never let event persistence break the primary operation.
    logger.error('emitServerEvent failed', { type, source, error: err instanceof Error ? err.message : String(err) });
  }
}
