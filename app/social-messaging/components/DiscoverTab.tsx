'use client';

import { useAccount } from 'wagmi';
import { ZERO_ADDRESS } from '@/lib/contracts';
import { ActivityFeed } from '@/components/social/ActivityFeed';
import { GlobalUserSearch } from '@/components/social/GlobalUserSearch';

export function DiscoverTab() {
  const { address } = useAccount();

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl">
        <GlobalUserSearch />
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <ActivityFeed userAddress={address ?? ZERO_ADDRESS} />
      </div>
    </div>
  );
}
