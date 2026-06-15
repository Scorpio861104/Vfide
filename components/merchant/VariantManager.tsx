'use client';

/**
 * VariantManager (Commerce Operations Phase 1A — merchant authoring UI)
 *
 * The merchant-facing screen for a product's variants: list, add, edit (name / SKU / price override /
 * inventory / sort), and archive. Calls the certified CRUD route /api/merchant/products/[id]/variants.
 * This closes the Phase 1A Grandmother gate — a non-technical merchant can build a size/color matrix from a
 * screen instead of the API. Self-contained so it drops into the inventory page without bloating it.
 */

import { useCallback, useEffect, useState } from 'react';
import { Plus, X, Archive, Save, Loader2, Tag } from 'lucide-react';

interface Variant {
  id: number;
  name: string;
  sku: string | null;
  price_override: number | null;
  inventory_count: number | null;
  sort_order: number;
  attributes: Record<string, string> | null;
  status: string;
}

interface DraftRow {
  name: string;
  sku: string;
  price_override: string; // '' = inherit product price
  inventory_count: string; // '' = untracked
  attributes: string;      // "size=L, color=Blue"
}

const EMPTY_DRAFT: DraftRow = { name: '', sku: '', price_override: '', inventory_count: '', attributes: '' };

function parseAttributes(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of raw.split(',')) {
    const [k, v] = pair.split('=').map((s) => s.trim());
    if (k && v) out[k] = v;
  }
  return out;
}

function attributesToText(attrs: Record<string, string> | null): string {
  if (!attrs) return '';
  return Object.entries(attrs).map(([k, v]) => `${k}=${v}`).join(', ');
}

export function VariantManager({ productId, productPrice, onClose }: { productId: number; productPrice: number; onClose: () => void }) {
  const [variants, setVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DraftRow>(EMPTY_DRAFT);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/merchant/products/${productId}/variants`);
      if (!res.ok) throw new Error('Failed to load variants');
      const data = await res.json();
      setVariants(Array.isArray(data.variants) ? data.variants : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load variants');
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => { void load(); }, [load]);

  const addVariant = async () => {
    if (!draft.name.trim()) { setError('Variant name is required (e.g. "Large / Blue")'); return; }
    setBusy(true); setError(null);
    try {
      const body: Record<string, unknown> = {
        name: draft.name.trim(),
        attributes: parseAttributes(draft.attributes),
      };
      if (draft.sku.trim()) body.sku = draft.sku.trim();
      if (draft.price_override.trim() !== '') body.price_override = Number(draft.price_override);
      if (draft.inventory_count.trim() !== '') body.inventory_count = Number(draft.inventory_count);
      const res = await fetch(`/api/merchant/products/${productId}/variants`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to add variant');
      setDraft(EMPTY_DRAFT);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add variant');
    } finally {
      setBusy(false);
    }
  };

  const saveVariant = async (v: Variant) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/merchant/products/${productId}/variants`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          variant_id: v.id, name: v.name, sku: v.sku, price_override: v.price_override,
          inventory_count: v.inventory_count, sort_order: v.sort_order, attributes: v.attributes ?? {},
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save variant');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save variant');
    } finally {
      setBusy(false);
    }
  };

  const archiveVariant = async (id: number) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/merchant/products/${productId}/variants`, {
        method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ variant_id: id }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to archive variant');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to archive variant');
    } finally {
      setBusy(false);
    }
  };

  const patchLocal = (id: number, field: keyof Variant, value: unknown) =>
    setVariants((vs) => vs.map((v) => (v.id === id ? { ...v, [field]: value } : v)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10 sticky top-0 bg-zinc-950">
          <div className="flex items-center gap-2"><Tag size={18} className="text-accent" /><h2 className="font-semibold">Variants</h2></div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-zinc-500">
            When a product has active variants, the variant becomes the stock-keeping unit: buyers must pick one,
            and its price/stock apply. Leave price blank to use the product price ({productPrice.toFixed(2)} VFIDE);
            leave stock blank for untracked.
          </p>

          {error && <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</div>}

          {/* Existing variants */}
          {loading ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm"><Loader2 size={16} className="animate-spin" /> Loading…</div>
          ) : variants.filter((v) => v.status === 'active').length === 0 ? (
            <div className="text-sm text-zinc-500">No variants yet. Add sizes, colors, or options below.</div>
          ) : (
            <div className="space-y-2">
              {variants.filter((v) => v.status === 'active').map((v) => (
                <div key={v.id} className="grid grid-cols-12 gap-2 items-center bg-white/3 border border-white/5 rounded-lg p-2">
                  <input value={v.name} onChange={(e) => patchLocal(v.id, 'name', e.target.value)}
                    className="col-span-4 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm" placeholder="Large / Blue" />
                  <input value={v.sku ?? ''} onChange={(e) => patchLocal(v.id, 'sku', e.target.value || null)}
                    className="col-span-3 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm" placeholder="SKU" />
                  <input value={v.price_override ?? ''} type="number" min={0} step="0.01"
                    onChange={(e) => patchLocal(v.id, 'price_override', e.target.value === '' ? null : Number(e.target.value))}
                    className="col-span-2 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm" placeholder="price" />
                  <input value={v.inventory_count ?? ''} type="number" min={0} step="1"
                    onChange={(e) => patchLocal(v.id, 'inventory_count', e.target.value === '' ? null : Number(e.target.value))}
                    className="col-span-1 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm" placeholder="qty" />
                  <div className="col-span-2 flex gap-1 justify-end">
                    <button disabled={busy} onClick={() => saveVariant(v)} title="Save" className="p-1.5 bg-accent/20 text-accent rounded hover:bg-accent/30 disabled:opacity-50"><Save size={14} /></button>
                    <button disabled={busy} onClick={() => archiveVariant(v.id)} title="Archive" className="p-1.5 bg-white/5 text-zinc-400 rounded hover:text-red-400 disabled:opacity-50"><Archive size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new variant */}
          <div className="border-t border-white/10 pt-4">
            <div className="text-xs font-semibold text-zinc-400 mb-2">Add a variant</div>
            <div className="grid grid-cols-12 gap-2 items-center">
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="col-span-4 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm" placeholder="Large / Blue" />
              <input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
                className="col-span-3 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm" placeholder="SKU (optional)" />
              <input value={draft.price_override} type="number" min={0} step="0.01" onChange={(e) => setDraft({ ...draft, price_override: e.target.value })}
                className="col-span-2 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm" placeholder="price" />
              <input value={draft.inventory_count} type="number" min={0} step="1" onChange={(e) => setDraft({ ...draft, inventory_count: e.target.value })}
                className="col-span-1 bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-sm" placeholder="qty" />
              <div className="col-span-2 flex justify-end">
                <button disabled={busy} onClick={addVariant} className="px-3 py-1.5 bg-gradient-to-r from-accent to-blue-500 rounded text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
                </button>
              </div>
            </div>
            <input value={draft.attributes} onChange={(e) => setDraft({ ...draft, attributes: e.target.value })}
              className="mt-2 w-full bg-zinc-900 border border-white/10 rounded px-2 py-1.5 text-xs" placeholder="attributes, e.g. size=L, color=Blue" />
          </div>
        </div>
      </div>
    </div>
  );
}
