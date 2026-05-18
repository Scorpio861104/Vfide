'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Package } from 'lucide-react';

export function RelatedProducts({ products }: { products: any[] }) {
  return (
    <div className="mt-12 border-t border-white/5 pt-8">
      <h2 className="text-xl font-bold text-white mb-4">You might also like</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {products.slice(0, 6).map((p: any) => (
          <Link key={p.id} href={`/product/${p.id}`} className="flex-shrink-0 w-40 group">
            <div className="aspect-square rounded-lg bg-white/5 overflow-hidden mb-2">
              {p.images?.[0]?.url ? (
                <Image src={p.images[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform"  width={48} height={48} />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Package size={20} className="text-gray-600" /></div>
              )}
            </div>
            <div className="text-xs text-white truncate">{p.name}</div>
            <div className="text-xs text-cyan-400 font-mono">${parseFloat(p.price).toFixed(2)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
