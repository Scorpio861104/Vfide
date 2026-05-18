'use client';

import { useVfidePrice } from '@/hooks/usePriceHooks';

export function LivePriceDisplay() {
  const { priceUsd, source, isLoading } = useVfidePrice();
  
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-6">
      <h3 className="text-xl font-bold text-zinc-100 mb-4">Current Rate</h3>
      <div className="text-center py-4">
        <div className="text-3xl sm:text-4xl font-bold text-cyan-400">
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            `1 VFIDE = $${priceUsd.toFixed(2)}`
          )}
        </div>
        <div className="text-sm text-zinc-400 mt-2">
          {isLoading ? 'Fetching price...' : `Live from ${source === 'calculated' ? 'market data' : source}`}
        </div>
      </div>
    </div>
  );
}
