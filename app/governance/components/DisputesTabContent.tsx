'use client';

/**
 * DisputesTabContent — the Disputes page content extracted as a
 * reusable component for embedding inside the Governance hub.
 */

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowRight, ShieldAlert, RotateCcw, MessagesSquare, AlertCircle } from 'lucide-react';
import { LazyPeerMediation as PeerMediation } from '@/lib/lazy';

interface ReturnPreview {
  id: string;
  customer_address?: string;
  reason?: string | null;
  refund_amount?: string | null;
  status?: string;
  type?: string;
}

export function DisputesTabContent() {
  const { address } = useAccount();
  const [merchantCases, setMerchantCases] = useState<ReturnPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadReturns() {
      if (!address) { setMerchantCases([]); setLoading(false); return; }
      try {
        setLoading(true);
        setPreviewError(null);
        const response = await fetch(`/api/merchant/returns?merchant=${address}`, { credentials: 'include' });
        const data = await response.json().catch(() => ({ returns: [] }));
        if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Unable to sync disputes');
        if (!cancelled) setMerchantCases(Array.isArray(data?.returns) ? data.returns : []);
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Unable to sync disputes');
          setMerchantCases([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadReturns();
    return () => { cancelled = true; };
  }, [address]);

  const awaitingReview = useMemo(
    () => merchantCases.filter((e) => ['requested', 'pending'].includes(String(e.status ?? '').toLowerCase())).length,
    [merchantCases]
  );

  const resolvedCases = useMemo(
    () => merchantCases.filter((e) => ['approved', 'completed', 'resolved'].includes(String(e.status ?? '').toLowerCase())).length,
    [merchantCases]
  );

  const mediationPreview = useMemo(() => {
    if (!address || merchantCases.length === 0) return undefined;
    const primaryCase = merchantCases[0];
    const s = String(primaryCase?.status ?? '').toLowerCase();
    const status = s === 'resolved' || s === 'completed' ? 'resolved'
      : s === 'escalated' || s === 'disputed' ? 'escalated'
      : s === 'pending' || s === 'requested' ? 'open'
      : 'mediating';
    return {
      id: primaryCase?.id ?? '',
      buyerAddress: primaryCase?.customer_address || '',
      merchantAddress: address,
      amount: primaryCase?.refund_amount || '0',
      reason: primaryCase?.reason || primaryCase?.type || 'Return correction pending review',
      status,
      mediatorName: awaitingReview > 0 ? 'Market elder queue' : undefined,
    } as const;
  }, [address, awaitingReview, merchantCases]);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="analytics-card p-4 border border-amber-500/20 bg-amber-500/5">
          <div className="text-xs uppercase tracking-[0.2em] text-amber-200 mb-2">Merchant Cases</div>
          <div className="text-3xl font-bold text-white">{loading ? '…' : merchantCases.length}</div>
          <div className="text-sm text-gray-300 mt-1">{loading ? 'Loading…' : `${merchantCases.length} total cases`}</div>
        </div>
        <div className="analytics-card p-4 border border-accent/20 bg-cyan-500/5">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-200 mb-2">Awaiting Review</div>
          <div className="text-3xl font-bold text-white">{loading ? '…' : awaitingReview}</div>
          <div className="text-sm text-gray-300 mt-1">Can still be resolved directly</div>
        </div>
        <div className="analytics-card p-4 border border-emerald-500/20 bg-emerald-500/5">
          <div className="text-xs uppercase tracking-[0.2em] text-emerald-200 mb-2">Resolved</div>
          <div className="text-3xl font-bold text-white">{loading ? '…' : resolvedCases}</div>
          <div className="text-sm text-gray-300 mt-1">Returns or exchanges settled</div>
        </div>
      </div>

      {/* Quick-action cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card-premium p-5">
          <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-amber-300"><ShieldAlert size={18} /></div>
          <h3 className="text-xl font-semibold text-white">Appeals Center</h3>
          <p className="mt-2 text-sm text-white/50">Open the appeals workflow for escalation, review, and resolution tracking.</p>
          <Link href="/appeals"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white">
            Open Appeals Center <ArrowRight size={14} />
          </Link>
        </div>
        <div className="glass-card-premium p-5">
          <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-cyan-300"><RotateCcw size={18} /></div>
          <h3 className="text-xl font-semibold text-white">Merchant Returns</h3>
          <p className="mt-2 text-sm text-white/50">Handle returns and exchanges before escalating to formal appeals.</p>
          <Link href="/merchant/returns"
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
            Merchant Returns <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Workflow info + recent cases */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card-premium p-5 text-sm text-white/60">
          <div className="mb-2 flex items-center gap-2 text-purple-300">
            <MessagesSquare size={16} /> Mediation-first workflow
          </div>
          Start with merchant correction or peer review, then escalate into the formal appeal path only when needed.
          {previewError && (
            <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-200">
              <AlertCircle size={14} /> {previewError}
            </div>
          )}
        </div>
        <div className="glass-card-premium p-5">
          <div className="text-sm font-semibold text-white mb-3">Recent case types</div>
          {merchantCases.length > 0 ? (
            <div className="space-y-2">
              {merchantCases.slice(0, 3).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                  <span className="text-white/80">{entry.type ?? 'return'}</span>
                  <span className="text-cyan-300">{entry.status ?? 'requested'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/40">
              Connect as a merchant to sync live return and dispute activity.
            </div>
          )}
        </div>
      </div>

      <PeerMediation dispute={mediationPreview} userRole="merchant" />
    </div>
  );
}
