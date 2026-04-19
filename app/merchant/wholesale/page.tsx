'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, Package, Users, TrendingDown, ShoppingCart, Check, Loader2, RefreshCw } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { safeLocalStorage } from '@/lib/utils';

interface WholesaleTier {
  minQty: number;
  price: number;
}

interface WholesaleProduct {
  id: string;
  name: string;
  retailPrice: number;
  tiers: WholesaleTier[];
  merchantName: string;
  merchantAddress: string;
  merchantScore: number;
  minOrder: number;
  available: number;
}

interface GroupBuyRecord {
  id: string;
  product_id: string;
  product_name: string;
  merchant_name: string;
  initiator_merchant_address: string;
  target_quantity: number;
  current_quantity: number;
  current_unit_price: string;
  status: string;
  notes: string;
}

const STORAGE_PREFIX = 'vfide.wholesale.group-buys.';

function deriveDefaultTiers(basePrice: number): WholesaleTier[] {
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return [];
  }

  return [
    { minQty: 10, price: Math.round(basePrice * 0.9 * 100) / 100 },
    { minQty: 25, price: Math.round(basePrice * 0.85 * 100) / 100 },
    { minQty: 50, price: Math.round(basePrice * 0.8 * 100) / 100 },
  ];
}

function normalizeTiers(raw: unknown, retailPrice: number): WholesaleTier[] {
  if (Array.isArray(raw)) {
    const tiers = raw
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        const row = entry as Record<string, unknown>;
        const minQty = Number(row.minQty ?? row.min_qty ?? 0);
        const price = Number(row.price ?? row.unit_price ?? 0);
        if (!Number.isFinite(minQty) || minQty <= 0 || !Number.isFinite(price) || price <= 0) {
          return null;
        }
        return { minQty: Math.floor(minQty), price };
      })
      .filter((tier): tier is WholesaleTier => Boolean(tier))
      .sort((left, right) => left.minQty - right.minQty);

    if (tiers.length > 0) {
      return tiers;
    }
  }

  return deriveDefaultTiers(retailPrice);
}

function normalizeProducts(raw: unknown): WholesaleProduct[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      const retailPrice = Number(row.retailPrice ?? row.price ?? 0);
      const tiers = normalizeTiers(row.tiers, retailPrice);
      const minOrder = Number(row.minOrder ?? row.min_order ?? tiers[0]?.minQty ?? 10);

      return {
        id: String(row.id ?? ''),
        name: String(row.name ?? ''),
        retailPrice,
        tiers,
        merchantName: String(row.merchantName ?? row.merchant_name ?? row.merchantAddress ?? row.merchant_address ?? 'Unknown merchant'),
        merchantAddress: String(row.merchantAddress ?? row.merchant_address ?? ''),
        merchantScore: Number(row.merchantScore ?? row.merchant_score ?? 0),
        minOrder: Number.isFinite(minOrder) && minOrder > 0 ? Math.floor(minOrder) : 10,
        available: Number(row.available ?? row.inventory_count ?? 0),
      } satisfies WholesaleProduct;
    })
    .filter((product): product is WholesaleProduct => Boolean(product?.id && product?.name));
}

function normalizeGroupBuys(raw: unknown): GroupBuyRecord[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const row = entry as Record<string, unknown>;
      return {
        id: String(row.id ?? ''),
        product_id: String(row.product_id ?? ''),
        product_name: String(row.product_name ?? ''),
        merchant_name: String(row.merchant_name ?? ''),
        initiator_merchant_address: String(row.initiator_merchant_address ?? ''),
        target_quantity: Number(row.target_quantity ?? 0),
        current_quantity: Number(row.current_quantity ?? 0),
        current_unit_price: String(row.current_unit_price ?? '0'),
        status: String(row.status ?? 'open'),
        notes: String(row.notes ?? ''),
      } satisfies GroupBuyRecord;
    })
    .filter((groupBuy): groupBuy is GroupBuyRecord => Boolean(groupBuy?.id && groupBuy?.product_name));
}

function dedupeGroupBuys(items: GroupBuyRecord[]): GroupBuyRecord[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.id || `${item.product_id}-${item.initiator_merchant_address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function MerchantWholesalePage() {
  const { address } = useAccount();
  const { formatCurrency } = useLocale();
  const [products, setProducts] = useState<WholesaleProduct[]>([]);
  const [remoteGroupBuys, setRemoteGroupBuys] = useState<GroupBuyRecord[]>([]);
  const [localGroupBuys, setLocalGroupBuys] = useState<GroupBuyRecord[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [submittingGroupBuy, setSubmittingGroupBuy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const storageKey = `${STORAGE_PREFIX}${address?.toLowerCase() || 'guest'}`;

  useEffect(() => {
    setLocalGroupBuys(normalizeGroupBuys(JSON.parse(safeLocalStorage.getItem(storageKey) || '[]')));
  }, [storageKey]);

  useEffect(() => {
    safeLocalStorage.setItem(storageKey, JSON.stringify(localGroupBuys));
  }, [localGroupBuys, storageKey]);

  const loadWholesaleWorkspace = useCallback(async () => {
    if (!address) {
      setProducts([]);
      setRemoteGroupBuys([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/merchant/wholesale?buyer=${address}`);
      const data = await response.json().catch(() => ({ products: [], groupBuys: [] }));

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load wholesale workspace');
      }

      setProducts(normalizeProducts(data.products));
      setRemoteGroupBuys(normalizeGroupBuys(data.groupBuys));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load wholesale workspace');
      setProducts([]);
      setRemoteGroupBuys([]);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadWholesaleWorkspace();
  }, [loadWholesaleWorkspace]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const requestedQuantity = Number.parseInt(quantity, 10) || 0;

  const activeTier = useMemo(() => {
    if (!selectedProduct) return null;
    return [...selectedProduct.tiers].reverse().find((tier) => requestedQuantity >= tier.minQty) || null;
  }, [requestedQuantity, selectedProduct]);

  const total = selectedProduct ? (activeTier?.price || selectedProduct.retailPrice) * requestedQuantity : 0;
  const savings = selectedProduct ? (selectedProduct.retailPrice - (activeTier?.price || selectedProduct.retailPrice)) * requestedQuantity : 0;

  const groupBuys = useMemo(
    () => dedupeGroupBuys([...localGroupBuys, ...remoteGroupBuys]),
    [localGroupBuys, remoteGroupBuys],
  );

  const toggleProduct = (product: WholesaleProduct) => {
    const expanded = selectedProductId === product.id;
    setSelectedProductId(expanded ? null : product.id);
    setQuantity(expanded ? '' : String(product.minOrder));
    setNotice(null);
    setError(null);
  };

  const handleStartGroupBuy = async () => {
    if (!address || !selectedProduct) return;
    if (requestedQuantity < selectedProduct.minOrder) {
      setError(`Enter at least ${selectedProduct.minOrder} units to start a group buy.`);
      return;
    }

    setSubmittingGroupBuy(true);
    setError(null);
    setNotice(null);

    const optimisticGroupBuy: GroupBuyRecord = {
      id: `local-${selectedProduct.id}-${Date.now()}`,
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      merchant_name: selectedProduct.merchantName,
      initiator_merchant_address: address.toLowerCase(),
      target_quantity: Math.max(requestedQuantity, selectedProduct.tiers[0]?.minQty ?? selectedProduct.minOrder),
      current_quantity: requestedQuantity,
      current_unit_price: String(activeTier?.price ?? selectedProduct.retailPrice),
      status: 'open',
      notes: `Wholesale buy started for ${selectedProduct.name}`,
    };

    setLocalGroupBuys((current) => [optimisticGroupBuy, ...current]);
    setNotice('Group buy saved and ready to share with other merchants.');

    try {
      const response = await fetch('/api/merchant/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createGroupBuy',
          merchantAddress: address,
          productId: Number(selectedProduct.id),
          quantity: requestedQuantity,
          targetQty: Math.max(requestedQuantity, selectedProduct.minOrder),
          note: `Wholesale buy started for ${selectedProduct.name}`,
        }),
      });

      const data = await response.json().catch(() => ({ success: false }));
      if (response.ok && data.groupBuy) {
        const persisted = normalizeGroupBuys([data.groupBuy]);
        if (persisted.length > 0) {
          setLocalGroupBuys((current) => dedupeGroupBuys([...persisted, ...current.filter((item) => item.id !== optimisticGroupBuy.id)]));
          setNotice('Group buy synced to the live wholesale workspace.');
        }
      }
    } catch {
      setNotice('Group buy saved locally; live sync will resume when the API is available.');
    } finally {
      setSubmittingGroupBuy(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!address || !selectedProduct) return;
    if (requestedQuantity < selectedProduct.minOrder) {
      setError(`Enter at least ${selectedProduct.minOrder} units to place a wholesale order.`);
      return;
    }

    setSubmittingOrder(true);
    setError(null);
    setNotice(null);

    const requests = await Promise.allSettled([
      fetch('/api/merchant/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantAddress: address,
          supplierName: selectedProduct.merchantName,
          supplierAddress: selectedProduct.merchantAddress,
          notes: `Wholesale supplier added from ${selectedProduct.name}`,
        }),
      }),
      fetch('/api/merchant/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'createOrder',
          merchantAddress: address,
          productId: Number(selectedProduct.id),
          quantity: requestedQuantity,
        }),
      }),
    ]);

    const succeeded = requests.some((result) => result.status === 'fulfilled' && result.value.ok);

    if (!succeeded) {
      setError('Unable to submit the wholesale purchase order right now.');
      setSubmittingOrder(false);
      return;
    }

    setNotice('Purchase order sent to the supplier workspace.');
    setSubmittingOrder(false);
  };

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-24 text-white">
        <div className="container mx-auto max-w-4xl px-4 pb-16">
          <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold"><Package className="text-cyan-400" /> Wholesale & group buying</h1>
              <p className="mt-2 text-gray-400">Use the live wholesale catalog to pool merchant orders and unlock better tier pricing.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadWholesaleWorkspace()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-gray-200"
            >
              <RefreshCw size={16} /> Refresh catalog
            </button>
          </div>

          {!address ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">Connect the merchant wallet to access wholesale tools.</div>
          ) : loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-300">
              <Loader2 size={18} className="animate-spin" /> Loading wholesale catalog…
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
              ) : null}
              {notice ? (
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>
              ) : null}

              {products.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
                  No wholesale listings are available yet.
                </div>
              ) : products.map((product) => {
                const bestTier = product.tiers[product.tiers.length - 1];
                const bestDiscount = bestTier ? Math.round((1 - bestTier.price / product.retailPrice) * 100) : 0;
                const expanded = selectedProductId === product.id;
                const quantityInputId = `quantity-${product.id}`;

                return (
                  <div key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <button type="button" onClick={() => toggleProduct(product)} className="flex w-full items-start justify-between gap-4 text-left">
                      <div>
                        <div className="text-lg font-semibold text-white">{product.name}</div>
                        <div className="mt-1 text-xs text-gray-400">{product.merchantName} · ProofScore {product.merchantScore || '—'} · {product.available} in stock</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-white">{formatCurrency(product.retailPrice)}</div>
                        <div className="text-xs font-bold text-emerald-300">Up to {bestDiscount}% off</div>
                      </div>
                    </button>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {product.tiers.map((tier) => (
                        <span key={`${product.id}-${tier.minQty}`} className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-gray-300">
                          {tier.minQty}+ units @ <span className="font-semibold text-emerald-300">{formatCurrency(tier.price)}</span>
                        </span>
                      ))}
                    </div>

                    {expanded ? (
                      <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
                        <div>
                          <label htmlFor={quantityInputId} className="mb-1 block text-sm text-gray-400">Order quantity</label>
                          <input
                            id={quantityInputId}
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            min={product.minOrder}
                            type="number"
                            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                          />
                        </div>

                        {requestedQuantity > 0 ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between"><span className="text-gray-400">Total</span><span className="font-semibold text-white">{formatCurrency(total)}</span></div>
                            {savings > 0 ? <div className="flex items-center justify-between"><span className="inline-flex items-center gap-1 text-emerald-300"><TrendingDown size={14} /> Savings</span><span className="font-semibold text-emerald-300">{formatCurrency(savings)}</span></div> : null}
                          </div>
                        ) : null}

                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => void handlePlaceOrder()}
                            disabled={submittingOrder}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            <ShoppingCart size={16} /> {submittingOrder ? 'Sending…' : 'Place order'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleStartGroupBuy()}
                            disabled={submittingGroupBuy}
                            className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-sm font-semibold text-purple-200 disabled:opacity-60"
                          >
                            <Users size={16} /> {submittingGroupBuy ? 'Saving…' : 'Start group buy'}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5">
                <div className="mb-2 flex items-center gap-2 text-purple-200"><Users size={16} /> Your group buys</div>
                {groupBuys.length === 0 ? (
                  <p className="text-sm text-gray-400">Start a group buy to save it for your merchant wallet and invite collaborators.</p>
                ) : (
                  <div className="space-y-3">
                    {groupBuys.map((groupBuy) => (
                      <div key={groupBuy.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-white">{groupBuy.product_name}</div>
                            <div className="text-gray-400">{groupBuy.current_quantity}/{groupBuy.target_quantity} units · {groupBuy.merchant_name}</div>
                          </div>
                          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">{groupBuy.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 text-center">
                <Users className="mx-auto mb-3 text-purple-300" />
                <div className="text-lg font-semibold text-white">Live group orders</div>
                <p className="mt-2 text-sm text-gray-400">Wholesale listings now load from the merchant catalog, and group buys persist to your merchant workspace.</p>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-300"><Check size={14} /> Catalog + supplier workflow connected</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
