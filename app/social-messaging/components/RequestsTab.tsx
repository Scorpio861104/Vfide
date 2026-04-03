'use client';

import { FriendRequestsPanel } from '@/components/social/FriendRequestsPanel';

export function RequestsTab() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-4xl">
        <FriendRequestsPanel onAccept={() => undefined} onReject={() => undefined} />
      </div>
    </div>
  );
}
