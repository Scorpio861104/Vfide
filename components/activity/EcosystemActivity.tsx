'use client';

/**
 * EcosystemActivity (Wave 47) — the live, unified activity timeline.
 *
 * Renders what the user has done across every system this session, built automatically from emitted
 * ecosystem events (via EventProvider). One chronological record instead of per-system logs — a
 * grandmother-readable "here's what just happened" feed.
 *
 * SCOPE: this is the in-session view. Durable, cross-device history requires the server-emit rollout
 * (persisting events server-side); until then this shows activity since the page loaded, and is
 * empty on a fresh load by design rather than showing fabricated history.
 */

import { useActivityTimeline } from '@/lib/events/EventProvider';
import { Activity, Clock } from 'lucide-react';

function timeAgo(at: number): string {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function EcosystemActivity({ title = 'Recent activity', emptyHint }: { title?: string; emptyHint?: string }) {
  const timeline = useActivityTimeline();

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6" aria-label="Recent activity">
      <div className="mb-4 flex items-center gap-2.5">
        <Activity size={16} className="text-cyan-300/80" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-400">{title}</h2>
      </div>

      {timeline.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">
          {emptyHint ?? 'Your actions will appear here as you use VFIDE.'}
        </p>
      ) : (
        <ol className="space-y-1">
          {timeline.map((e) => (
            <li key={e.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-white/[0.02]">
              <span className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" aria-hidden="true" />
                <span className="text-sm text-zinc-200">{e.text}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-500">
                <Clock size={11} aria-hidden="true" />
                {timeAgo(e.at)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
