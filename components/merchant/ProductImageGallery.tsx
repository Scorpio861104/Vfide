'use client';

import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import Image from 'next/image';

interface ProductImageGalleryProps {
  images: (string | { url: string; alt?: string })[];
  name: string;
  currentImage: number;
  setCurrentImage: (i: number | ((prev: number) => number)) => void;
  discountPct: number;
  hasDiscount: boolean;
}

export function ProductImageGallery({ images, name, currentImage, setCurrentImage, discountPct, hasDiscount }: ProductImageGalleryProps) {
  if (images.length === 0) {
    return (
      <div className="aspect-square bg-white/5 flex items-center justify-center">
        <Package size={48} className="text-gray-600" />
      </div>
    );
  }

  const getImageUrl = (img: string | { url: string }) => typeof img === 'string' ? img : img.url;
  const activeImage = images[currentImage] ?? images[0];

  if (!activeImage) {
    return (
      <div className="aspect-square bg-white/5 flex items-center justify-center">
        <Package size={48} className="text-gray-600" />
      </div>
    );
  }

  return (
    <>
      <div className="aspect-square relative overflow-hidden">
        <Image src={getImageUrl(activeImage)} alt={name} className="w-full h-full object-cover"  width={48} height={48} />
        {hasDiscount && (
          <div className="absolute top-3 left-3 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-lg">
            -{discountPct}% OFF
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button key={i} onClick={() => setCurrentImage(i)}
              className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? 'bg-cyan-400 w-5' : 'bg-white/30'}`} />
          ))}
        </div>
      )}
      {images.length > 1 && (
        <>
          <button onClick={() => setCurrentImage(i => Math.max(0, i - 1))}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 rounded-full text-white/70 hover:text-white">
            <ChevronLeft size={20} />
          </button>
          <button onClick={() => setCurrentImage(i => Math.min(images.length - 1, i + 1))}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 rounded-full text-white/70 hover:text-white">
            <ChevronRight size={20} />
          </button>
        </>
      )}
    </>
  );
}
