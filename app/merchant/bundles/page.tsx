'use client';

/**
 * Merchant Bundles page (Commerce Operations Phase 1E — authoring UI)
 *
 * Create product bundles ("buy these together for a set price / % off"). Calls /api/merchant/bundles. At
 * checkout VFIDE applies the best bundle savings automatically (server-authoritative). Pure in-house logic —
 * no external dependency. Coupons have their own manager; this is the bundle complement.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, Plus, Trash2, Loader2, Package, X } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface BundleComponent { product_id: number; quantity: number; }
interface Bundle { id: number; name: string; pricing_type: 'fixed' | 'percent'; amount: number; active: boolean; components: BundleComponent[]; }
interface Product { id: number; name: string; price: number | string; }

export default function MerchantBundlesPage() {
  const { isConnected } = useAccount();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [pricingType, setPricingType] = useState<'fixed' | 'percent'>('fixed');
  const [amount, setAmount] = useState('');
  const [components, setComponents] = useState<BundleComponent[]>([]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [bRes, pRes] = await Promise.all([
        fetch('/api/merchant/bundles'),
        fetch('/api/merchant/products?limit=200'),
      ]);
      if (bRes.ok) { const d = await bRes.json(); setBundles(Array.isArray(d.bundles) ? d.bundles : []); }
      if (pRes.ok) { const d = await pRes.json(); setProducts(Array.isArray(d.products) ? d.products : (Array.isArray(d.items) ? d.items : [])); }
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
      const res = await fetch('/api/merchant/bundles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
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

  const addComponent = (productId: number) => {
    if (components.some((c) => c.product_id === productId)) return;
    setComponents([...components, { product_id: productId, quantity: 1 }]);
  };
  const setComponentQty = (productId: number, qty: number) => {
    setComponents(components.map((c) => c.product_id === productId ? { ...c, quantity: Math.max(1, qty) } : c));
  };
  const removeComponent = (productId: number) => setComponents(components.filter((c) => c.product_id !== productId));

  const createBundle = async () => {
    if (!name.trim()) { setError('Bundle name required'); return; }
    if (components.length === 0) { setError('Add at least one product'); return; }
    if (await send({ action: 'add_bundle', name: name.trim(), pricing_type: pricingType, amount: Number(amount || 0), components })) {
      setName(''); setAmount(''); setComponents([]); setPricingType('fixed');
    }
  };

  const productName = (id: number) => products.find((p) => p.id === id)?.name ?? `#${id}`;
  const input = 'bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm';

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/merchant" className="text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Back</Link>
        <div className="flex items-center gap-2 mb-2"><Package size={22} className="text-accent" /><h1 className="text-2xl font-bold">Bundles</h1></div>
        <p className="text-sm text-zinc-500 mb-6">
          Sell products together at a special price. When a buyer&apos;s cart contains all of a bundle&apos;s
          products, VFIDE applies the savings automatically at checkout.
        </p>

        {!isConnected && <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">Connect your wallet to manage bundles.</div>}
        {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-6">
            {/* Existing bundles */}
            <section className="border border-white/10 rounded-xl p-4">
              <h2 className="font-semibold mb-3">Your bundles</h2>
              {bundles.length === 0 ? (
                <div className="text-sm text-zinc-500">No bundles yet. Create one below.</div>
              ) : (
                <div className="space-y-2">
                  {bundles.map((b) => (
                    <div key={b.id} className="flex items-center justify-between bg-white/3 border border-white/5 rounded-lg p-3 text-sm">
                      <div>
                        <span className="font-medium">{b.name}</span>
                        <span className="text-xs text-zinc-500 ml-2">{b.pricing_type === 'fixed' ? `$${b.amount} for the set` : `${b.amount}% off`}{b.active ? '' : ' · inactive'}</span>
                        <div className="text-xs text-zinc-500 mt-0.5">{b.components.map((c) => `${c.quantity}× ${productName(c.product_id)}`).join(' + ')}</div>
                      </div>
                      <button disabled={busy} onClick={() => send({ action: 'delete_bundle', bundle_id: b.id })} className="p-1.5 text-zinc-400 hover:text-red-400 disabled:opacity-50"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Create bundle */}
            <section className="border border-white/10 rounded-xl p-4 space-y-3">
              <h2 className="font-semibold">Create a bundle</h2>
              <input value={name} onChange={(e) => setName(e.target.value)} className={`${input} w-full`} placeholder="Bundle name (e.g. Starter Kit)" />
              <div className="grid grid-cols-2 gap-2">
                <select value={pricingType} onChange={(e) => setPricingType(e.target.value as 'fixed' | 'percent')} className={input}>
                  <option value="fixed">Set price for the bundle</option>
                  <option value="percent">% off the components</option>
                </select>
                <input value={amount} type="number" min={0} step="0.01" onChange={(e) => setAmount(e.target.value)} className={input} placeholder={pricingType === 'fixed' ? 'Bundle price' : 'Percent off'} />
              </div>

              <div>
                <div className="text-xs font-semibold text-zinc-400 mb-1">Products in this bundle</div>
                {components.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {components.map((c) => (
                      <div key={c.product_id} className="flex items-center gap-2 bg-white/3 border border-white/5 rounded px-2 py-1 text-sm">
                        <span className="flex-1">{productName(c.product_id)}</span>
                        <input type="number" min={1} value={c.quantity} onChange={(e) => setComponentQty(c.product_id, Number(e.target.value))} className="w-16 bg-zinc-900 border border-white/10 rounded px-2 py-1 text-xs" />
                        <button onClick={() => removeComponent(c.product_id)} className="text-zinc-400 hover:text-red-400"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <select onChange={(e) => { if (e.target.value) { addComponent(Number(e.target.value)); e.target.value = ''; } }} className={`${input} w-full`} defaultValue="">
                  <option value="">+ Add a product…</option>
                  {products.filter((p) => !components.some((c) => c.product_id === p.id)).map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <button disabled={busy} onClick={createBundle} className="px-4 py-2 bg-gradient-to-r from-accent to-blue-500 rounded-lg text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50"><Plus size={14} /> Create bundle</button>
            </section>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
