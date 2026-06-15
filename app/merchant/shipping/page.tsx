'use client';

/**
 * Merchant Shipping page (Commerce Operations Phase 1C — authoring UI)
 *
 * Define shipping zones (name + destination countries) and rate rules (flat / by-weight / by-price, with
 * optional free-over). Calls /api/merchant/shipping. This makes shipping cost server-authoritative and closes
 * the Phase 1C Grandmother gate — a physical-product merchant configures global shipping from a screen.
 *
 * Honest note shown to the merchant: this is in-house rate calculation, not a live carrier (USPS/UPS/FedEx)
 * label/rate integration (that boundary is documented in lib/commerce/carrierAdapter.ts).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, Plus, Trash2, Loader2, Globe, Truck } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface Zone { id: number; name: string; countries: string[]; sort_order: number; }
interface Rate {
  id: number; zone_id: number; name: string; rate_type: 'flat' | 'weight' | 'price';
  base_amount: number; per_kg: number | null; pct: number | null; free_over: number | null;
  min_weight_g: number | null; max_weight_g: number | null; active: boolean;
}

export default function MerchantShippingPage() {
  const { isConnected } = useAccount();
  const [zones, setZones] = useState<Zone[]>([]);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // new-zone draft
  const [zoneName, setZoneName] = useState('');
  const [zoneCountries, setZoneCountries] = useState('');
  // new-rate draft (per zone)
  const [rateZoneId, setRateZoneId] = useState<number | null>(null);
  const [rateName, setRateName] = useState('');
  const [rateType, setRateType] = useState<'flat' | 'weight' | 'price'>('flat');
  const [rateBase, setRateBase] = useState('');
  const [ratePerKg, setRatePerKg] = useState('');
  const [ratePct, setRatePct] = useState('');
  const [rateFreeOver, setRateFreeOver] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/merchant/shipping');
      if (!res.ok) throw new Error('Failed to load shipping config');
      const data = await res.json();
      setZones(Array.isArray(data.zones) ? data.zones : []);
      setRates(Array.isArray(data.rates) ? data.rates : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const send = async (body: Record<string, unknown>) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/merchant/shipping', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
      await load();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addZone = async () => {
    if (!zoneName.trim()) { setError('Zone name required'); return; }
    const countries = zoneCountries.split(',').map((c) => c.trim()).filter(Boolean);
    if (await send({ action: 'add_zone', name: zoneName.trim(), countries })) {
      setZoneName(''); setZoneCountries('');
    }
  };

  const addRate = async () => {
    if (rateZoneId == null) { setError('Pick a zone for the rate'); return; }
    if (!rateName.trim()) { setError('Rate name required'); return; }
    const body: Record<string, unknown> = {
      action: 'add_rate', zone_id: rateZoneId, name: rateName.trim(), rate_type: rateType,
      base_amount: Number(rateBase || 0),
    };
    if (rateType === 'weight' && ratePerKg.trim() !== '') body.per_kg = Number(ratePerKg);
    if (rateType === 'price' && ratePct.trim() !== '') body.pct = Number(ratePct);
    if (rateFreeOver.trim() !== '') body.free_over = Number(rateFreeOver);
    if (await send(body)) { setRateName(''); setRateBase(''); setRatePerKg(''); setRatePct(''); setRateFreeOver(''); }
  };

  const input = 'bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm';

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/merchant" className="text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Back</Link>
        <div className="flex items-center gap-2 mb-2"><Truck size={22} className="text-accent" /><h1 className="text-2xl font-bold">Shipping</h1></div>
        <p className="text-sm text-zinc-500 mb-6">
          Define where you ship and what it costs. VFIDE computes the shipping charge from these rules at
          checkout (server-authoritative). This is in-house rate calculation — not a live carrier label/rate
          integration.
        </p>

        {!isConnected && <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">Connect your wallet to manage shipping.</div>}
        {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-6">
            {/* Zones */}
            <section className="border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3"><Globe size={16} className="text-accent" /><h2 className="font-semibold">Zones</h2></div>
              {zones.length === 0 ? (
                <div className="text-sm text-zinc-500 mb-3">No zones yet. Add one (use <code>*</code> as the country list for a catch-all &ldquo;rest of world&rdquo; zone).</div>
              ) : (
                <div className="space-y-2 mb-3">
                  {zones.map((z) => (
                    <div key={z.id} className="flex items-center justify-between bg-white/3 border border-white/5 rounded-lg p-3">
                      <div>
                        <div className="font-medium text-sm">{z.name}</div>
                        <div className="text-xs text-zinc-500">{z.countries.join(', ') || '—'}</div>
                        <div className="text-xs text-zinc-600 mt-1">{rates.filter((r) => r.zone_id === z.id).length} rate(s)</div>
                      </div>
                      <button disabled={busy} onClick={() => send({ action: 'delete_zone', zone_id: z.id })} className="p-1.5 text-zinc-400 hover:text-red-400 disabled:opacity-50"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} className={input} placeholder="Zone name (e.g. Domestic)" />
                <input value={zoneCountries} onChange={(e) => setZoneCountries(e.target.value)} className={input} placeholder="Countries: US, CA  (or *)" />
              </div>
              <button disabled={busy} onClick={addZone} className="mt-2 px-4 py-2 bg-gradient-to-r from-accent to-blue-500 rounded-lg text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Plus size={14} /> Add zone</button>
            </section>

            {/* Rates */}
            <section className="border border-white/10 rounded-xl p-4">
              <h2 className="font-semibold mb-3">Rates</h2>
              {rates.length > 0 && (
                <div className="space-y-2 mb-3">
                  {rates.map((r) => {
                    const zone = zones.find((z) => z.id === r.zone_id);
                    return (
                      <div key={r.id} className="flex items-center justify-between bg-white/3 border border-white/5 rounded-lg p-3 text-sm">
                        <div>
                          <span className="font-medium">{r.name}</span>
                          <span className="text-xs text-zinc-500 ml-2">{zone?.name ?? `zone ${r.zone_id}`} · {r.rate_type}</span>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            base {r.base_amount}{r.rate_type === 'weight' && r.per_kg != null ? ` + ${r.per_kg}/kg` : ''}{r.rate_type === 'price' && r.pct != null ? ` + ${r.pct}%` : ''}{r.free_over != null ? ` · free over ${r.free_over}` : ''}
                          </div>
                        </div>
                        <button disabled={busy} onClick={() => send({ action: 'delete_rate', rate_id: r.id })} className="p-1.5 text-zinc-400 hover:text-red-400 disabled:opacity-50"><Trash2 size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
              {zones.length === 0 ? (
                <div className="text-sm text-zinc-500">Add a zone first, then add rates to it.</div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select value={rateZoneId ?? ''} onChange={(e) => setRateZoneId(e.target.value ? Number(e.target.value) : null)} className={input}>
                      <option value="">Select zone…</option>
                      {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                    <input value={rateName} onChange={(e) => setRateName(e.target.value)} className={input} placeholder="Rate name (e.g. Standard)" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={rateType} onChange={(e) => setRateType(e.target.value as 'flat' | 'weight' | 'price')} className={input}>
                      <option value="flat">Flat fee</option>
                      <option value="weight">By weight</option>
                      <option value="price">By price</option>
                    </select>
                    <input value={rateBase} type="number" min={0} step="0.01" onChange={(e) => setRateBase(e.target.value)} className={input} placeholder="Base amount" />
                    {rateType === 'weight' && <input value={ratePerKg} type="number" min={0} step="0.01" onChange={(e) => setRatePerKg(e.target.value)} className={input} placeholder="Per kg" />}
                    {rateType === 'price' && <input value={ratePct} type="number" min={0} step="0.01" onChange={(e) => setRatePct(e.target.value)} className={input} placeholder="% of order" />}
                    {rateType === 'flat' && <input value={rateFreeOver} type="number" min={0} step="0.01" onChange={(e) => setRateFreeOver(e.target.value)} className={input} placeholder="Free over (optional)" />}
                  </div>
                  {rateType !== 'flat' && <input value={rateFreeOver} type="number" min={0} step="0.01" onChange={(e) => setRateFreeOver(e.target.value)} className={`${input} w-full`} placeholder="Free over order amount (optional)" />}
                  <button disabled={busy} onClick={addRate} className="px-4 py-2 bg-gradient-to-r from-accent to-blue-500 rounded-lg text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Plus size={14} /> Add rate</button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
