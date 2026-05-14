'use client';

/**
 * useTransactionTrail / startTransactionTrail
 *
 * A tiny pub/sub store outside React so any write-hook can fire a trail
 * without having access to the AppShell's render tree. A single
 * TransactionTrailOverlay component subscribes and renders the trails
 * as particles flowing from a source DOM point to a destination DOM
 * point (or screen-edge fallback when only one anchor is provided).
 *
 * Lifecycle of a trail:
 *
 *   startTransactionTrail({ id, label, sourceEl, destEl }) → 'pending'
 *   updateTransactionTrail(id, 'signing')      // wallet sig prompt shown
 *   updateTransactionTrail(id, 'submitted')    // tx broadcast
 *   updateTransactionTrail(id, 'confirmed')    // landed on-chain
 *   updateTransactionTrail(id, 'failed', err)  // sig rejected / tx reverted
 *
 * After a terminal state ('confirmed' or 'failed') the trail self-disposes
 * about 1.4s later, giving the overlay time to play the landing/reverse
 * animation. Consumers don't need to call dispose explicitly.
 *
 * The hook (useTransactionTrails) is the read-side; the imperative
 * functions are how write-hooks emit events without React reactivity.
 */

import { useEffect, useState } from 'react';

export type TrailStatus = 'pending' | 'signing' | 'submitted' | 'confirmed' | 'failed';

export interface Trail {
  id: string;
  label?: string;
  status: TrailStatus;
  /** Optional source DOM element — typically the Pay button. */
  sourceEl?: HTMLElement | null;
  /** Optional destination DOM element — typically the destination address chip. */
  destEl?: HTMLElement | null;
  /** Optional explicit tier color for the trail. */
  tierHex?: string;
  /** Optional failure detail. */
  error?: string;
  /** Internal: when the trail was created. */
  startedAt: number;
  /** Internal: when the trail entered its terminal status. */
  finishedAt?: number;
}

type Listener = (trails: ReadonlyMap<string, Trail>) => void;

const trails = new Map<string, Trail>();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(trails);
}

export function startTransactionTrail(args: {
  id: string;
  label?: string;
  sourceEl?: HTMLElement | null;
  destEl?: HTMLElement | null;
  tierHex?: string;
}): void {
  trails.set(args.id, {
    id: args.id,
    label: args.label,
    sourceEl: args.sourceEl,
    destEl: args.destEl,
    tierHex: args.tierHex,
    status: 'pending',
    startedAt: Date.now(),
  });
  emit();
}

export function updateTransactionTrail(
  id: string,
  status: TrailStatus,
  error?: string,
): void {
  const t = trails.get(id);
  if (!t) return;
  const finishedAt =
    status === 'confirmed' || status === 'failed' ? Date.now() : t.finishedAt;
  trails.set(id, { ...t, status, error, finishedAt });
  emit();
  if (status === 'confirmed' || status === 'failed') {
    // Auto-dispose after the landing animation plays.
    window.setTimeout(() => {
      trails.delete(id);
      emit();
    }, 1400);
  }
}

export function clearTransactionTrails(): void {
  trails.clear();
  emit();
}

/** Subscribe-style hook used by TransactionTrailOverlay. */
export function useTransactionTrails(): Trail[] {
  const [snapshot, setSnapshot] = useState<Trail[]>(() => Array.from(trails.values()));
  useEffect(() => {
    const listener: Listener = (t) => setSnapshot(Array.from(t.values()));
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return snapshot;
}
