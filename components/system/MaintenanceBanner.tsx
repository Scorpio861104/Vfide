'use client';

/**
 * REC-3 FIX: maintenance mode banner.
 *
 * Renders a non-dismissable banner at the top of every page when
 * maintenance mode is active. The banner is intentionally not
 * dismissable — if there's a real outage, we don't want users
 * dismissing the warning and then complaining the app is broken.
 *
 * The banner reads maintenance state from a /api/health/ready check
 * (which already exists from v19.3 OP-4). Polls every 60 seconds so
 * the banner appears within a minute of maintenance flipping on,
 * and disappears within a minute of it flipping off.
 *
 * Wire this into the root layout (app/layout.tsx) so it covers
 * every page.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface MaintenanceState {
  active: boolean;
  reason?: string;
  estimatedResolution?: string;
}

const POLL_INTERVAL_MS = 60_000;

export function MaintenanceBanner() {
  const [state, setState] = useState<MaintenanceState>({ active: false });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // Use the readiness endpoint that v19.3 OP-4 added. It
        // returns 503 with a JSON body when any critical dependency
        // is unhealthy. That signal also serves as our maintenance
        // trigger — if readiness is failing, we should be telling
        // users about it.
        const resp = await fetch('/api/health/ready', {
          // Tight timeout — we don't want this slow for users on
          // bad connections.
          signal: AbortSignal.timeout(3000),
        });
        if (cancelled) return;
        if (resp.status === 503) {
          // Try to parse the body for a structured maintenance
          // signal. If parsing fails or the payload doesn't have
          // maintenance fields, fall back to a generic message.
          try {
            const body = await resp.json();
            setState({
              active: true,
              reason: body.message ?? 'Service maintenance in progress',
              estimatedResolution: body.estimatedResolution,
            });
          } catch {
            setState({ active: true, reason: 'Service is temporarily unavailable' });
          }
        } else {
          setState({ active: false });
        }
      } catch {
        // Network error reaching health endpoint. Could be either
        // the user's connection or our infrastructure. Don't show
        // the banner on transient client-side network errors —
        // false positives erode trust. Wait for the next poll.
        // (The previous state stays in place.)
      }
    };

    // Initial check + polling loop
    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!state.active) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className="bg-amber-500/95 text-amber-950 px-4 py-3 text-sm font-medium border-b border-amber-600 shadow-sm"
    >
      <div className="max-w-7xl mx-auto flex items-center gap-3">
        <AlertTriangle size={18} className="flex-shrink-0" aria-hidden="true" />
        <div className="flex-1">
          <strong>Maintenance:</strong> {state.reason ?? "We're updating VFIDE. Some features may be unavailable."}
          {state.estimatedResolution && (
            <span className="ml-2 opacity-80">
              Expected resolution: {state.estimatedResolution}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
