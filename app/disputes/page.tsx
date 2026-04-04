'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowRight, Scale, ShieldAlert, RotateCcw, MessagesSquare, AlertCircle } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import PeerMediation from '@/components/merchant/disputes/PeerMediation';

interface ReturnPreview {
  id: string;
  status?: string;
  type?: string;
}

export default function DisputesPage() {
  const { address } = useAccount();
  const [merchantCases, setMerchantCases] = useState<ReturnPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadReturns() {
      if (!address) {
        setMerchantCases([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPreviewError(null);
        const response = await fetch(`/api/merchant/returns?merchant=${address}`, { credentials: 'include' });
        const data = await response.json().catch(() => ({ returns: [] }));

        if (!response.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Unable to sync disputes preview');
        }

        if (!cancelled) {
          setMerchantCases(Array.isArray(data?.returns) ? data.returns : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Unable to sync disputes preview');
          setMerchantCases([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadReturns();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const awaitingReview = useMemo(
    () => merchantCases.filter((entry) => ['requested', 'pending'].includes(String(entry.status ?? '').toLowerCase())).length,
    [merchantCases]
  );

  const resolvedCases = useMemo(
    () => merchantCases.filter((entry) => ['approved', 'completed', 'resolved'].includes(String(entry.status ?? '').toLowerCase())).length,
    [merchantCases]
  );

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-300">
              <Scale size={14} /> Uploaded disputes handoff
            </div>
            <h1 className="text-4xl font-bold">Disputes & mediation</h1>
            <p className="mt-3 max-w-3xl text-gray-400">This handoff page now routes to the repo’s existing appeals and merchant-resolution flows so dispute handling stays centralized.</p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-200">Merchant cases</div>
                <div className="mt-2 text-3xl font-bold text-white">{loading ? '…' : merchantCases.length}</div>
                <div className="mt-1 text-sm text-gray-300">{loading ? 'Loading preview…' : `${merchantCases.length} merchant cases`}</div>
              </div>
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">Awaiting review</div>
                <div className="mt-2 text-3xl font-bold text-white">{loading ? '…' : awaitingReview}</div>
                <div className="mt-1 text-sm text-gray-300">Cases that can still be resolved directly</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">Resolved</div>
                <div className="mt-2 text-3xl font-bold text-white">{loading ? '…' : resolvedCases}</div>
                <div className="mt-1 text-sm text-gray-300">Returns or exchanges already settled</div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-amber-300"><ShieldAlert size={18} /></div>
                <h2 className="text-xl font-semibold">Appeals Center</h2>
                <p className="mt-2 text-sm text-gray-400">Open the existing appeals workflow for escalation, review, and resolution tracking.</p>
                <Link href="/appeals" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-semibold text-white">
                  Open Appeals Center <ArrowRight size={14} />
                </Link>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-cyan-300"><RotateCcw size={18} /></div>
                <h2 className="text-xl font-semibold">Merchant returns</h2>
                <p className="mt-2 text-sm text-gray-400">Use the new returns-and-exchanges workflow for order corrections before escalating to formal appeals.</p>
                <Link href="/merchant/returns" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
                  Merchant Returns <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
                <div className="mb-2 flex items-center gap-2 text-purple-300"><MessagesSquare size={16} /> Mediation-first workflow</div>
                Start with merchant correction or peer review, then escalate into the formal appeal path only when needed.
                {previewError ? (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-200"><AlertCircle size={14} /> {previewError}</div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="text-sm font-semibold text-white">Recent case types</div>
                {merchantCases.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {merchantCases.slice(0, 3).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                        <span className="text-gray-200">{entry.type ?? 'return'}</span>
                        <span className="text-cyan-200">{entry.status ?? 'requested'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-gray-400">
                    Connect and authenticate as the merchant owner to sync live return and mediation activity.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <PeerMediation />
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
