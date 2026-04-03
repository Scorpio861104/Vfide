'use client';

import { SubscriptionManager } from '@/components/social/SubscriptionManager';

export function SubscriptionsTab() {
  return (
    <div className="space-y-6">
      <div className="bg-white/3 border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-bold text-white mb-4">Subscriptions</h3>
        <SubscriptionManager creatorAddress="0x0000000000000000000000000000000000000001" creatorName="VFIDE Demo" />
      </div>
    </div>
  );
}
