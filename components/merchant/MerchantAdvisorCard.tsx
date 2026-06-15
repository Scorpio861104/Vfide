'use client';

/**
 * MerchantAdvisorCard — surfaces the Seer's merchant guidance (Institution 3 — Commerce).
 * Every signal is grounded in a real observable fact; advisory only.
 */

import { useMerchantAdvisor } from '@/hooks/useMerchantAdvisor';
import type { AdvisorSeverity } from '@/lib/seer/merchantAdvisor';
import { TrendingUp, AlertTriangle, Info, CheckCircle2, Eye } from 'lucide-react';

const TONE: Record<AdvisorSeverity, { icon: typeof Info; cls: string }> = {
  good: { icon: CheckCircle2, cls: 'text-emerald-300' },
  info: { icon: Info, cls: 'text-cyan-300' },
  watch: { icon: Eye, cls: 'text-amber-300' },
  concern: { icon: AlertTriangle, cls: 'text-rose-300' },
};

export function MerchantAdvisorCard() {
  const { advisor, loading } = useMerchantAdvisor();

  if (loading) return <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-sm text-zinc-500">Reviewing your store…</div>;
  if (!advisor) return null;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <TrendingUp size={18} className="text-cyan-300/80" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-white">Your business advisor</h2>
        </div>
        {!advisor.insufficientData && (
          <span className="text-sm text-zinc-400">Health <span className="font-semibold text-white">{advisor.healthScore}</span>/100</span>
        )}
      </div>
      <ul className="mt-4 space-y-3">
        {advisor.signals.map((s) => {
          const t = TONE[s.severity];
          const Icon = t.icon;
          return (
            <li key={s.id} className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-3">
              <Icon size={16} className={`mt-0.5 shrink-0 ${t.cls}`} aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="mt-0.5 text-xs text-zinc-400">{s.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-[11px] text-zinc-600">These are suggestions based on your real sales, customers, and stock. The Seer advises — you decide. Nothing here changes your prices, stock, or money automatically.</p>
    </div>
  );
}
