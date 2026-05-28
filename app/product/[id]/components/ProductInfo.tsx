'use client';

import { useState } from 'react';
import { ShoppingCart, Heart, Minus, Plus, Check, Truck, Download, Clock } from 'lucide-react';
import Link from 'next/link';
import { StarRating } from './StarRating';
import { useCart } from '@/providers/CartProvider';
import { CheckoutPanel } from '@/components/checkout/CheckoutPanel';

interface Product {
  id: string; name: string; price: string; compare_at_price: string | null;
  description: string | null; long_description: string | null;
  product_type: 'physical' | 'digital' | 'service';
  variants: { id: string; label: string; price_override: string | null }[] | null;
  merchant_slug: string | null; merchant_name: string;
  merchant_address?: string;
  avg_rating: number | null; review_count: number;
  track_inventory: boolean; inventory_count: number | null;
}

export function ProductInfo({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(product.variants?.[0]?.id || null);
  const [wishlisted, setWishlisted] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const { items, addItem, clear } = useCart();

  const activePrice = selectedVariant && product.variants?.find(v => v.id === selectedVariant)?.price_override || product.price;
  const hasDiscount = product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(activePrice);
  const inStock = !product.track_inventory || (product.inventory_count ?? 1) > 0;
  const typeIcons = { physical: Truck, digital: Download, service: Clock };
  const TypeIcon = typeIcons[product.product_type];

  const handleAddToCart = () => {
    addItem({
      id: `${product.id}:${selectedVariant ?? 'default'}`,
      name: product.name,
      unitPrice: Number(activePrice),
    }, qty);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 bg-cyan-500/10 border border-accent/20 rounded text-cyan-400 capitalize flex items-center gap-1">
          <TypeIcon size={10} /> {product.product_type}
        </span>
      </div>

      <h1 className="text-3xl font-bold text-white">{product.name}</h1>

      {product.review_count > 0 && product.avg_rating && (
        <div className="flex items-center gap-2">
          <StarRating rating={product.avg_rating} />
          <span className="text-gray-400 text-sm">{product.avg_rating.toFixed(1)} ({product.review_count} reviews)</span>
        </div>
      )}

      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-cyan-400 font-mono">${parseFloat(activePrice).toFixed(2)}</span>
        {hasDiscount && <span className="text-lg text-gray-500 line-through font-mono">${parseFloat(product.compare_at_price!).toFixed(2)}</span>}
      </div>

      {product.description && <p className="text-gray-400 leading-relaxed">{product.description}</p>}

      {product.variants && product.variants.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Options</div>
          <div className="flex flex-wrap gap-2">
            {product.variants.map(v => (
              <button key={v.id} onClick={() => setSelectedVariant(v.id)}
                className={`px-3 py-1.5 rounded-lg text-sm border ${selectedVariant === v.id ? 'bg-accent/15 border-accent/40 text-cyan-400' : 'bg-white/3 border-white/10 text-gray-400'}`}>
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center border border-white/10 rounded-lg">
          <button onClick={() => setQty(q => Math.max(1, q - 1))} className="px-3 py-2 text-gray-400 hover:text-white"><Minus size={14} /></button>
          <span className="px-3 py-2 text-white font-mono min-w-[2rem] text-center">{qty}</span>
          <button onClick={() => setQty(q => q + 1)} className="px-3 py-2 text-gray-400 hover:text-white"><Plus size={14} /></button>
        </div>
        <button onClick={handleAddToCart} disabled={!inStock} aria-label={`Add ${product.name} to cart`}
          className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${addedToCart ? 'bg-emerald-500 text-white' : inStock ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' : 'bg-white/5 text-gray-500'}`}>
          {addedToCart ? <><Check size={16} /> Added!</> : <><ShoppingCart size={16} /> Add to cart</>}
        </button>
        <button onClick={() => setWishlisted(!wishlisted)} className="p-3 rounded-xl border border-white/10 hover:border-red-500/30">
          <Heart size={18} className={wishlisted ? 'text-red-400 fill-red-400' : 'text-gray-500'} />
        </button>
      </div>

      {product.merchant_slug && (
        <Link href={`/store/${product.merchant_slug}`} className="flex items-center gap-3 p-3 bg-white/3 border border-white/5 rounded-xl hover:border-accent/20">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs">{product.merchant_name[0]}</div>
          <div className="flex-1"><div className="text-white text-sm font-medium">{product.merchant_name}</div><div className="text-xs text-gray-500">View store</div></div>
        </Link>
      )}

      {totalItems > 0 && !showCheckout && (
        <div className="rounded-xl border border-white/10 bg-white/3 p-4">
          <div className="text-white font-semibold mb-1">{totalItems} item in cart</div>
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full mt-2 py-2.5 rounded-lg bg-accent/20 text-accent border border-accent/30 hover:bg-accent/30"
          >
            Checkout now
          </button>
        </div>
      )}

      {showCheckout && (
        product.merchant_address && /^0x[a-fA-F0-9]{40}$/.test(product.merchant_address) ? (
          <CheckoutPanel
            items={items.map((item) => ({ name: item.name, price: item.unitPrice, qty: item.quantity }))}
            merchantAddress={product.merchant_address as `0x${string}`}
            merchantName={product.merchant_name}
            onComplete={() => {
              clear();
              setShowCheckout(false);
            }}
            onCancel={() => setShowCheckout(false)}
          />
        ) : (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            <div className="font-semibold mb-1">Checkout unavailable</div>
            <p className="text-amber-200/80">
              This merchant has not finished onboarding their on-chain payout address yet.
              Funds cannot be routed safely. Please contact the merchant or try again later.
            </p>
            <button
              onClick={() => setShowCheckout(false)}
              className="mt-3 text-xs font-semibold text-amber-300 hover:text-amber-200 underline"
            >
              Close
            </button>
          </div>
        )
      )}
    </div>
  );
}
