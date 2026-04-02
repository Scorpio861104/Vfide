'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, Package, Star } from 'lucide-react';
import { motion } from 'framer-motion';

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
  featured?: boolean;
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

export function ProductGridCard({ product, wishlisted, onWishlist }: { product: Product; wishlisted: boolean; onWishlist: (id: string) => void }) {
  const saving = product.compare_at_price ? pctOff(product.price, product.compare_at_price) : 0;
  const lowStock = product.track_inventory && (product.inventory_count ?? 0) > 0 && (product.inventory_count ?? 0) <= 5;

  return (
    <motion.div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800" whileHover={{ y: -3 }}>
      <button
        onClick={(event) => {
          event.preventDefault();
          onWishlist(product.id);
        }}
        className={`absolute right-2 top-2 z-10 rounded-full bg-white/80 p-1.5 shadow-sm transition dark:bg-gray-900/80 ${wishlisted ? 'text-red-500' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}
      >
        <Heart className={`h-4 w-4 ${wishlisted ? 'fill-red-500' : ''}`} />
      </button>

      <Link href={`/product/${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
          {product.images?.[0]?.url ? (
            <Image
              src={product.images[0].url}
              alt={product.images[0].alt || product.name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-10 w-10 text-gray-300 dark:text-gray-500" />
            </div>
          )}
          {saving > 0 && <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-{saving}%</span>}
        </div>

        <div className="p-3">
          <h3 className="min-h-[2.5rem] text-sm font-medium leading-tight text-gray-900 line-clamp-2 dark:text-white">{product.name}</h3>

          {Number(product.review_count) > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-500">
              <Star className="h-3.5 w-3.5 fill-current" />
              <span>{Number(product.avg_rating ?? 0).toFixed(1)}</span>
              <span className="text-blue-600 dark:text-blue-400">({product.review_count})</span>
            </div>
          )}

          <div className="mt-1.5">
            <span className="text-lg font-bold text-gray-900 dark:text-white">${Number(product.price).toFixed(2)}</span>
            {product.compare_at_price && Number(product.compare_at_price) > Number(product.price) && (
              <span className="ml-1.5 text-xs text-gray-400 line-through">${Number(product.compare_at_price).toFixed(2)}</span>
            )}
          </div>

          {product.merchant_name && <p className="mt-1 truncate text-[11px] text-gray-500">by {product.merchant_name}</p>}
          {lowStock && <p className="mt-1 text-[10px] font-medium text-orange-600">Only {product.inventory_count} left in stock</p>}
          {product.track_inventory && (product.inventory_count ?? 0) <= 0 && <p className="mt-1 text-[10px] font-medium text-red-500">Out of stock</p>}
        </div>
      </Link>
    </motion.div>
  );
}
