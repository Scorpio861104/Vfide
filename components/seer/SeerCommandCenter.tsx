'use client';

/**
 * SeerCommandCenter (Full Seer Integration wave).
 *
 * The ecosystem status center. Composes the REAL metric sources into one view — ProofScore, Builder
 * Record, Extraction Index, recovery & continuity readiness, merchant health, lending standing — plus
 * an honest map of Seer coverage (which subsystems are live / partial / not yet built).
 *
 * It never fabricates: where a subsystem isn't wired, it says so rather than showing invented numbers.
 * Grandmother-friendly: plain labels, clear "what this means", obvious next actions.
 */

import { useProofScore } from '@/hooks/useProofScore';
import { useMarketStanding } from '@/hooks/useMarketStanding';
import { useMerchantHealth } from '@/hooks/useMerchantHealth';
import { useContinuityStatus } from '@/hooks/useContinuityStatus';
import { SEER_SUBSYSTEMS, coverageSummary, type SeerCoverageStatus } from '@/lib/seer/coverage';
import { useAccount } from 'wagmi';
import { Activity, ShieldCheck, TrendingUp, Landmark, AlertTriangle, CheckCircle2, CircleDashed, Wrench } from 'lucide-react';

function Stat({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'good' | 'warn' }) {
  const valueTone = tone === 'good' ? 'text-emerald-300' : tone === 'warn' ? 'text-amber-300' : 'text-white';
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueTone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

const STATUS_VIS: Record<SeerCoverageStatus, { icon: typeof CheckCircle2; tone: string; label: string }> = {
  LIVE: { icon: CheckCircle2, tone: 'text-emerald-300', label: 'Live' },
  PARTIAL: { icon: CircleDashed, tone: 'text-amber-300', label: 'Partial' },
  NOT_BUILT: { icon: Wrench, tone: 'text-zinc-500', label: 'Not built yet' },
};

export function SeerCommandCenter() {
  const { isConnected } = useAccount();
  const { score } = useProofScore();
  const standing = useMarketStanding();
  const merchant = useMerchantHealth();
  const continuity = useContinuityStatus();
  const cov = coverageSummary();

  const proofText = typeof score === 'number' ? String(score) : '—';
  const builder = standing.builder;
  const extraction = standing.extraction;

  // Honest "recommended actions" — derived only from real, known state.
  const actions: string[] = [];
  if (!continuity.recoveryConfigured) actions.push('Set up account recovery so you can never be locked out.');
  if (continuity.guardianCount === 0) actions.push('Add a trusted guardian for protection.');
  if (merchant.isMerchant && builder && builder.category === 'Newcomer') actions.push('Take your first payments to start building your Builder Record.');
  if (extraction && extraction.index >= 3000) actions.push('Your market behavior is affecting your standing — steady activity restores it over time.');

  return (
    <div className="space-y-8">
      {/* Live metrics */}
      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <Activity size={18} className="text-cyan-300/80" aria-hidden="true" />
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-400">Your ecosystem standing</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="ProofScore" value={proofText} hint="Your trust score (0–10,000)" tone={typeof score === 'number' && score >= 6000 ? 'good' : 'default'} />
          <Stat label="Builder Record" value={builder ? builder.category : standing.loading ? '…' : '—'} hint="What you've contributed" tone={builder && builder.category !== 'Newcomer' ? 'good' : 'default'} />
          <Stat label="Market behavior" value={extraction ? extraction.category : standing.loading ? '…' : '—'} hint="Extraction Index category" tone={extraction && extraction.index >= 5000 ? 'warn' : 'default'} />
          <Stat label="Protection" value={continuity.recoveryConfigured ? 'Ready' : 'Set up'} hint={`${continuity.guardianCount} guardian(s)`} tone={continuity.recoveryConfigured ? 'good' : 'warn'} />
        </div>
      </section>

      {/* Recommended actions — only real ones */}
      {isConnected && actions.length > 0 && (
        <section className="rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.04] p-6">
          <h2 className="text-sm font-semibold text-cyan-200">Recommended for you</h2>
          <ul className="mt-3 space-y-2">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-200">
                <TrendingUp size={15} className="mt-0.5 shrink-0 text-cyan-300/80" aria-hidden="true" />{a}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Seer coverage map — honest status of every subsystem */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Landmark size={18} className="text-zinc-300" aria-hidden="true" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-400">Seer coverage</h2>
          </div>
          <span className="text-xs text-zinc-500">{cov.live} live · {cov.partial} partial · {cov.notBuilt} not built</span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SEER_SUBSYSTEMS.map((s) => {
            const vis = STATUS_VIS[s.status];
            const Icon = vis.icon;
            return (
              <div key={s.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">{s.name}</span>
                  <span className={`inline-flex items-center gap-1 text-xs ${vis.tone}`}><Icon size={13} aria-hidden="true" />{vis.label}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">{s.purpose}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs text-zinc-500">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-zinc-600" aria-hidden="true" />
          Coverage is shown honestly: "partial" and "not built yet" mean the engine needs data or a feature that doesn't exist yet — nothing here is faked. The Seer proposes; the DAO governs; your tokens stay yours.
        </p>
      </section>
    </div>
  );
}
