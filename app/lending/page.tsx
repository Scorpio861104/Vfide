'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowRight, Banknote, ShieldCheck, Zap, HandCoins, Activity, AlertCircle } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface LanePreview {
  id: string;
  state?: {
    stage?: string;
  };
  terms?: {
    principal?: number;
  };
}

const lendingModes = [
  {
    title: 'Trust-based flashloans',
    description: 'Use the existing Flashloans workspace and server-backed lane flow for borrower, lender, and arbiter coordination.',
    href: '/flashloans',
    cta: 'Open Flashloans Workspace',
    icon: HandCoins,
  },
  {
    title: 'Flash liquidity tools',
    description: 'Use the current flash-loan workspace for instant-liquidity concepts, history, and workflow tabs.',
    href: '/flashloans',
    cta: 'View Flash Loans',
    icon: Zap,
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export default function LendingPage() {
  const { address } = useAccount();
  const [lanes, setLanes] = useState<LanePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLanes() {
      if (!address) {
        setLanes([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setPreviewError(null);
        const response = await fetch('/api/flashloans/lanes?limit=6', { credentials: 'include' });
        const data = await response.json().catch(() => ({ lanes: [] }));

        if (!response.ok) {
          throw new Error(typeof data?.error === 'string' ? data.error : 'Lane preview offline');
        }

        if (!cancelled) {
          setLanes(Array.isArray(data?.lanes) ? data.lanes : []);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewError(error instanceof Error ? error.message : 'Lane preview offline');
          setLanes([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadLanes();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const activeLaneCount = useMemo(
    () => lanes.filter((lane) => ['active', 'funded', 'drawn'].includes(String(lane.state?.stage ?? '').toLowerCase())).length,
    [lanes]
  );

  const trackedPrincipal = useMemo(
    () => lanes.reduce((sum, lane) => sum + Number(lane.terms?.principal ?? 0), 0),
    [lanes]
  );

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 text-white">
        <section className="py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
              <Banknote size={14} /> Live lending workspace
            </div>
            <h1 className="text-4xl font-bold">P2P Lending</h1>
            <p className="mt-3 max-w-3xl text-gray-400">
              Borrowers, lenders, and liquidity coordinators can monitor lane health here and jump straight into the active flashloans workspace when it is time to act.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-200">Live lanes</div>
                <div className="mt-2 text-3xl font-bold text-white">{loading ? '…' : lanes.length}</div>
                <div className="mt-1 text-sm text-gray-300">{loading ? 'Loading preview…' : `${lanes.length} live lanes`}</div>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">Active now</div>
                <div className="mt-2 text-3xl font-bold text-white">{loading ? '…' : activeLaneCount}</div>
                <div className="mt-1 text-sm text-gray-300">Borrower and lender stages already synced</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-gray-300">Tracked principal</div>
                <div className="mt-2 text-3xl font-bold text-white">{loading ? '…' : formatCurrency(trackedPrincipal)}</div>
                <div className="mt-1 text-sm text-gray-300">Recent lane volume routed into live tools</div>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {lendingModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <div key={mode.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-3 inline-flex rounded-xl bg-white/5 p-2 text-cyan-300"><Icon size={18} /></div>
                    <h2 className="text-xl font-semibold text-white">{mode.title}</h2>
                    <p className="mt-2 text-sm text-gray-400">{mode.description}</p>
                    <Link href={mode.href} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-sm font-semibold text-white">
                      {mode.cta} <ArrowRight size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 flex items-center gap-2 text-cyan-300"><Activity size={16} /> Lane preview</div>
                {lanes.length > 0 ? (
                  <div className="space-y-3">
                    {lanes.slice(0, 3).map((lane) => (
                      <div key={lane.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm">
                        <div>
                          <div className="font-semibold text-white">{lane.id}</div>
                          <div className="text-gray-400">Stage: {lane.state?.stage ?? 'draft'}</div>
                        </div>
                        <div className="text-cyan-200">{formatCurrency(Number(lane.terms?.principal ?? 0))}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-gray-400">
                    {previewError ?? 'Connect and authenticate to sync live lending lanes here.'}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="mb-2 flex items-center gap-2 text-emerald-300"><ShieldCheck size={16} /> Safety model</div>
                <p className="text-sm text-gray-300">Borrower/lender protections, dispute states, and lane simulation already exist in the repo, so this page now surfaces a live operational snapshot for fast decision-making.</p>
                {previewError ? (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs text-amber-200"><AlertCircle size={14} /> {previewError}</div>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
