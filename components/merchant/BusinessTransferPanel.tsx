'use client';

/**
 * BusinessTransferPanel (Wave 95) — the "owner returns" surface for business continuity.
 *
 * Surfaces business transfers (the flow that was API-only) so the owner can SEE and ACT on them:
 *  • a PENDING emergency transfer can be VETOED (by the owner or their proof-of-life wallet) during its
 *    veto window;
 *  • an EXECUTED emergency transfer can be RECLAIMED by the original owner during its reclaim window.
 * Plain language, honest framing, countdown of the window so the owner knows how long they have.
 */

import { useState } from 'react';
import { useBusinessTransfers, type BusinessTransfer } from '@/hooks/useBusinessTransfers';
import { ProtectiveConfirm } from '@/components/safety/ProtectiveConfirm';
import { AlertTriangle, Loader2, RotateCcw, ShieldX, Clock } from 'lucide-react';

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function windowLabel(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return null;
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

// Only show transfers that are still actionable or recently resolved — hide stale noise.
function isRelevant(t: BusinessTransfer): boolean {
  if (t.status === 'pending') return true;
  if (t.status === 'executed' && t.kind === 'emergency' && windowLabel(t.reclaim_until)) return true;
  return false;
}

export function BusinessTransferPanel() {
  const { transfers, loading, veto, reclaim } = useBusinessTransfers();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmVeto, setConfirmVeto] = useState<BusinessTransfer | null>(null);
  const [confirmReclaim, setConfirmReclaim] = useState<BusinessTransfer | null>(null);

  const run = async (key: string, fn: () => Promise<boolean>) => {
    setBusy(key);
    try { await fn(); } finally { setBusy(null); }
  };

  if (loading) {
    return (
      <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 md:p-7">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 size={15} className="animate-spin" aria-hidden="true" /> Checking for business transfers…
        </div>
      </section>
    );
  }

  const relevant = transfers.filter(isRelevant);
  if (relevant.length === 0) return null; // nothing to act on — don't clutter the page

  return (
    <section className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.03] p-6 md:p-7">
      <div className="flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-white">Business takeover in progress</h2>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        Someone has started a transfer of your business. If this wasn&rsquo;t you — or you&rsquo;re back and
        able to continue — you can stop it or take it back here.
      </p>

      <ul className="mt-5 space-y-3">
        {relevant.map((t) => {
          const vetoLeft = t.status === 'pending' && t.kind === 'emergency' ? windowLabel(t.veto_until) : null;
          const reclaimLeft = t.status === 'executed' && t.kind === 'emergency' ? windowLabel(t.reclaim_until) : null;
          return (
            <li key={t.id} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-zinc-300">
                  <span className="font-medium text-white">{t.kind === 'emergency' ? 'Emergency transfer' : 'Transfer'}</span>
                  {' '}to <span className="font-mono text-xs">{short(t.to_address)}</span>
                </div>
                {(vetoLeft || reclaimLeft) && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200">
                    <Clock size={12} aria-hidden="true" /> {vetoLeft ?? reclaimLeft}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {vetoLeft && (
                  <button type="button" onClick={() => setConfirmVeto(t)} disabled={busy === `veto-${t.id}`}
                    className="btn-premium btn-premium-ghost flex items-center gap-1.5 text-sm disabled:opacity-40">
                    <ShieldX size={15} aria-hidden="true" /> {busy === `veto-${t.id}` ? 'Stopping…' : 'Stop this transfer'}
                  </button>
                )}
                {reclaimLeft && (
                  <button type="button" onClick={() => setConfirmReclaim(t)} disabled={busy === `reclaim-${t.id}`}
                    className="btn-premium btn-premium-ghost flex items-center gap-1.5 text-sm disabled:opacity-40">
                    <RotateCcw size={15} aria-hidden="true" /> {busy === `reclaim-${t.id}` ? 'Reclaiming…' : 'Take my business back'}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <ProtectiveConfirm
        open={!!confirmVeto}
        risk="low"
        title="Stop this business transfer?"
        body="This cancels the pending emergency transfer. Your business stays yours. Do this if the transfer wasn't authorized, or you're able to keep running things yourself."
        reassurance="Stopping a transfer never costs you anything — it simply keeps your business where it is."
        confirmText="Yes, stop it"
        source="merchant-business-veto"
        onCancel={() => setConfirmVeto(null)}
        onConfirm={() => {
          const t = confirmVeto; setConfirmVeto(null);
          if (t) void run(`veto-${t.id}`, () => veto(t.id));
        }}
      />
      <ProtectiveConfirm
        open={!!confirmReclaim}
        risk="medium"
        title="Take your business back?"
        body="This reverses an emergency transfer that already went through, returning the business to you. Available only for a limited window after the transfer."
        reassurance="Your funds were never moved by the transfer — this restores who runs the business to you."
        confirmText="Take it back"
        source="merchant-business-reclaim"
        onCancel={() => setConfirmReclaim(null)}
        onConfirm={() => {
          const t = confirmReclaim; setConfirmReclaim(null);
          if (t) void run(`reclaim-${t.id}`, () => reclaim(t.id));
        }}
      />
    </section>
  );
}
