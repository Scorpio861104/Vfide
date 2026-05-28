'use client';

/**
 * MonumentCorner — small persistent brand element in the bottom-right
 * of every page.
 *
 * Three jobs:
 *   1. Be a recognizable brand artifact present everywhere. Linear's
 *      L lozenge, Vercel's triangle, Slack's lozenge — they all do
 *      this. VFIDE didn't have one. Now it does.
 *   2. Pulse the vertex on every protocol event from useProtocolPulse,
 *      so the system feels alive even when the user is on a page
 *      that's not directly showing activity (settings, governance, etc).
 *   3. On click, expand into a small overlay showing the last few
 *      events — a global "what's happening" peek that doesn't require
 *      navigating away.
 *
 * Design: the Monument SVG is drawn at 36×40 so it sits comfortably
 * above the bottom-right corner without intruding on content. The
 * vertex pulse is a brief radial glow (350ms) that fires whenever a
 * new event arrives. Color of the glow matches the event's tier.
 *
 * Honest constraint: this is decoration plus a peek. It doesn't try
 * to replace the dedicated /governance, /treasury, etc. pages. The
 * overlay is a teaser, not a full dashboard.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUpRight, Flame, ArrowRight, Shield, Vote, TrendingUp } from 'lucide-react';
import { useProtocolPulse, type PulseEvent } from '@/hooks/useProtocolPulse';
import { Numeric } from '@/components/ui/Numeric';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const ICON_FOR_KIND = {
  payment:    ArrowRight,
  burn:       Flame,
  guardian:   Shield,
  governance: Vote,
  score:      TrendingUp,
} as const;

export function MonumentCorner() {
  const reduce = usePrefersReducedMotion();
  const { events, tierHex, mode } = useProtocolPulse();
  const [open, setOpen] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [pulseHex, setPulseHex] = useState(tierHex);
  const lastSeenIdRef = useRef<number | null>(null);

  // Fire a vertex pulse whenever a new event arrives. We compare
  // against the most-recent event id we've already shown a pulse for.
  useEffect(() => {
    const first = events[0];
    if (!first) return;
    if (lastSeenIdRef.current === first.id) return;
    lastSeenIdRef.current = first.id;
    if (reduce) return;
    setPulseHex(first.tierHex);
    setPulseKey((k) => k + 1);
  }, [events, reduce]);

  return (
    <>
      {/* The corner mark itself.
          Bottom offset: 16px on desktop, 80px on mobile so it sits above
          the 64px BottomTabBar. Right offset constant at 16px. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group fixed bottom-20 md:bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/80 backdrop-blur-md transition hover:bg-zinc-900 hover:scale-105 active:scale-95"
        aria-label={open ? 'Close protocol pulse' : 'View protocol pulse'}
        aria-expanded={open}
      >
        <MonumentMark vertexHex={tierHex} />
        {/* Vertex pulse — fires once per new event. AnimatePresence's
            `key` change retriggers the animation cleanly. */}
        {!reduce && (
          <AnimatePresence>
            <motion.span
              key={pulseKey}
              aria-hidden="true"
              className="pointer-events-none absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
              style={{ background: pulseHex }}
              initial={{ scale: 1, opacity: 0.9, boxShadow: `0 0 0 0 ${pulseHex}99` }}
              animate={{ scale: 4, opacity: 0, boxShadow: `0 0 16px 6px ${pulseHex}00` }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </AnimatePresence>
        )}
        {/* Ambient activity dot — tiny indicator that the protocol
            has *something* happening; reassures the user the mark is
            "live" even between event pulses. */}
        <span className="pointer-events-none absolute right-1 top-1 flex h-1.5 w-1.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: tierHex }}
          />
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ background: tierHex }}
          />
        </span>
      </button>

      {/* Peek overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-36 md:bottom-20 right-4 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-xl"
            role="dialog"
            aria-label="Recent protocol activity"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                    style={{ background: tierHex }}
                  />
                  <span
                    className="relative inline-flex h-2 w-2 rounded-full"
                    style={{ background: tierHex }}
                  />
                </span>
                <div className="text-sm font-semibold text-white">Protocol pulse</div>
                {mode === 'demo' && (
                  <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-amber-300">
                    Demo
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {events.slice(0, 12).map((event) => (
                <PulseRow key={event.id} event={event} />
              ))}
            </div>

            <div className="border-t border-white/10 px-4 py-2">
              <Link
                href="/treasury"
                className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent"
              >
                Full activity <ArrowUpRight size={10} />
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function PulseRow({ event }: { event: PulseEvent }) {
  const Icon = ICON_FOR_KIND[event.kind];
  return (
    <div className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5 last:border-b-0 hover:bg-white/[0.02]">
      <span
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md"
        style={{ background: `${event.tierHex}22`, color: event.tierHex }}
      >
        <Icon size={12} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5 text-xs">
          <span className="text-gray-300">{event.label}</span>
          {event.kind === 'payment' && event.amount !== undefined && (
            <Numeric value={event.amount} format="currency" size="xs" weight={600} className="text-white" />
          )}
          {event.kind === 'burn' && event.amount !== undefined && (
            <Numeric
              value={event.amount}
              format="token"
              unit={event.unit ?? 'VFIDE'}
              precision={4}
              size="xs"
              weight={600}
              className="text-orange-300"
            />
          )}
          {event.kind === 'score' && event.score !== undefined && (
            <Numeric value={event.score} format="score" size="xs" weight={600} className="text-white" />
          )}
        </div>
        {event.detail && (
          <div className="font-numeric mt-0.5 text-[10px] text-gray-600">{event.detail}</div>
        )}
      </div>
      <Numeric
        value={event.ts}
        format="time"
        size="xs"
        weight={400}
        className="flex-shrink-0 text-gray-500"
      />
    </div>
  );
}

/**
 * Mini Monument — 36×40 SVG of the canonical mark with a tintable vertex.
 * Sized to fit the 48×48 button comfortably with room for the activity dot.
 */
function MonumentMark({ vertexHex }: { vertexHex: string }) {
  return (
    <svg
      viewBox="0 0 400 440"
      width="22"
      height="24"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mc-vLeft" x1="84" y1="56" x2="188" y2="334" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9ca3af" />
          <stop offset="1" stopColor="#374151" />
        </linearGradient>
        <linearGradient id="mc-vRight" x1="316" y1="56" x2="212" y2="334" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9ca3af" />
          <stop offset="1" stopColor="#374151" />
        </linearGradient>
        <linearGradient id="mc-vEdge" x1="200" y1="56" x2="200" y2="370" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={vertexHex} stopOpacity="0.8" />
          <stop offset="0.5" stopColor={vertexHex} stopOpacity="0.25" />
          <stop offset="1" stopColor={vertexHex} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d="M72 56H114L192 320L176 320L72 56Z" fill="url(#mc-vLeft)" />
      <path d="M328 56H286L208 320H224L328 56Z" fill="url(#mc-vRight)" />
      <path d="M72 56L200 370L328 56" stroke="url(#mc-vEdge)" strokeWidth="2" fill="none" />
      <circle cx="200" cy="370" r="14" fill={vertexHex} fillOpacity="0.15" />
      <circle cx="200" cy="370" r="8" fill={vertexHex} />
    </svg>
  );
}

export default MonumentCorner;
