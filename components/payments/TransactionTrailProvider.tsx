'use client';

/**
 * TransactionTrailProvider — global "transaction in flight" registry.
 *
 * Purpose: close the worst-feeling UX gap in the app — the 5-15 seconds
 * between tapping a write button and seeing the receipt. Right now that
 * gap is empty. With this provider mounted (in AppShell), every payment
 * and withdrawal call animates a trail of particles in a corner card
 * while the wallet is signing + the receipt is confirming.
 *
 * Two visual modes:
 *
 *   - Orbital-only (default). The corner card shows particles orbiting
 *     inward, success ✓ on resolve, error ✗ on failure. No geometry
 *     coupling — works on any write hook without per-page changes.
 *
 *   - Button-to-corner swarm (opt-in). When the user clicks an element
 *     marked `data-trail-source` on the page, we capture the click
 *     position. The next trail.start() within 30s uses that position as
 *     the spawn origin: a one-shot swarm of particles flies from the
 *     clicked button along a curved path to the corner card, then the
 *     orbital takes over.
 *
 * Surface area:
 *   - <TransactionTrailProvider> wraps children, holds the active set.
 *   - useTransactionTrail() returns { trails, start }.
 *   - trail.start(label, opts) returns { id, resolve(success) }.
 *   - The visual layer is a sibling component (TransactionTrailLayer)
 *     that consumes the context and renders particles.
 *
 * Design constraints:
 *   - State stored locally; no off-chain server. Closing the tab drops
 *     in-flight trails (the on-chain transaction proceeds independently —
 *     this is purely a visualization).
 *   - Multiple concurrent trails supported (user submits payment +
 *     withdrawal back-to-back). Cap at 4 visible; older ones fall off.
 *   - Resolved trails persist for 2s post-resolve so the success/error
 *     state is visible, then garbage-collected by a timer.
 *   - Click position is held in a ref (not state), so subscribers never
 *     re-render due to mouse movement.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { TIER_HEX } from '@/lib/animation/visualPrimitives';

export type TrailStatus = 'pending' | 'success' | 'error';

export interface SourcePos {
  /** Viewport x in pixels. */
  x: number;
  /** Viewport y in pixels. */
  y: number;
  /** Wall-clock ms when the click happened. Used for the freshness window. */
  capturedAt: number;
}

export interface Trail {
  id: string;
  label: string;
  startedAt: number;
  status: TrailStatus;
  /** When the status transitioned to 'success' or 'error'. null while pending. */
  resolvedAt: number | null;
  /** Hex color for particles + result icon. Defaults to the trusted-tier cyan. */
  tierHex: string;
  /** Optional error message shown on the failure card. */
  errorMessage?: string;
  /** Click position captured from a [data-trail-source] element, if recent. */
  sourcePos: SourcePos | null;
}

export interface TrailHandle {
  id: string;
  /** Mark this trail as completed. Pass an error message on failure for the card. */
  resolve: (success: boolean, errorMessage?: string) => void;
  /** Manually dismiss the trail card immediately (used by a tap-to-dismiss). */
  dismiss: () => void;
}

interface TransactionTrailContextValue {
  trails: Trail[];
  start: (label: string, opts?: { tierHex?: string }) => TrailHandle;
}

const TransactionTrailContext = createContext<TransactionTrailContextValue | undefined>(
  undefined,
);

/** How long resolved trails stay visible after their final state. */
const RESOLVED_VISIBLE_MS = 2_000;
/** Max concurrent visible trails. Older overflow drops off. */
const MAX_CONCURRENT_TRAILS = 4;
/** How long a [data-trail-source] click stays usable as a swarm origin.
 *  Generous: covers AppLock unlock + wallet signature time. */
const CLICK_FRESHNESS_MS = 30_000;

export function TransactionTrailProvider({ children }: { children: ReactNode }) {
  const [trails, setTrails] = useState<Trail[]>([]);
  // Per-trail timer ids so dismiss/resolve can clear stale GC timers.
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const nextIdRef = useRef(0);
  // Most-recent click on a [data-trail-source] element. Held in a ref so
  // mouse movement never re-renders subscribers.
  const sourceClickRef = useRef<SourcePos | null>(null);

  // Global click capture — single listener for the whole app.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Element | null;
      if (!target || !('closest' in target)) return;
      const trailHost = target.closest('[data-trail-source]');
      if (!trailHost) return;
      // Use the host element's center as the spawn origin — more visually
      // consistent than the exact click point (no jitter from where the
      // user's finger landed on the button).
      const rect = trailHost.getBoundingClientRect();
      sourceClickRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        capturedAt: Date.now(),
      };
    };
    // Capture phase so we record the click before any preventDefault/stopProp.
    window.addEventListener('mousedown', handler, true);
    window.addEventListener('touchstart', handler, true);
    return () => {
      window.removeEventListener('mousedown', handler, true);
      window.removeEventListener('touchstart', handler, true);
    };
  }, []);

  // Clean up all GC timers on unmount so we don't leak.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const removeTrail = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setTrails((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const start = useCallback<TransactionTrailContextValue['start']>(
    (label, opts) => {
      const id = `trail-${++nextIdRef.current}`;
      const tierHex = opts?.tierHex ?? TIER_HEX.trusted;

      // Consume the recent click if it's fresh enough — otherwise null
      // and the layer falls back to orbital-only.
      let sourcePos: SourcePos | null = null;
      const captured = sourceClickRef.current;
      if (captured && Date.now() - captured.capturedAt <= CLICK_FRESHNESS_MS) {
        sourcePos = captured;
      }
      sourceClickRef.current = null; // consume — don't reuse for a different start()

      setTrails((prev) => {
        const next = [
          ...prev,
          {
            id,
            label,
            startedAt: Date.now(),
            status: 'pending' as TrailStatus,
            resolvedAt: null,
            tierHex,
            sourcePos,
          },
        ];
        // Cap concurrent trails — drop the oldest pending if we overflow.
        if (next.length > MAX_CONCURRENT_TRAILS) {
          // Prefer to evict the oldest already-resolved one first.
          const idxResolved = next.findIndex((t) => t.status !== 'pending');
          if (idxResolved >= 0) next.splice(idxResolved, 1);
          else next.shift();
        }
        return next;
      });

      const resolve: TrailHandle['resolve'] = (success, errorMessage) => {
        setTrails((prev) =>
          prev.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status: success ? 'success' : 'error',
                  resolvedAt: Date.now(),
                  errorMessage: success ? undefined : errorMessage,
                }
              : t,
          ),
        );
        // Schedule GC.
        const old = timersRef.current.get(id);
        if (old) clearTimeout(old);
        const timer = setTimeout(() => removeTrail(id), RESOLVED_VISIBLE_MS);
        timersRef.current.set(id, timer);
      };

      const dismiss = () => removeTrail(id);

      return { id, resolve, dismiss };
    },
    [removeTrail],
  );

  const value = useMemo<TransactionTrailContextValue>(
    () => ({ trails, start }),
    [trails, start],
  );

  return (
    <TransactionTrailContext.Provider value={value}>
      {children}
    </TransactionTrailContext.Provider>
  );
}

/**
 * Hook for write-call sites. Returns:
 *   - trails: current state (typically not used by call sites)
 *   - start(label): begin a trail; returns { id, resolve, dismiss }
 *
 * Call sites usually just need `start`. The pattern:
 *
 *   const trail = useTransactionTrail();
 *   const handle = trail.start('Payment of 50 VFIDE');
 *   try {
 *     await writeContractAsync(...);
 *     handle.resolve(true);
 *   } catch (err) {
 *     handle.resolve(false, err instanceof Error ? err.message : 'Failed');
 *   }
 *
 * For the button-to-corner swarm visual to fire, the page's submit
 * button must have a `data-trail-source` attribute. If absent, the
 * trail still works — it just renders as the orbital-only fallback.
 *
 * If the provider isn't mounted (test environment, embed page) the hook
 * returns a no-op shim so call sites don't have to null-check.
 */
export function useTransactionTrail(): TransactionTrailContextValue {
  const ctx = useContext(TransactionTrailContext);
  if (ctx) return ctx;
  // No-op shim — call sites stay clean.
  return {
    trails: [],
    start: () => ({
      id: 'noop',
      resolve: () => {},
      dismiss: () => {},
    }),
  };
}
