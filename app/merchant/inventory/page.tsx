'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { useLocale } from '@/lib/locale/LocaleProvider';
import {
  ArrowLeft,
  Package,
  Plus,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  Archive,
  Trash2,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

// ── Types ───────────────────────────────────────────────────────────────────

type ProductStatus = 'active' | 'draft' | 'archived';

interface Product {
  id: number;
  name: string;
  description?: string | null;
  short_description?: string | null;
  sku?: string | null;
  price: number;
  compare_at_price?: number | null;
  product_type: 'physical' | 'digital' | 'service';
  inventory_count?: number | null;
  inventory_tracking: boolean;
  status: ProductStatus;
  images?: { url?: string; alt?: string }[] | null;
  tags?: string[] | null;
  featured?: boolean;
}

const STATUS_BADGE: Record<ProductStatus, string> = {
  active:   'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  draft:    'bg-zinc-700/30 border-zinc-600/30 text-zinc-300',
  archived: 'bg-zinc-800/40 border-zinc-700/40 text-zinc-500',
};

const LOW_STOCK_THRESHOLD = 5;

// ── Page ────────────────────────────────────────────────────────────────────

export default function MerchantInventoryPage() {
  const { locale } = useLocale();
  void locale;

  const { address } = useAccount();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('active');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch('/api/merchant/products');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load products');
      setProducts(Array.isArray(data.products) ? data.products : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    let list = products;
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, statusFilter, search]);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.status === 'active');
    const lowStock = active.filter((p) => p.inventory_tracking && Number(p.inventory_count ?? 0) <= LOW_STOCK_THRESHOLD && Number(p.inventory_count ?? 0) > 0);
    const outOfStock = active.filter((p) => p.inventory_tracking && Number(p.inventory_count ?? 0) === 0);
    const totalValue = active.reduce((s, p) => s + (Number(p.price) * Number(p.inventory_count ?? 0)), 0);
    return { active: active.length, lowStock: lowStock.length, outOfStock: outOfStock.length, totalValue };
  }, [products]);

  const updateProduct = useCallback(async (id: number, patch: Partial<Product>) => {
    try {
      const response = await fetch('/api/merchant/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update product');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update product');
    }
  }, [load]);

  const deleteProduct = useCallback(async (id: number) => {
    if (!confirm('Delete this product? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/merchant/products?id=${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to delete product');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete product');
    }
  }, [load]);

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
                  <Package size={14} /> Inventory
                </div>
                <h1 className="text-4xl font-black tracking-tight">Products and stock</h1>
                <p className="mt-3 max-w-3xl text-gray-400">
                  Manage your catalog, track stock levels, and get low-stock alerts.
                </p>
              </div>
              <button onClick={() => setShowCreate(true)} disabled={!address} className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90">
                <Plus size={18} /> New product
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {!address && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to manage inventory.
              </div>
            )}

            {address && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <StatCard label="Active products" value={stats.active} />
                  <StatCard label="Low stock" value={stats.lowStock} accent={stats.lowStock > 0 ? 'amber' : undefined} />
                  <StatCard label="Out of stock" value={stats.outOfStock} accent={stats.outOfStock > 0 ? 'red' : undefined} />
                  <StatCard label="Inventory value" value={`${stats.totalValue.toFixed(2)} VFIDE`} />
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 mb-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by name or SKU…"
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm focus:border-cyan-500 outline-none"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none"
                  >
                    <option value="all">All</option>
                    <option value="active">Active</option>
                    <option value="draft">Drafts</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* List */}
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  {loading ? (
                    <div className="p-12 text-center text-zinc-400">Loading products…</div>
                  ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-zinc-400">
                      {search ? 'No products match your search.' : 'No products yet. Click New product to add your first.'}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {filtered.map((p) => (
                        <ProductRow
                          key={p.id}
                          product={p}
                          onArchive={() => updateProduct(p.id, { status: 'archived' })}
                          onActivate={() => updateProduct(p.id, { status: 'active' })}
                          onDelete={() => deleteProduct(p.id)}
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
        <CreateProductModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => { setShowCreate(false); await load(); }}
          onError={setError}
        />
      )}

      <Footer />
    </>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string | number; accent?: 'amber' | 'red' }) {
  const accentClass =
    accent === 'amber' ? 'border-amber-500/30 bg-amber-500/5' :
    accent === 'red'   ? 'border-red-500/30 bg-red-500/5' :
    'border-white/10 bg-white/5';
  return (
    <div className={`rounded-xl border p-4 ${accentClass}`}>
      <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function ProductRow({ product, onArchive, onActivate, onDelete }: { product: Product; onArchive: () => void; onActivate: () => void; onDelete: () => void }) {
  const stock = Number(product.inventory_count ?? 0);
  const tracked = product.inventory_tracking;
  const stockStatus = tracked
    ? stock === 0 ? 'out' : stock <= LOW_STOCK_THRESHOLD ? 'low' : 'ok'
    : 'untracked';

  return (
    <div className="p-4 hover:bg-white/5 transition-colors flex items-start gap-4 flex-wrap">
      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {product.images?.[0]?.url ? (
          <img src={product.images[0].url} alt={product.images[0].alt ?? product.name} className="w-full h-full object-cover" />
        ) : (
          <Package size={20} className="text-zinc-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-medium">{product.name}</span>
          <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded border ${STATUS_BADGE[product.status]}`}>
            {product.status}
          </span>
          {product.featured && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
              Featured
            </span>
          )}
        </div>
        <div className="text-xs text-zinc-500 space-x-3">
          {product.sku && <span>SKU: {product.sku}</span>}
          <span>{product.product_type}</span>
          <span className="text-zinc-300">{Number(product.price).toFixed(2)} VFIDE</span>
          {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
            <span className="line-through">{Number(product.compare_at_price).toFixed(2)}</span>
          )}
        </div>
        {tracked && (
          <div className={`text-xs mt-1 ${stockStatus === 'out' ? 'text-red-400' : stockStatus === 'low' ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stockStatus === 'out'
              ? <><AlertTriangle size={11} className="inline mr-1" /> Out of stock</>
              : stockStatus === 'low'
              ? <><AlertTriangle size={11} className="inline mr-1" /> Low: {stock} left</>
              : <><CheckCircle2 size={11} className="inline mr-1" /> {stock} in stock</>}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {product.status === 'active' ? (
          <button onClick={onArchive} className="text-xs px-3 py-1.5 border border-white/10 text-zinc-300 rounded hover:bg-white/5 inline-flex items-center gap-1">
            <Archive size={12} /> Archive
          </button>
        ) : (
          <button onClick={onActivate} className="text-xs px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 rounded hover:bg-emerald-500/20">
            Activate
          </button>
        )}
        {product.status === 'archived' && (
          <button onClick={onDelete} className="text-xs px-3 py-1.5 border border-red-500/30 bg-red-500/10 text-red-300 rounded hover:bg-red-500/20 inline-flex items-center gap-1">
            <Trash2 size={12} /> Delete
          </button>
        )}
      </div>
    </div>
  );
}

function CreateProductModal({ onClose, onCreated, onError }: { onClose: () => void; onCreated: () => Promise<void>; onError: (m: string) => void }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState(0);
  const [sku, setSku] = useState('');
  const [type, setType] = useState<'physical' | 'digital' | 'service'>('physical');
  const [description, setDescription] = useState('');
  const [tracking, setTracking] = useState(true);
  const [stock, setStock] = useState(0);
  const [status, setStatus] = useState<'active' | 'draft'>('active');
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = name.trim().length > 0 && price > 0 && !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/merchant/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          price,
          sku: sku.trim() || undefined,
          product_type: type,
          description: description.trim() || undefined,
          inventory_tracking: type === 'physical' ? tracking : false,
          inventory_count: type === 'physical' && tracking ? stock : undefined,
          status,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create product');
      await onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create product');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, name, price, sku, type, description, tracking, stock, status, onCreated, onError]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-lg w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">New product</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Name *</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Haircut – Adult" className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Price (VFIDE) *</span>
              <input type="number" min={0.01} step={0.01} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">SKU (optional)</span>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none" />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none">
              <option value="physical">Physical product</option>
              <option value="digital">Digital download</option>
              <option value="service">Service / appointment</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Description (optional)</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none resize-none" />
          </label>
          {type === 'physical' && (
            <div className="rounded-lg border border-white/10 bg-zinc-900/40 p-3 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={tracking} onChange={(e) => setTracking(e.target.checked)} className="accent-cyan-500" />
                <span>Track inventory</span>
              </label>
              {tracking && (
                <label className="block">
                  <span className="text-xs text-zinc-400 mb-1 block">Initial stock</span>
                  <input type="number" min={0} step={1} value={stock} onChange={(e) => setStock(Number(e.target.value))} className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none" />
                </label>
              )}
            </div>
          )}
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Visibility</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none">
              <option value="active">Active (visible in store)</option>
              <option value="draft">Draft (not visible)</option>
            </select>
          </label>
          <button onClick={submit} disabled={!canSubmit} className="w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Creating…' : 'Create product'}
          </button>
        </div>
      </div>
    </div>
  );
}
