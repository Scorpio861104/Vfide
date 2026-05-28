'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  ArrowLeft,
  Percent,
  Plus,
  X,
  Star,
  Trash2,
  Power,
  PowerOff,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

// ── Types ───────────────────────────────────────────────────────────────────

type AppliesTo = 'physical' | 'digital' | 'service';

interface TaxRate {
  id: number;
  name: string;
  rate_bps: number;
  jurisdiction_country?: string | null;
  jurisdiction_state?: string | null;
  jurisdiction_city?: string | null;
  postal_code_pattern?: string | null;
  is_default: boolean;
  enabled: boolean;
  applies_to: AppliesTo[];
  created_at: string;
}

function formatRate(bps: number): string {
  return (bps / 100).toFixed(2) + '%';
}

function formatJurisdiction(t: TaxRate): string {
  const parts = [t.jurisdiction_city, t.jurisdiction_state, t.jurisdiction_country].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'All locations';
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function MerchantTaxPage() {
  const { address } = useAccount();
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch('/api/merchant/tax-rates');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load tax rates');
      setRates(Array.isArray(data.tax_rates) ? data.tax_rates : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tax rates');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { void load(); }, [load]);

  const updateRate = useCallback(async (id: number, patch: Partial<TaxRate>) => {
    try {
      const response = await fetch('/api/merchant/tax-rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update tax rate');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update tax rate');
    }
  }, [load]);

  const deleteRate = useCallback(async (id: number) => {
    setPendingDelete(id);
  }, []);

  const confirmDeleteRate = useCallback(async () => {
    const id = pendingDelete;
    if (id == null) return;
    setPendingDelete(null);
    try {
      const response = await fetch(`/api/merchant/tax-rates?id=${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to delete tax rate');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete tax rate');
    }
  }, [pendingDelete, load]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <section className="py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="badge-live mb-3">
                  <Percent size={14} /> Sales tax
                </div>
                <h1 className="text-4xl font-black tracking-tight">Configure sales tax</h1>
                <p className="mt-3 max-w-3xl text-gray-400">
                  Set per-jurisdiction tax rates. At checkout the right one is picked by the buyer&apos;s shipping address.
                  Tax is in basis points (1% = 100 bps) so 7.25% sales tax is <code className="bg-zinc-900 px-1 rounded">725</code>.
                </p>
              </div>
              <button onClick={() => setShowCreate(true)} disabled={!address} className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90">
                <Plus size={18} /> New tax rate
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            {!address ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to configure tax rates.
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                {loading ? (
                  <div className="p-12 text-center text-zinc-400">Loading…</div>
                ) : rates.length === 0 ? (
                  <div className="p-12 text-center text-zinc-400">
                    No tax rates configured. Click <span className="text-cyan-300">New tax rate</span> to add your first.
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {rates.map((r) => (
                      <TaxRateRow
                        key={r.id}
                        rate={r}
                        onMakeDefault={() => updateRate(r.id, { is_default: true })}
                        onToggleEnabled={() => updateRate(r.id, { enabled: !r.enabled })}
                        onDelete={() => deleteRate(r.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {address && rates.length > 0 && (
              <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 text-sm text-blue-100">
                <strong className="text-blue-300">How rates apply:</strong> at checkout the system picks the most specific
                enabled rate that matches the buyer&apos;s shipping address. If nothing matches, the rate marked default is used.
                If no default is set and nothing matches, no tax is added.
              </div>
            )}
          </div>
        </section>
      </div>

      {showCreate && address && (
        <CreateTaxRateModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
          onError={setError}
        />
      )}

      <ConfirmModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDeleteRate}
        title="Delete tax rate?"
        message="Past invoices that used this rate are unaffected. New checkouts will fall back to the default rate."
        confirmText="Delete"
        cancelText="Keep"
        variant="danger"
      />

      <Footer />
    </>
  );
}

function TaxRateRow({ rate, onMakeDefault, onToggleEnabled, onDelete }: {
  rate: TaxRate;
  onMakeDefault: () => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="p-4 hover:bg-white/5 transition-colors flex items-start justify-between gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium">{rate.name}</span>
          <span className="font-mono text-cyan-300">{formatRate(rate.rate_bps)}</span>
          {rate.is_default && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border border-purple-500/30 bg-purple-500/10 text-purple-300">
              <Star size={11} fill="currentColor" /> Default
            </span>
          )}
          {!rate.enabled && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded border border-zinc-700 bg-zinc-800/40 text-zinc-500">
              Disabled
            </span>
          )}
        </div>
        <div className="text-sm text-zinc-400">{formatJurisdiction(rate)}</div>
        {rate.postal_code_pattern && (
          <div className="text-xs text-zinc-500 mt-1">
            Postal pattern: <code className="font-mono bg-zinc-900 px-1 rounded">{rate.postal_code_pattern}</code>
          </div>
        )}
        <div className="text-xs text-zinc-500 mt-1">
          Applies to: {rate.applies_to.length === 3 ? 'all product types' : rate.applies_to.join(', ')}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {!rate.is_default && (
          <button onClick={onMakeDefault} className="text-xs px-3 py-1.5 border border-purple-500/30 bg-purple-500/10 text-purple-300 rounded hover:bg-purple-500/20 inline-flex items-center gap-1">
            <Star size={12} /> Make default
          </button>
        )}
        <button onClick={onToggleEnabled} className={`text-xs px-3 py-1.5 border rounded inline-flex items-center gap-1 ${rate.enabled ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'}`}>
          {rate.enabled ? <><PowerOff size={12} /> Disable</> : <><Power size={12} /> Enable</>}
        </button>
        <button onClick={onDelete} className="text-xs px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-300 rounded hover:bg-red-500/20 inline-flex items-center gap-1">
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
}

function CreateTaxRateModal({ onClose, onCreated, onError }: { onClose: () => void; onCreated: () => Promise<void>; onError: (m: string) => void }) {
  const [name, setName] = useState('');
  const [ratePercent, setRatePercent] = useState(7.25);
  const [country, setCountry] = useState('');
  const [stateRegion, setStateRegion] = useState('');
  const [city, setCity] = useState('');
  const [postalPattern, setPostalPattern] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [applies, setApplies] = useState<Record<AppliesTo, boolean>>({
    physical: true, digital: true, service: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && ratePercent >= 0 && ratePercent <= 100 && !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Convert percent to basis points, round to int
      const rate_bps = Math.round(ratePercent * 100);
      const applies_to = (Object.keys(applies) as AppliesTo[]).filter((k) => applies[k]);
      const response = await fetch('/api/merchant/tax-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          rate_bps,
          jurisdiction_country: country.trim() ? country.trim().toUpperCase() : undefined,
          jurisdiction_state: stateRegion.trim() || undefined,
          jurisdiction_city: city.trim() || undefined,
          postal_code_pattern: postalPattern.trim() || undefined,
          is_default: isDefault,
          applies_to: applies_to.length > 0 ? applies_to : undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create tax rate');
      await onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create tax rate');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, name, ratePercent, country, stateRegion, city, postalPattern, isDefault, applies, onCreated, onError]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
      tabIndex={-1}
    >
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-lg w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">New tax rate</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white" aria-label="Close"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Name *</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="California Sales Tax" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none" />
          </label>

          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Rate (%)</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={ratePercent}
              onChange={(e) => setRatePercent(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-accent outline-none"
            />
            <span className="text-xs text-zinc-500 mt-1 block">
              Stored internally as {Math.round(ratePercent * 100)} basis points.
            </span>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Country</span>
              <input type="text" maxLength={2} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="US" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm uppercase" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">State</span>
              <input type="text" value={stateRegion} onChange={(e) => setStateRegion(e.target.value)} placeholder="CA" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">City</span>
              <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Los Angeles" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Postal code pattern (regex, optional)</span>
            <input type="text" value={postalPattern} onChange={(e) => setPostalPattern(e.target.value)} placeholder="^9[0-1]\\d{3}" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono focus:border-accent outline-none" />
            <span className="text-xs text-zinc-500 mt-1 block">e.g. <code className="bg-zinc-900 px-1 rounded">^90\d{3}</code> for 90xxx ZIPs.</span>
          </label>

          <div>
            <span className="text-xs text-zinc-400 mb-2 block">Applies to</span>
            <div className="flex gap-3 flex-wrap">
              {(['physical', 'digital', 'service'] as AppliesTo[]).map((k) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={applies[k]}
                    onChange={(e) => setApplies((a) => ({ ...a, [k]: e.target.checked }))}
                    className="accent-cyan-500"
                  />
                  <span className="capitalize">{k}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="accent-cyan-500 mt-1" />
            <div>
              <div className="font-medium text-sm">Make this the default rate</div>
              <div className="text-xs text-zinc-500">
                Used when no specific jurisdiction matches. Only one rate can be the default.
              </div>
            </div>
          </label>

          <button onClick={submit} disabled={!canSubmit} className="w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Creating…' : 'Create tax rate'}
          </button>
        </div>
      </div>
    </div>
  );
}
