'use client';

/**
 * ProtocolTicker — the network's pulse, visible on every page.
 *
 * A thin strip pinned just below the top nav. Recent payments, burns,
 * score changes, governance votes — all flowing left at a calm pace.
 * The product feels alive everywhere, not just on the landing page.
 *
 * Design constraints:
 *
 *   - Continuous scroll with no visible reset. Items are duplicated;
 *     when the first copy scrolls off, the transform resets while the
 *     second copy is in position — the user sees a perfect loop.
 *   - Transform-based animation (single rAF). No setInterval/setState
 *     per frame — that would re-layout the whole row.
 *   - Pauses on hover so the user can actually read an item.
 *   - Respects `prefers-reduced-motion` by showing a static snapshot
 *     of the most-recent events.
 *   - Honest about being in demo mode — a discrete badge at the right
 *     edge says "demo" until the protocol is live.
 *
 * Why this matters product-wide: most apps have one or two "alive"
 * spots and the rest is forms in a hallway. The ticker means *every*
 * page has live data passing across it. Bloomberg understood this
 * fifty years ago.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Flame, Shield, Vote, TrendingUp, Pause } from 'lucide-react';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { Numeric } from '@/components/ui/Numeric';
import { useProtocolPulse, type PulseEvent } from '@/hooks/useProtocolPulse';

const ICON_FOR_KIND = {
  payment:    ArrowRight,
  burn:       Flame,
  guardian:   Shield,
  governance: Vote,
  score:      TrendingUp,
} as const;

export function ProtocolTicker() {
  const reduce = usePrefersReducedMotion();
  const { events, mode } = useProtocolPulse();
  const [paused, setPaused] = useState(false);

  // The two scrolling rows. We render the events twice end-to-end so
  // the transform can loop without a visible jump.
  const trackRef = useRef<HTMLDivElement | null>(null);
  const offsetRef = useRef(0);
  const lastFrameRef = useRef<number | null>(null);

  // Visible items: keep this stable for the duration of a scroll cycle
  // so events arriving mid-scroll don't reorder the visible row. We
  // re-snapshot whenever the underlying events change AND the track
  // has scrolled past its midpoint (so the second copy of the old
  // snapshot is visible while we swap the first).
  //
  // Simpler implementation: hold a stable snapshot, update it on a
  // slow interval (every 8 seconds). The most-recent events come in
  // through the snapshot refresh, smoothly enough that nobody notices.
  const [visible, setVisible] = useState<PulseEvent[]>([]);
  useEffect(() => {
    if (visible.length === 0 && events.length > 0) {
      setVisible(events.slice(0, 14));
    }
  }, [events, visible.length]);
  useEffect(() => {
    const id = setInterval(() => {
      setVisible(events.slice(0, 14));
    }, 8000);
    return () => clearInterval(id);
  }, [events]);

  // Pause state held in a ref so toggling it doesn't restart the rAF
  // loop. The loop reads pausedRef.current each tick.
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Scroll loop. We move the inner track left at a calm 35 px/sec.
  // When the offset crosses -halfWidth (one full copy of items), we
  // snap it back to 0; because the second copy occupies the same
  // visual position, the user sees no jump.
  useEffect(() => {
    if (reduce) return;
    const track = trackRef.current;
    if (!track) return;

    let raf = 0;
    let cancelled = false;
    const SPEED = 35; // px / sec

    const tick = (now: number) => {
      if (cancelled) return;
      const last = lastFrameRef.current;
      lastFrameRef.current = now;
      if (last !== null && !pausedRef.current) {
        const dt = (now - last) / 1000;
        offsetRef.current -= SPEED * dt;
        const halfWidth = track.scrollWidth / 2;
        // Halt the loop until we know the width (first paint).
        if (halfWidth > 0 && offsetRef.current <= -halfWidth) {
          offsetRef.current += halfWidth;
        }
        track.style.transform = `translateX(${offsetRef.current}px)`;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  // Build duplicated event array so the track is two full copies.
  const duplicated = useMemo(() => [...visible, ...visible], [visible]);

  if (visible.length === 0) {
    // First-paint hold: render a thin placeholder strip so the page
    // doesn't reflow when events arrive.
    return (
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 md:top-14 z-40 h-7 border-b border-white/5"
        style={{
          background: 'linear-gradient(to bottom, rgba(6,6,10,0.92), rgba(8,8,14,0.85))',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      role="region"
      aria-label="Live protocol activity"
      className="fixed left-0 right-0 top-0 md:top-14 z-40 h-7 select-none overflow-hidden border-b border-white/5"
      style={{
        background: 'linear-gradient(to bottom, rgba(6,6,10,0.92), rgba(8,8,14,0.85))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Left fade */}
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 h-full w-12 bg-gradient-to-r from-zinc-950 to-transparent"
        aria-hidden="true"
      />

      {/* Right side: live indicator + demo badge */}
      <div className="pointer-events-none absolute right-0 top-0 z-10 flex h-full items-center gap-2 bg-gradient-to-l from-zinc-950 via-zinc-950 to-transparent pl-12 pr-4 text-[10px] uppercase tracking-widest text-gray-500">
        {paused && (
          <span className="flex items-center gap-1 text-gray-400">
            <Pause size={9} /> paused
          </span>
        )}
        <span className="hidden items-center gap-1.5 sm:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          {mode === 'demo' ? 'live demo' : 'live'}
        </span>
      </div>

      {/* The scrolling track */}
      <div
        ref={trackRef}
        className="absolute left-0 top-0 flex h-full items-center gap-6 whitespace-nowrap pl-4 pr-32 text-[11px] will-change-transform"
        style={{ transform: 'translateX(0)' }}
      >
        {duplicated.map((event, idx) => (
          <TickerItem
            key={`${event.id}-${idx >= visible.length ? 'b' : 'a'}`}
            event={event}
          />
        ))}
      </div>
    </div>
  );
}

function TickerItem({ event }: { event: PulseEvent }) {
  const Icon = ICON_FOR_KIND[event.kind];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-gray-400"
      // Tint the icon with the event's tier color so the row reads
      // as a colored stream rather than a homogenous gray.
      style={{}}
    >
      <Icon size={11} style={{ color: event.tierHex }} />
      <span className="text-gray-500">{event.label}</span>
      {event.kind === 'payment' && event.amount !== undefined && (
        <Numeric value={event.amount} format="currency" size="xs" weight={500} className="text-white" />
      )}
      {event.kind === 'burn' && event.amount !== undefined && (
        <Numeric
          value={event.amount}
          format="token"
          unit={event.unit ?? 'VFIDE'}
          size="xs"
          weight={500}
          precision={4}
          className="text-orange-300"
        />
      )}
      {event.kind === 'score' && event.score !== undefined && (
        <Numeric value={event.score} format="score" size="xs" weight={500} className="text-white" />
      )}
      {event.detail && (
        <span className="font-numeric text-gray-600">{event.detail}</span>
      )}
    </span>
  );
}

export default ProtocolTicker;
