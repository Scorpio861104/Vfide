'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Package, Star } from 'lucide-react';

type ProductImage = { url: string; alt?: string };

type Product = {
  id: string;
  name: string;
  price: string | number;
  compare_at_price?: string | number;
  images?: ProductImage[];
  review_count?: number;
  avg_rating?: number;
  sold_count?: number;
  short_description?: string;
  merchant_name?: string;
  track_inventory?: boolean;
  inventory_count?: number;
};

const pctOff = (price: string | number, compareAt: string | number) => {
  const current = Number(price);
  const original = Number(compareAt);
  if (!Number.isFinite(current) || !Number.isFinite(original) || original <= current || original <= 0) {
    return 0;
  }
  return Math.round(((original - current) / original) * 100);
};

export function ProductListCard({ product, wishlisted, onWishlist }: { product: Product; wishlisted: boolean; onWishlist: (id: string) => void }) {
  const saving = product.compare_at_price ? pctOff(product.price, product.compare_at_price) : 0;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <Link href={`/product/${product.id}`} className="flex gap-4 p-4">
        <div className="relative h-40 w-40 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
          {product.images?.[0]?.url ? (
            <Image src={product.images[0].url} alt={product.images[0].alt || product.name} fill className="object-cover" sizes="(max-width: 768px) 50vw, 25vw" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          )}
          {saving > 0 && <span className="absolute left-1.5 top-1.5 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-{saving}%</span>}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white md:text-base">{product.name}</h3>

          {Number(product.review_count) > 0 && (
            <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{Number(product.avg_rating ?? 0).toFixed(1)}</span>
              <span className="text-blue-600 dark:text-blue-400">{product.review_count} ratings</span>
            </div>
          )}

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-gray-900 dark:text-white">${Number(product.price).toFixed(2)}</span>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
              <>
                <span className="text-sm text-gray-400 line-through">${Number(product.compare_at_price).toFixed(2)}</span>
                <span className="text-sm font-medium text-red-600">({saving}% off)</span>
              </>
            )}
          </div>

          {product.short_description && <p className="mt-1.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">{product.short_description}</p>}
          {product.merchant_name && <p className="mt-1.5 text-xs text-gray-500">by <span className="text-blue-600 dark:text-blue-400">{product.merchant_name}</span></p>}
          {product.track_inventory && (product.inventory_count ?? 0) <= 5 && (product.inventory_count ?? 0) > 0 && (
            <p className="mt-1 text-xs font-medium text-orange-600">Only {product.inventory_count} left in stock — order soon</p>
          )}
        </div>

        <button
          onClick={(event) => {
            event.preventDefault();
            onWishlist(product.id);
          }}
          className={`self-start rounded-lg p-2 transition ${wishlisted ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
        >
          <Heart className={`h-5 w-5 ${wishlisted ? 'fill-red-500' : ''}`} />
        </button>
      </Link>
    </div>
  );
}
