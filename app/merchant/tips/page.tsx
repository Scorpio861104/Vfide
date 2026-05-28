'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, DollarSign, Plus, X, Save } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface TipSettings {
  enabled: boolean;
  default_preset_percentages: number[];
  allow_custom_amount: boolean;
  prompt_text: string | null;
}

interface TipTotals {
  all_time: { total: string; count: number };
  last_7_days: { total: string; count: number };
}

export default function MerchantTipsPage() {
  const { address } = useAccount();
  const [settings, setSettings] = useState<TipSettings>({
    enabled: true,
    default_preset_percentages: [15, 18, 20, 25],
    allow_custom_amount: true,
    prompt_text: null,
  });
  const [totals, setTotals] = useState<TipTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch('/api/merchant/tips');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load tip settings');
      if (data.settings) {
        setSettings({
          enabled: Boolean(data.settings.enabled),
          default_preset_percentages: Array.isArray(data.settings.default_preset_percentages)
            ? data.settings.default_preset_percentages
            : [15, 18, 20, 25],
          allow_custom_amount: Boolean(data.settings.allow_custom_amount),
          prompt_text: data.settings.prompt_text ?? null,
        });
      }
      if (data.totals) setTotals(data.totals);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tip settings');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async () => {
    if (!address) return;
    setSaving(true);
    try {
      const response = await fetch('/api/merchant/tips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          default_preset_percentages: settings.default_preset_percentages,
          allow_custom_amount: settings.allow_custom_amount,
          prompt_text: settings.prompt_text || undefined,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to save tip settings');
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save tip settings');
    } finally {
      setSaving(false);
    }
  }, [address, settings]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] text-white relative">
        {/* Ambient orbs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 -right-24 w-[500px] h-[500px] rounded-full opacity-[0.05]"
            style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        </div>
        <div className="grid-pattern pointer-events-none absolute inset-0 opacity-20" />
        <section className="py-12">
          <div className="container mx-auto max-w-4xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-accent hover:text-accent">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8">
              <div className="badge-live mb-3">
                <DollarSign size={14} /> Tips
              </div>
              <h1 className="text-4xl font-black tracking-tight">Accept tips at checkout</h1>
              <p className="mt-3 max-w-3xl text-gray-400">
                Configure preset tip amounts your customers can tap at checkout. Tips go straight to your wallet — no separate withdrawal step.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            {!address ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to configure tips.
              </div>
            ) : (
              <>
                {/* Tip totals */}
                {totals && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">All-time tips</div>
                      <div className="text-2xl font-bold">{Number(totals.all_time.total).toFixed(2)} VFIDE</div>
                      <div className="text-xs text-zinc-500 mt-1">{totals.all_time.count} transaction{totals.all_time.count === 1 ? '' : 's'}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">Last 7 days</div>
                      <div className="text-2xl font-bold">{Number(totals.last_7_days.total).toFixed(2)} VFIDE</div>
                      <div className="text-xs text-zinc-500 mt-1">{totals.last_7_days.count} transaction{totals.last_7_days.count === 1 ? '' : 's'}</div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
                  {loading ? (
                    <div className="text-center text-zinc-400 py-8">Loading…</div>
                  ) : (
                    <>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.enabled}
                          onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
                          className="accent-accent mt-1"
                        />
                        <div>
                          <div className="font-medium">Show tip prompt at checkout</div>
                          <div className="text-xs text-zinc-500">When off, no tip option is shown to customers.</div>
                        </div>
                      </label>

                      <div>
                        <div className="text-sm font-medium mb-2">Preset percentages</div>
                        <div className="flex gap-2 flex-wrap">
                          {settings.default_preset_percentages.map((pct, idx) => (
                            <div key={idx} className="inline-flex items-center bg-zinc-900 border border-white/10 rounded-lg">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={pct}
                                onChange={(e) => setSettings((s) => ({
                                  ...s,
                                  default_preset_percentages: s.default_preset_percentages.map((p, i) => i === idx ? Number(e.target.value) : p),
                                }))}
                                className="w-14 bg-transparent px-3 py-2 text-sm outline-none text-right"
                              />
                              <span className="px-1 text-zinc-500 text-sm">%</span>
                              <button
                                onClick={() => setSettings((s) => ({
                                  ...s,
                                  default_preset_percentages: s.default_preset_percentages.length > 1
                                    ? s.default_preset_percentages.filter((_, i) => i !== idx)
                                    : s.default_preset_percentages,
                                }))}
                                disabled={settings.default_preset_percentages.length <= 1}
                                className="px-2 text-zinc-400 hover:text-red-400 disabled:opacity-30"
                                aria-label="Remove preset"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          {settings.default_preset_percentages.length < 8 && (
                            <button
                              onClick={() => setSettings((s) => ({
                                ...s,
                                default_preset_percentages: [...s.default_preset_percentages, 20],
                              }))}
                              className="px-3 py-2 border border-dashed border-white/20 rounded-lg text-sm text-zinc-400 hover:bg-white/5 inline-flex items-center gap-1"
                            >
                              <Plus size={12} /> Add preset
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500 mt-2">
                          Tap-to-tip buttons displayed at checkout, in this order.
                        </div>
                      </div>

                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.allow_custom_amount}
                          onChange={(e) => setSettings((s) => ({ ...s, allow_custom_amount: e.target.checked }))}
                          className="accent-accent mt-1"
                        />
                        <div>
                          <div className="font-medium">Allow custom tip amount</div>
                          <div className="text-xs text-zinc-500">Customers can enter their own amount instead of picking a preset.</div>
                        </div>
                      </label>

                      <label className="block">
                        <span className="text-sm font-medium mb-2 block">Prompt message (optional)</span>
                        <input
                          type="text"
                          value={settings.prompt_text ?? ''}
                          onChange={(e) => setSettings((s) => ({ ...s, prompt_text: e.target.value || null }))}
                          placeholder="Add a tip for your stylist?"
                          maxLength={200}
                          className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-accent outline-none"
                        />
                        <span className="text-xs text-zinc-500 mt-1 block">Shown above the preset buttons. Leave blank for default.</span>
                      </label>

                      <div className="flex items-center justify-between pt-4 border-t border-white/10">
                        {savedFlash ? (
                          <span className="text-sm text-emerald-300">✓ Saved</span>
                        ) : <span />}
                        <button
                          onClick={save}
                          disabled={saving}
                          className="px-5 py-2.5 bg-gradient-to-r from-accent to-blue-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                        >
                          <Save size={16} /> {saving ? 'Saving…' : 'Save settings'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
}
