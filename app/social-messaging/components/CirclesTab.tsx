'use client';

import { FriendCirclesManager } from '@/components/social/FriendCirclesManager';

export function CirclesTab() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        <FriendCirclesManager friends={[]} />
      </div>
    </div>
  );
}
