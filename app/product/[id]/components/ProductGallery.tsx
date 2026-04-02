'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';

interface ProductImage { url: string; alt?: string }

export function ProductGallery({ images, name, compareAtPrice, price }: {
  images: ProductImage[]; name: string; compareAtPrice: string | null; price: string;
}) {
  const [current, setCurrent] = useState(0);
  const hasDiscount = compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price);
  const discountPct = hasDiscount ? Math.round((1 - parseFloat(price) / parseFloat(compareAtPrice!)) * 100) : 0;

  return (
    <div className="relative">
      <div className="aspect-square bg-white/5 rounded-2xl overflow-hidden relative">
        {images.length > 0 ? (
          <img src={images[current]?.url} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Package size={48} className="text-gray-600" /></div>
        )}
        {hasDiscount && <div className="absolute top-3 left-3 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">-{discountPct}%</div>}
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto">
          {images.map((img, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === current ? 'border-cyan-400' : 'border-transparent'}`}>
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
