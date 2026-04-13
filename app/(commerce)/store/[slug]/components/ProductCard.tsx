'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingCart, Check, Package } from 'lucide-react';
import { useCart } from '@/providers/CartProvider';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  compare_at_price: string | null;
  images: (string | { url: string })[];
  product_type: string;
  description: string | null;
}

interface ProductCardProps {
  product: Product;
  merchantSlug: string;
  viewMode: 'grid' | 'list';
  themeColor: string | null;
}

function getImageUrl(img: string | { url: string }): string {
  return typeof img === 'string' ? img : img.url;
}

export function ProductCard({ product, merchantSlug, viewMode, themeColor }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const { addItem } = useCart();
  const hasDiscount = product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price);
  const discountPct = hasDiscount ? Math.round((1 - parseFloat(product.price) / parseFloat(product.compare_at_price!)) * 100) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      unitPrice: Number(product.price),
    }, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  if (viewMode === 'list') {
    return (
      <Link href={`/store/${merchantSlug}?product=${product.slug}`}
        className="flex items-center gap-4 p-3 bg-white/3 border border-white/5 rounded-xl hover:border-cyan-500/20 transition-colors">
        <div className="w-16 h-16 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
          {product.images[0] ? (
            <Image src={getImageUrl(product.images[0])} alt={product.name} className="w-full h-full object-cover"  width={48} height={48} />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-gray-600" /></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-medium truncate">{product.name}</div>
          {product.description && <div className="text-gray-500 text-xs truncate mt-0.5">{product.description}</div>}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-cyan-400 font-mono font-bold">${parseFloat(product.price).toFixed(2)}</div>
            {hasDiscount && <div className="text-gray-500 text-xs line-through">${parseFloat(product.compare_at_price!).toFixed(2)}</div>}
          </div>
          <button onClick={handleAddToCart} aria-label={`Add ${product.name} to cart`} className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-colors">
            {added ? <Check size={16} /> : <ShoppingCart size={16} />}
          </button>
        </div>
      </Link>
    );
  }

  return (
    <Link href={`/store/${merchantSlug}?product=${product.slug}`}
      className="group block bg-white/3 border border-white/5 rounded-xl overflow-hidden hover:border-cyan-500/20 transition-all">
      <div className="aspect-square bg-white/5 relative overflow-hidden">
        {product.images[0] ? (
          <Image src={getImageUrl(product.images[0])} alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"  width={48} height={48} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package size={32} className="text-gray-600" />
          </div>
        )}
        {hasDiscount && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded">-{discountPct}%</div>
        )}
        <button onClick={handleAddToCart} aria-label={`Add ${product.name} to cart`}
          className="absolute bottom-2 right-2 p-2 bg-black/60 backdrop-blur-sm rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-500/80">
          {added ? <Check size={16} /> : <ShoppingCart size={16} />}
        </button>
      </div>
      <div className="p-3">
        <div className="text-white text-sm font-medium truncate">{product.name}</div>
        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-cyan-400 font-mono font-bold text-sm">${parseFloat(product.price).toFixed(2)}</span>
          {hasDiscount && <span className="text-gray-500 text-xs line-through">${parseFloat(product.compare_at_price!).toFixed(2)}</span>}
        </div>
      </div>
    </Link>
  );
}
