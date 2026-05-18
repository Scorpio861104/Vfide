'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  ArrowLeft,
  Repeat,
  Plus,
  X,
  Pause,
  Play,
  Archive,
  Users,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

type PlanStatus = 'active' | 'paused' | 'archived';
type Interval = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface SubscriptionPlan {
  id: number;
  name: string;
  description?: string | null;
  token: string;
  amount: number;
  interval: Interval;
  trial_days?: number | null;
  max_subscribers?: number | null;
  active_subscribers?: number;
  status: PlanStatus;
  created_at: string;
}

const STATUS_BADGE: Record<PlanStatus, string> = {
  active:   'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  paused:   'bg-amber-500/10 border-amber-500/30 text-amber-300',
  archived: 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500',
};

const INTERVAL_LABEL: Record<Interval, string> = {
  weekly: '/week',
  monthly: '/mo',
  quarterly: '/quarter',
  yearly: '/yr',
};

const ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export default function MerchantSubscriptionsPage() {
  const { address } = useAccount();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch('/api/merchant/subscriptions');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load plans');
      setPlans(Array.isArray(data.plans) ? data.plans : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => {
    const active = plans.filter((p) => p.status === 'active');
    const totalSubs = plans.reduce((s, p) => s + (p.active_subscribers ?? 0), 0);
    const mrr = active.reduce((s, p) => {
      const subs = p.active_subscribers ?? 0;
      const amt = Number(p.amount);
      switch (p.interval) {
        case 'weekly':   return s + (amt * 4.33 * subs);
        case 'monthly':  return s + (amt * subs);
        case 'quarterly':return s + (amt * subs / 3);
        case 'yearly':   return s + (amt * subs / 12);
      }
    }, 0);
    return { plans: plans.length, active: active.length, totalSubs, mrr };
  }, [plans]);

  const updatePlan = useCallback(async (id: number, patch: Partial<SubscriptionPlan>) => {
    try {
      const response = await fetch('/api/merchant/subscriptions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update plan');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update plan');
    }
  }, [load]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-[4.5rem] text-white">
        <section className="py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                  <Repeat size={14} /> Recurring billing
                </div>
                <h1 className="text-4xl font-bold">Subscription plans</h1>
                <p className="mt-3 max-w-3xl text-gray-400">
                  Charge customers on a schedule. Memberships, classes, monthly support plans — whatever your model is.
                </p>
              </div>
              <button onClick={() => setShowCreate(true)} disabled={!address} className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90">
                <Plus size={18} /> New plan
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            {!address && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to manage subscription plans.
              </div>
            )}

            {address && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <StatCard label="Plans" value={String(stats.plans)} />
                  <StatCard label="Active plans" value={String(stats.active)} />
                  <StatCard label="Active subscribers" value={String(stats.totalSubs)} />
                  <StatCard label="MRR (est.)" value={`${stats.mrr.toFixed(2)} VFIDE`} />
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  {loading ? (
                    <div className="p-12 text-center text-zinc-400">Loading plans…</div>
                  ) : plans.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400">
                      No subscription plans yet. Click New plan to add your first.
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {plans.map((p) => (
                        <PlanRow
                          key={p.id}
                          plan={p}
                          onPause={() => updatePlan(p.id, { status: 'paused' })}
                          onResume={() => updatePlan(p.id, { status: 'active' })}
                          onArchive={() => updatePlan(p.id, { status: 'archived' })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {showCreate && address && (
        <CreatePlanModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
          onError={setError}
        />
      )}

      <Footer />
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function PlanRow({ plan, onPause, onResume, onArchive }: { plan: SubscriptionPlan; onPause: () => void; onResume: () => void; onArchive: () => void }) {
  return (
    <div className="p-4 hover:bg-white/5 transition-colors flex items-start justify-between gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium">{plan.name}</span>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded border ${STATUS_BADGE[plan.status]}`}>
            {plan.status}
          </span>
        </div>
        <div className="text-sm text-zinc-300">
          <span className="font-semibold">{Number(plan.amount).toFixed(2)} VFIDE</span>
          <span className="text-zinc-500">{INTERVAL_LABEL[plan.interval]}</span>
          {plan.trial_days ? <span className="text-zinc-500"> · {plan.trial_days}-day trial</span> : null}
        </div>
        {plan.description && <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{plan.description}</div>}
        <div className="text-xs text-zinc-500 mt-2 inline-flex items-center gap-1">
          <Users size={11} /> {plan.active_subscribers ?? 0} subscriber{(plan.active_subscribers ?? 0) === 1 ? '' : 's'}
          {plan.max_subscribers ? ` / ${plan.max_subscribers} max` : ''}
        </div>
      </div>
      <div className="flex gap-2">
        {plan.status === 'active' && (
          <button onClick={onPause} className="text-xs px-3 py-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-300 rounded hover:bg-amber-500/20 inline-flex items-center gap-1">
            <Pause size={12} /> Pause
          </button>
        )}
        {plan.status === 'paused' && (
          <button onClick={onResume} className="text-xs px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 rounded hover:bg-emerald-500/20 inline-flex items-center gap-1">
            <Play size={12} /> Resume
          </button>
        )}
        {plan.status !== 'archived' && (
          <button onClick={onArchive} className="text-xs px-3 py-1.5 border border-white/10 text-zinc-300 rounded hover:bg-white/5 inline-flex items-center gap-1">
            <Archive size={12} /> Archive
          </button>
        )}
      </div>
    </div>
  );
}

function CreatePlanModal({ onClose, onCreated, onError }: { onClose: () => void; onCreated: () => Promise<void>; onError: (m: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [interval, setInterval] = useState<Interval>('monthly');
  const [trialDays, setTrialDays] = useState(0);
  const [maxSubs, setMaxSubs] = useState<number | ''>('');
  const [token] = useState(process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS ?? '0x0000000000000000000000000000000000000000');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && amount > 0 && ADDRESS_REGEX.test(token) && !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/merchant/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          token: token.toLowerCase(),
          amount,
          interval,
          trial_days: trialDays || undefined,
          max_subscribers: maxSubs === '' ? undefined : Number(maxSubs),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create plan');
      await onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, name, description, amount, interval, trialDays, maxSubs, token, onCreated, onError]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-md w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">New subscription plan</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Name *</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="VIP Monthly" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none" />
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Description (optional)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none resize-none" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Amount (VFIDE) *</span>
              <input type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Interval</span>
              <select value={interval} onChange={(e) => setInterval(e.target.value as Interval)} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Trial (days)</span>
              <input type="number" min={0} max={90} step={1} value={trialDays} onChange={(e) => setTrialDays(Number(e.target.value))} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Max subscribers (optional)</span>
              <input type="number" min={1} step={1} value={maxSubs} onChange={(e) => setMaxSubs(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Unlimited" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <button onClick={submit} disabled={!canSubmit} className="w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Creating…' : 'Create plan'}
          </button>
        </div>
      </div>
    </div>
  );
}
