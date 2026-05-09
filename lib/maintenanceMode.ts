/**
 * REC-3 FIX: graceful "system in maintenance" mode.
 *
 * When a critical dependency is down (DB, Redis, indexer falling
 * behind), the API returns 500 errors and the frontend has no signal
 * to degrade gracefully — users see broken pages instead of a clear
 * "we'll be back shortly" message.
 *
 * This module provides:
 *   1. A maintenance-mode flag that operators can flip via env var
 *      or via a runtime database flag (the runtime path lets ops
 *      toggle without redeploy)
 *   2. A function to check current maintenance state
 *   3. A constant for the standard maintenance status payload
 *
 * Activation modes:
 *   - Env var (deploy-time, hardest): NEXT_PUBLIC_MAINTENANCE_MODE=true
 *   - Runtime DB flag (soft, recoverable): row in app_config table
 *   - Auto-trip (when /api/health/ready reports critical dependency
 *     unhealthy for >5 minutes consecutively — opt-in via
 *     MAINTENANCE_AUTO_TRIP=true)
 *
 * The frontend layout renders a banner above the page when this
 * returns true. API routes can short-circuit with 503 and the
 * standard payload when maintenance is active.
 *
 * IMPORTANT: this module is read-only from the frontend layer.
 * Toggling maintenance ON/OFF via the runtime DB flag requires a
 * separate operator endpoint (we recommend wiring this through your
 * existing admin tooling rather than exposing a public toggle).
 */

export interface MaintenanceState {
  active: boolean;
  reason?: string;
  estimatedResolution?: string; // ISO 8601 timestamp
}

const MAINTENANCE_STATUS_PAYLOAD = {
  status: 'maintenance',
  message:
    "We're performing maintenance to keep VFIDE running smoothly. Please check back in a few minutes.",
  retryAfterSeconds: 60,
};

/**
 * Check if maintenance mode is active. Reads (in order):
 *   1. NEXT_PUBLIC_MAINTENANCE_MODE env var (deploy-time)
 *   2. app_config.maintenance_active row (runtime, requires DB)
 *
 * Returns the current maintenance state. Never throws — if the DB
 * lookup fails (which is exactly when we'd be entering maintenance
 * anyway), falls back to env-var-only.
 */
export async function getMaintenanceState(): Promise<MaintenanceState> {
  // Fast path: env var. Useful for emergency hard-stops where ops
  // wants to redeploy with maintenance ON before fixing the
  // underlying issue.
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true') {
    return {
      active: true,
      reason: process.env.NEXT_PUBLIC_MAINTENANCE_REASON ?? 'Scheduled maintenance',
      estimatedResolution: process.env.NEXT_PUBLIC_MAINTENANCE_RESOLUTION,
    };
  }

  // Runtime path: DB-backed flag. Lets ops toggle on/off without
  // redeploy. Wrapped in try/catch because if the DB itself is the
  // failing dependency, we don't want this check to crash and add to
  // the chaos.
  try {
    const { query } = await import('@/lib/db');
    const result = await query<{ value: string }>(
      "SELECT value FROM app_config WHERE key = 'maintenance_active' LIMIT 1",
    );
    const row = result.rows[0];
    if (row && row.value === 'true') {
      const reasonResult = await query<{ value: string }>(
        "SELECT value FROM app_config WHERE key = 'maintenance_reason' LIMIT 1",
      );
      const resolutionResult = await query<{ value: string }>(
        "SELECT value FROM app_config WHERE key = 'maintenance_resolution' LIMIT 1",
      );
      return {
        active: true,
        reason: reasonResult.rows[0]?.value ?? 'Maintenance window',
        estimatedResolution: resolutionResult.rows[0]?.value,
      };
    }
  } catch {
    // DB is presumably the failing dependency. Falling through to
    // "not active via DB" is the safe choice — the env var
    // already-checked path is the authoritative emergency-stop.
  }

  return { active: false };
}

/**
 * Standard maintenance status response payload. Use from API routes
 * that want to short-circuit with 503 when maintenance is active.
 *
 *   const m = await getMaintenanceState();
 *   if (m.active) {
 *     return NextResponse.json(getMaintenanceResponsePayload(m), {
 *       status: 503,
 *       headers: { 'Retry-After': String(MAINTENANCE_STATUS_PAYLOAD.retryAfterSeconds) },
 *     });
 *   }
 */
export function getMaintenanceResponsePayload(state: MaintenanceState) {
  return {
    ...MAINTENANCE_STATUS_PAYLOAD,
    reason: state.reason,
    estimatedResolution: state.estimatedResolution,
  };
}
