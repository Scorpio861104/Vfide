'use client';

/**
 * Merchant POS page (Commerce Operations Phase 4 — Physical Retail)
 *
 * A non-technical shop operator's register: pick a location, open the drawer with a float, ring up sales
 * (priced server-side via the Phase 1 pipeline; gated by Phase 3 staff authorization when a cashier rings
 * it), and close + reconcile the drawer at end of shift. Calls /api/merchant/registers and /api/pos/sale.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, Loader2, Store, Plus, Minus, Receipt as ReceiptIcon, LockKeyhole } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface Location { id: string; name: string; }
interface Product { id: number; name: string; price: number | string; }
interface Register { id: string; location_id: string; status: string; opening_float: number; }
interface CartItem { product_id: number; name: string; price: number; quantity: number; }

export default function MerchantPosPage() {
  const { isConnected } = useAccount();
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locationId, setLocationId] = useState('');
  const [register, setRegister] = useState<Register | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tendered, setTendered] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<{ total: number; change: number; order_number: string } | null>(null);
  const [float, setFloat] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [locRes, prodRes, regRes] = await Promise.all([
        fetch('/api/merchant/locations'),
        fetch('/api/merchant/products?limit=200'),
        fetch('/api/merchant/registers?action=registers'),
      ]);
      if (locRes.ok) { const d = await locRes.json(); setLocations(Array.isArray(d.locations) ? d.locations : []); }
      if (prodRes.ok) { const d = await prodRes.json(); setProducts(Array.isArray(d.products) ? d.products : (Array.isArray(d.items) ? d.items : [])); }
      if (regRes.ok) { const d = await regRes.json(); const open = (Array.isArray(d.registers) ? d.registers : []).find((r: Register) => r.status === 'open'); if (open) { setRegister(open); setLocationId(open.location_id); } }
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const openRegister = async () => {
    if (!locationId) { setError('Pick a location'); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/merchant/registers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'open_register', location_id: locationId, opening_float: Number(float || 0) }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to open register');
      setRegister({ id: d.session_id, location_id: locationId, status: 'open', opening_float: Number(float || 0) });
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const closeRegister = async () => {
    if (!register) return;
    const counted = window.prompt('Count the cash in the drawer:');
    if (counted == null) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch('/api/merchant/registers', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'close_register', session_id: register.id, counted_cash: Number(counted) }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Failed to close');
      window.alert(`Drawer ${d.drawer_status}. Expected ${d.expected}, counted ${d.counted}, variance ${d.variance}.`);
      setRegister(null); setCart([]); setLastReceipt(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed'); }
    finally { setBusy(false); }
  };

  const addToCart = (p: Product) => {
    setCart((c) => {
      const existing = c.find((i) => i.product_id === p.id);
      if (existing) return c.map((i) => i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...c, { product_id: p.id, name: p.name, price: Number(p.price), quantity: 1 }];
    });
  };
  const changeQty = (id: number, delta: number) => setCart((c) => c.map((i) => i.product_id === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0));
  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const ringSale = async () => {
    if (!register || cart.length === 0) { setError('Open a register and add items'); return; }
    setBusy(true); setError(null); setLastReceipt(null);
    try {
      const res = await fetch('/api/pos/sale', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        location_id: register.location_id, register_session_id: register.id, payment_method: 'cash',
        tendered: Number(tendered || cartTotal), items: cart.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      }) });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Sale failed');
      setLastReceipt({ total: d.receipt.total, change: d.receipt.change, order_number: d.order_number });
      setCart([]); setTendered('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Sale failed'); }
    finally { setBusy(false); }
  };

  const input = 'bg-zinc-900 border border-white/10 rounded px-3 py-2 text-sm';

  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/merchant" className="text-sm text-zinc-400 hover:text-white inline-flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Back</Link>
        <div className="flex items-center gap-2 mb-2"><Store size={22} className="text-accent" /><h1 className="text-2xl font-bold">Point of Sale</h1></div>
        <p className="text-sm text-zinc-500 mb-6">Open a register, ring up in-person sales, and reconcile the cash drawer. Prices and tax are computed by VFIDE; sales decrement that location&apos;s stock.</p>

        {!isConnected && <div className="text-sm text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">Connect your wallet to use the register.</div>}
        {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
        ) : !register ? (
          <div className="border border-white/10 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-sm">Open a register</h2>
            {locations.length === 0 ? (
              <p className="text-sm text-zinc-500">No locations yet. Add one under <Link href="/merchant/locations" className="text-accent">Locations</Link> first.</p>
            ) : (
              <>
                <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={`${input} w-full`}>
                  <option value="">Choose a location…</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
                <input value={float} type="number" min={0} step="0.01" onChange={(e) => setFloat(e.target.value)} className={`${input} w-full`} placeholder="Opening cash float" />
                <button disabled={busy} onClick={openRegister} className="px-4 py-2 bg-gradient-to-r from-accent to-blue-500 rounded-lg text-sm font-semibold disabled:opacity-50">Open register</button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between border border-white/10 rounded-xl p-3">
              <span className="text-sm text-zinc-300">Register open · {locations.find((l) => l.id === register.location_id)?.name ?? 'location'}</span>
              <button disabled={busy} onClick={closeRegister} className="text-xs px-3 py-1.5 bg-white/5 border border-white/10 rounded inline-flex items-center gap-1 text-zinc-300"><LockKeyhole size={12} /> Close & count</button>
            </div>

            {lastReceipt && (
              <div className="border border-emerald-500/30 bg-emerald-500/10 rounded-xl p-3 text-sm text-emerald-300 inline-flex items-center gap-2">
                <ReceiptIcon size={14} /> Sale {lastReceipt.order_number} · total {lastReceipt.total} · change {lastReceipt.change}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* product grid */}
              <div className="border border-white/10 rounded-xl p-3">
                <h2 className="font-semibold text-sm mb-2">Products</h2>
                <div className="space-y-1 max-h-72 overflow-auto">
                  {products.map((p) => (
                    <button key={p.id} onClick={() => addToCart(p)} className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-white/5 flex justify-between">
                      <span>{p.name}</span><span className="text-zinc-500">{String(p.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* cart */}
              <div className="border border-white/10 rounded-xl p-3">
                <h2 className="font-semibold text-sm mb-2">Sale</h2>
                {cart.length === 0 ? <p className="text-xs text-zinc-500">Tap products to add.</p> : (
                  <div className="space-y-1">
                    {cart.map((i) => (
                      <div key={i.product_id} className="flex items-center justify-between text-sm">
                        <span className="flex-1 truncate">{i.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => changeQty(i.product_id, -1)} className="p-0.5 text-zinc-400 hover:text-white"><Minus size={12} /></button>
                          <span className="w-6 text-center">{i.quantity}</span>
                          <button onClick={() => changeQty(i.product_id, 1)} className="p-0.5 text-zinc-400 hover:text-white"><Plus size={12} /></button>
                        </div>
                      </div>
                    ))}
                    <div className="border-t border-white/10 mt-2 pt-2 text-sm font-semibold flex justify-between"><span>Subtotal</span><span>{cartTotal.toFixed(2)}</span></div>
                    <input value={tendered} type="number" min={0} step="0.01" onChange={(e) => setTendered(e.target.value)} className={`${input} w-full mt-2`} placeholder="Cash tendered" />
                    <button disabled={busy} onClick={ringSale} className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-accent to-blue-500 rounded-lg text-sm font-semibold disabled:opacity-50">Charge (cash)</button>
                    <p className="text-[11px] text-zinc-600 mt-1">Final total incl. tax is computed by VFIDE on charge.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
