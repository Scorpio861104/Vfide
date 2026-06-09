'use client';

/**
 * ContinuityTimeline - V26 Part 6. Operational, not marketing. The stages
 * mirror the actual architecture: Life (NORMAL) -> Recovery (wallet recovery
 * claim) -> Claim (inheritance CLAIM) -> Veto (VETO window) -> Distribution
 * (heirs claim shares) -> Memorial (MEMORIAL) -> Closure (CLOSED). The current
 * stage is highlighted from useContinuityStatus().currentStage.
 */

import type { TimelineStage } from '@/hooks/useContinuityStatus';

const STAGES: { id: TimelineStage; label: string; desc: string }[] = [
  { id: 'life', label: 'Life', desc: 'You hold and control the vault.' },
  { id: 'recovery', label: 'Recovery', desc: 'Guardians return access to a new wallet.' },
  { id: 'claim', label: 'Claim', desc: 'A guardian opens an inheritance claim.' },
  { id: 'veto', label: 'Veto', desc: 'You or peers can veto during the window.' },
  { id: 'distribution', label: 'Distribution', desc: 'Heirs claim their shares.' },
  { id: 'memorial', label: 'Memorial', desc: 'The record is preserved.' },
  { id: 'closure', label: 'Closure', desc: 'The vault is closed.' },
];

export function ContinuityTimeline({ current }: { current: TimelineStage }) {
  const currentIndex = STAGES.findIndex((s) => s.id === current);
  return (
    <section aria-label="Continuity timeline" className="glass-card-premium p-5 sm:p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-white">Continuity timeline</h2>
        <span className="text-xs text-zinc-500">Where this vault is now</span>
      </div>
      <p className="mb-5 text-sm text-zinc-400">The full path a vault can travel - most citizens stay at <span className="text-white">Life</span>.</p>

      <ol className="flex flex-col gap-0 sm:flex-row sm:items-stretch sm:gap-0">
        {STAGES.map((s, i) => {
          const isCurrent = i === currentIndex;
          const isPast = currentIndex >= 0 && i < currentIndex;
          const dot = isCurrent ? 'bg-cyan-400' : isPast ? 'bg-emerald-400' : 'bg-zinc-600';
          const text = isCurrent ? 'text-white' : 'text-zinc-400';
          return (
            <li key={s.id} className="relative flex flex-1 gap-3 pb-4 sm:flex-col sm:gap-0 sm:pb-0 sm:pr-0">
              {i < STAGES.length - 1 && (
                <span
                  className="absolute left-[5px] top-3 h-full w-px bg-white/10 sm:left-auto sm:top-[5px] sm:h-px sm:w-full"
                  aria-hidden="true"
                />
              )}
              <span className={`relative z-10 mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${dot} sm:mt-0`} aria-hidden="true" />
              <div className="sm:mt-2 sm:pr-4">
                <p className={`text-sm font-semibold ${text}`} aria-current={isCurrent ? 'step' : undefined}>
                  {s.label}
                  {isCurrent && <span className="ml-2 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-400">Now</span>}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">{s.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
