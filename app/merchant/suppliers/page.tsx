'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, Truck, Plus, Phone, Mail, FileText, CheckCircle2 } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';

interface Supplier {
  id: string;
  supplier_name: string;
  supplier_address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
}

interface PurchaseOrder {
  id: string;
  supplier_name: string;
  items: Array<{ name?: string; qty?: number; price?: number }>;
  total: string | null;
  status: string;
  created_at: string;
  expected_delivery: string | null;
}

export default function MerchantSuppliersPage() {
  const { address } = useAccount();
  const { formatCurrency, formatDate } = useLocale();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState({ supplierName: '', contactPhone: '', contactEmail: '', notes: '' });

  const loadData = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/merchant/suppliers?merchant=${address}`);
      const data = await response.json().catch(() => ({ suppliers: [], purchaseOrders: [] }));
      if (response.ok) {
        setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
        setOrders(Array.isArray(data.purchaseOrders) ? data.purchaseOrders : []);
      }
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const addSupplier = useCallback(async () => {
    if (!address || !draft.supplierName.trim()) return;

    await fetch('/api/merchant/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantAddress: address, ...draft }),
    });

    setDraft({ supplierName: '', contactPhone: '', contactEmail: '', notes: '' });
    setShowAdd(false);
    await loadData();
  }, [address, draft, loadData]);

  const deliveredCount = useMemo(() => orders.filter((order) => order.status === 'delivered').length, [orders]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-24 text-white">
        <div className="container mx-auto max-w-4xl px-4 pb-16">
          <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold"><Truck className="text-cyan-400" /> Suppliers & purchase orders</h1>
              <p className="mt-2 text-gray-400">Maintain your supplier directory and keep a clean record of restock requests and deliveries.</p>
            </div>
            <button type="button" onClick={() => setShowAdd((current) => !current)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
              <Plus size={16} /> Add supplier
            </button>
          </div>

          {showAdd && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <input value={draft.supplierName} onChange={(event) => setDraft((current) => ({ ...current, supplierName: event.target.value }))} placeholder="Supplier name" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
              <div className="grid gap-3 md:grid-cols-2">
                <input value={draft.contactPhone} onChange={(event) => setDraft((current) => ({ ...current, contactPhone: event.target.value }))} placeholder="Phone" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
                <input value={draft.contactEmail} onChange={(event) => setDraft((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="Email" className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
              </div>
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" rows={3} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
              <button type="button" onClick={() => void addSupplier()} disabled={!draft.supplierName.trim()} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save supplier</button>
            </div>
          )}

          {!address ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">Connect the merchant wallet to manage suppliers.</div>
          ) : loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-400">Loading supplier records…</div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"><div className="text-xs text-gray-400">Suppliers</div><div className="text-2xl font-bold text-white">{suppliers.length}</div></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"><div className="text-xs text-gray-400">Purchase Orders</div><div className="text-2xl font-bold text-cyan-300">{orders.length}</div></div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center"><div className="text-xs text-gray-400">Delivered</div><div className="text-2xl font-bold text-emerald-300">{deliveredCount}</div></div>
              </div>

              {suppliers.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
                  <Truck className="mx-auto mb-3 text-gray-600" /> No suppliers yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {suppliers.map((supplier) => (
                    <div key={supplier.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="text-lg font-semibold text-white">{supplier.supplier_name}</div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-400">
                        {supplier.contact_phone && <span className="inline-flex items-center gap-1"><Phone size={12} /> {supplier.contact_phone}</span>}
                        {supplier.contact_email && <span className="inline-flex items-center gap-1"><Mail size={12} /> {supplier.contact_email}</span>}
                      </div>
                      {supplier.notes && <p className="mt-2 text-sm text-gray-400">{supplier.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              {orders.length > 0 && (
                <div>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-400"><FileText size={14} /> Recent purchase orders</h2>
                  <div className="space-y-2">
                    {orders.map((order) => (
                      <div key={order.id} className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold text-white">{order.supplier_name}</div>
                            <div className="text-xs text-gray-500">{formatDate(order.created_at, 'short')}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {order.total && <span className="font-semibold text-cyan-300">{formatCurrency(order.total)}</span>}
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-white/5 text-gray-300'}`}>
                              {order.status === 'delivered' && <CheckCircle2 size={12} />} {order.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
