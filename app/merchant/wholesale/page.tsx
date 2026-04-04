'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, Package, Users, TrendingDown, ShoppingCart, Check } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';

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

const DEMO_PRODUCTS: WholesaleProduct[] = [
  {
    id: 'w1',
    name: 'Kente Fabric (per yard)',
    retailPrice: 25,
    tiers: [{ minQty: 10, price: 22 }, { minQty: 50, price: 18 }, { minQty: 100, price: 15 }],
    merchantName: 'Kofi Textiles',
    merchantAddress: '0x1234567890abcdef1234567890abcdef12345678',
    merchantScore: 8200,
    minOrder: 10,
    available: 500,
  },
  {
    id: 'w2',
    name: 'Shea Butter (1kg jar)',
    retailPrice: 12,
    tiers: [{ minQty: 20, price: 10 }, { minQty: 100, price: 8 }],
    merchantName: 'Accra Naturals',
    merchantAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
    merchantScore: 7800,
    minOrder: 20,
    available: 200,
  },
];

export default function MerchantWholesalePage() {
  const { address } = useAccount();
  const { formatCurrency } = useLocale();
  const [selectedProduct, setSelectedProduct] = useState<WholesaleProduct | null>(null);
  const [quantity, setQuantity] = useState('');

  const activeTier = useMemo(() => {
    if (!selectedProduct) return null;
    const qty = Number.parseInt(quantity, 10) || 0;
    return [...selectedProduct.tiers].reverse().find((tier) => qty >= tier.minQty) || null;
  }, [selectedProduct, quantity]);

  const total = selectedProduct ? (activeTier?.price || selectedProduct.retailPrice) * (Number.parseInt(quantity, 10) || 0) : 0;
  const savings = selectedProduct ? (selectedProduct.retailPrice - (activeTier?.price || selectedProduct.retailPrice)) * (Number.parseInt(quantity, 10) || 0) : 0;

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-24 text-white">
        <div className="container mx-auto max-w-4xl px-4 pb-16">
          <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          <div className="mb-6">
            <h1 className="flex items-center gap-3 text-3xl font-bold"><Package className="text-cyan-400" /> Wholesale & group buying</h1>
            <p className="mt-2 text-gray-400">Use the uploaded wholesale catalog concept to pool merchant orders and unlock better pricing tiers.</p>
          </div>

          {!address ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">Connect the merchant wallet to access wholesale tools.</div>
          ) : (
            <div className="space-y-4">
              {DEMO_PRODUCTS.map((product) => {
                const bestTier = product.tiers[product.tiers.length - 1];
                const bestDiscount = bestTier ? Math.round((1 - bestTier.price / product.retailPrice) * 100) : 0;
                const expanded = selectedProduct?.id === product.id;

                return (
                  <div key={product.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <button type="button" onClick={() => setSelectedProduct(expanded ? null : product)} className="flex w-full items-start justify-between gap-4 text-left">
                      <div>
                        <div className="text-lg font-semibold text-white">{product.name}</div>
                        <div className="mt-1 text-xs text-gray-400">{product.merchantName} · ProofScore {product.merchantScore}</div>
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

                    {expanded && (
                      <div className="mt-4 space-y-4 border-t border-white/5 pt-4">
                        <div>
                          <label className="mb-1 block text-sm text-gray-400">Order quantity</label>
                          <input value={quantity} onChange={(event) => setQuantity(event.target.value)} min={product.minOrder} type="number" placeholder={`Min ${product.minOrder}`} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
                        </div>

                        {Number.parseInt(quantity, 10) > 0 && (
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between"><span className="text-gray-400">Total</span><span className="font-semibold text-white">{formatCurrency(total)}</span></div>
                            {savings > 0 && <div className="flex items-center justify-between"><span className="inline-flex items-center gap-1 text-emerald-300"><TrendingDown size={14} /> Savings</span><span className="font-semibold text-emerald-300">{formatCurrency(savings)}</span></div>}
                          </div>
                        )}

                        <div className="flex gap-3">
                          <button type="button" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-semibold text-white">
                            <ShoppingCart size={16} /> Place order
                          </button>
                          <button type="button" className="flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-sm font-semibold text-purple-200">
                            <Users size={16} /> Start group buy
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 text-center">
                <Users className="mx-auto mb-3 text-purple-300" />
                <div className="text-lg font-semibold text-white">Group orders</div>
                <p className="mt-2 text-sm text-gray-400">Pool purchases with other merchants and share the lower wholesale tier once the group target is hit.</p>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-300"><Check size={14} /> Ready for marketplace/API wiring</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
