'use client';

import { Star } from 'lucide-react';

export function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => {
        const fill = rating >= i ? 100 : rating >= i - 0.5 ? 50 : 0;
        return (
          <div key={i} className="relative">
            <Star className={`${s} text-gray-200 dark:text-gray-600`} />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${fill}%` }}>
              <Star className={`${s} text-amber-400 fill-amber-400`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
