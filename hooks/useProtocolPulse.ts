'use client';

/**
 * useProtocolPulse — the network's heartbeat, as a hook.
 *
 * The ticker strip and the Monument corner both read from this. It
 * gives them a unified data source so the two elements always agree
 * on what "the protocol is doing right now" means: the same event
 * that drives a particle into the ticker also makes the Monument's
 * vertex pulse.
 *
 * Two modes:
 *
 *   - 'demo' (current default) — synthetic events generated locally
 *     with realistic distributions. Used pre-mainnet and as a
 *     fallback when RPC is unreachable. Every event has a
 *     `synthetic: true` flag so the UI can label them honestly.
 *
 *   - 'live' (future) — `useWatchContractEvent` against the VFIDE
 *     token's Transfer event + the MerchantPortal's PaymentProcessed
 *     event. The hook returns the same event shape, so consumers
 *     don't need to know which mode they're in.
 *
 * The hook holds at most LATEST_EVENT_BUFFER events in memory and
 * gives consumers:
 *   - `events`: the buffer (newest first), updated on each new event
 *   - `lastEventAt`: timestamp of the most recent event (or null)
 *   - `mode`: 'demo' | 'live'
 *   - `tier`: aggregate tier color hex — derived from the rolling
 *     ProofScore of the last N events, used to tint the Monument
 *     and ticker accents
 *
 * Perf: state updates are throttled — we never re-render consumers
 * more than 10 times per second even if events are arriving faster.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

export type PulseEventKind = 'payment' | 'burn' | 'score' | 'guardian' | 'governance';

export interface PulseEvent {
  /** Stable monotonic id. */
  id: number;
  /** When the event was observed (epoch ms). */
  ts: number;
  /** What kind of activity this is — drives the icon and color in the ticker. */
  kind: PulseEventKind;
  /** Headline number, used by the ticker (e.g. payment amount in $). */
  amount?: number;
  /** Token unit, when applicable. */
  unit?: string;
  /** Score value, when kind === 'score'. */
  score?: number;
  /** Short human-friendly label shown in the ticker. */
  label: string;
  /** Optional secondary detail (e.g. truncated address). */
  detail?: string;
  /** Tier color hex this event should pulse with. */
  tierHex: string;
  /** True when synthetic — let the UI add a small "demo" badge. */
  synthetic: boolean;
}

const LATEST_EVENT_BUFFER = 30;
const RENDER_THROTTLE_MS = 100;

// Tier color palette — kept in sync with LiveProofScoreHero.tsx
const TIER_HEX: Record<string, string> = {
  risky:      '#fb7185',
  low:        '#fb923c',
  neutral:    '#fbbf24',
  governance: '#38bdf8',
  trusted:    '#34d399',
  council:    '#22d3ee',
  elite:      '#a78bfa',
};

function tierForScore(score: number): string {
  if (score >= 8000) return TIER_HEX.elite!;
  if (score >= 7000) return TIER_HEX.council!;
  if (score >= 5600) return TIER_HEX.trusted!;
  if (score >= 5400) return TIER_HEX.governance!;
  if (score >= 5000) return TIER_HEX.neutral!;
  if (score >= 3500) return TIER_HEX.low!;
  return TIER_HEX.risky!;
}

function shortAddress(): string {
  const hex = '0123456789abcdef';
  let out = '0x';
  for (let i = 0; i < 4; i++) out += hex[Math.floor(Math.random() * 16)]!;
  out += '…';
  for (let i = 0; i < 4; i++) out += hex[Math.floor(Math.random() * 16)]!;
  return out;
}

/**
 * Weighted random event generator. The mix matches what a payment
 * protocol's pulse would actually look like: mostly payments, some
 * burns (those are the side-effect of payments), occasional score
 * changes, rare governance/guardian events.
 */
function generateDemoEvent(id: number, baseTs: number): PulseEvent {
  const roll = Math.random();
  const ts = baseTs;

  // Most-common: payments.
  if (roll < 0.55) {
    // Skewed log-normal-ish: most payments small, occasional larger.
    const r = Math.random();
    const amount = +(2 + Math.pow(r, 3) * 480).toFixed(2);
    const score = 3500 + Math.floor(Math.random() * 5500);
    return {
      id, ts, kind: 'payment',
      amount,
      unit: 'USD',
      label: 'Payment',
      detail: shortAddress(),
      tierHex: tierForScore(score),
      synthetic: true,
    };
  }
  // Burns (the 35% fee channel firing).
  if (roll < 0.80) {
    const amount = +(0.1 + Math.random() * 12).toFixed(4);
    return {
      id, ts, kind: 'burn',
      amount,
      unit: 'VFIDE',
      label: 'Burned',
      tierHex: '#f97316',
      synthetic: true,
    };
  }
  // Score updates (someone's ProofScore moved).
  if (roll < 0.93) {
    const score = 3500 + Math.floor(Math.random() * 6500);
    return {
      id, ts, kind: 'score',
      score,
      label: 'ProofScore',
      detail: shortAddress(),
      tierHex: tierForScore(score),
      synthetic: true,
    };
  }
  // Guardian activity.
  if (roll < 0.98) {
    return {
      id, ts, kind: 'guardian',
      label: 'Guardian set',
      detail: shortAddress(),
      tierHex: '#22d3ee',
      synthetic: true,
    };
  }
  // Governance.
  return {
    id, ts, kind: 'governance',
    label: 'Vote cast',
    detail: shortAddress(),
    tierHex: '#a78bfa',
    synthetic: true,
  };
}

export interface UseProtocolPulseValue {
  events: PulseEvent[];
  lastEventAt: number | null;
  mode: 'demo' | 'live';
  /** Dominant tier color across the last N events. Used by the Monument backdrop. */
  tierHex: string;
}

let globalIdCounter = 0;

/**
 * Subscribe to the protocol's heartbeat. Currently runs in 'demo'
 * mode — synthetic events at ~1-3 Hz with realistic distributions.
 * Returns a stable event buffer that components can iterate.
 */
export function useProtocolPulse(): UseProtocolPulseValue {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const eventsRef = useRef<PulseEvent[]>([]);
  const lastRenderRef = useRef<number>(0);

  // Seed with a few events so the ticker doesn't start empty on first
  // paint. Done once via useState's initializer-as-effect pattern —
  // we use a ref so consumers don't need to suspend.
  const seededRef = useRef(false);
  if (!seededRef.current) {
    seededRef.current = true;
    const now = Date.now();
    const seeded: PulseEvent[] = [];
    for (let i = 0; i < 8; i++) {
      seeded.unshift(
        generateDemoEvent(globalIdCounter++, now - (8 - i) * 1500)
      );
    }
    eventsRef.current = seeded;
  }

  useEffect(() => {
    let cancelled = false;
    let nextDelay = 800 + Math.random() * 1800;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (cancelled) return;
      timer = setTimeout(() => {
        const ev = generateDemoEvent(globalIdCounter++, Date.now());
        const next = [ev, ...eventsRef.current].slice(0, LATEST_EVENT_BUFFER);
        eventsRef.current = next;

        // Throttle the React update so consumers re-render at most
        // every RENDER_THROTTLE_MS. Critical for the ticker which
        // would otherwise reflow on every event.
        const now = performance.now();
        if (now - lastRenderRef.current >= RENDER_THROTTLE_MS) {
          lastRenderRef.current = now;
          setEvents(next);
        }

        nextDelay = 600 + Math.random() * 2400;
        schedule();
      }, nextDelay);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  // On first mount, push the seeded buffer into state so the very
  // first render after mount has events (the seeded ref alone wouldn't
  // trigger a re-render).
  useEffect(() => {
    setEvents(eventsRef.current);
  }, []);

  const lastEventAt = events[0]?.ts ?? null;

  // Dominant tier color — most-common tier hex in the last 8 events.
  // This drives the Monument's vertex tint when the corner element
  // is wired to the global pulse.
  const tierHex = useMemo(() => {
    const recent = events.slice(0, 8);
    if (recent.length === 0) return TIER_HEX.neutral!;
    const counts: Record<string, number> = {};
    for (const e of recent) counts[e.tierHex] = (counts[e.tierHex] ?? 0) + 1;
    let max = 0;
    let winner = TIER_HEX.neutral!;
    for (const [hex, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        winner = hex;
      }
    }
    return winner;
  }, [events]);

  return {
    events,
    lastEventAt,
    mode: 'demo',
    tierHex,
  };
}
