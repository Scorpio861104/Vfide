'use client';

import { PremiumContentGate } from '@/components/social/PremiumContentGate';

export function PremiumTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Premium</h3>
        <PremiumContentGate
          contentId="demo-premium"
          contentType="premium_content"
          price="10"
          currency="VFIDE"
          sellerAddress="0x0000000000000000000000000000000000000001"
          sellerName="VFIDE Demo Creator"
        >
          <p className="text-gray-400">Premium social content unlocked.</p>
        </PremiumContentGate>
      </div>
    </div>
  );
}
