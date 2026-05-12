'use client';

/**
 * RequestsTab — friend request inbox.
 *
 * NOTE: `FriendRequestsPanel` does its own local-state update in
 * handleAccept/handleReject (sets the request status in localStorage),
 * and calls onAccept(request) / onReject(request) afterwards as an
 * extension point for parents that need to propagate the change
 * elsewhere (notifications, badge counts, server sync via
 * PATCH /api/friends).
 *
 * The server endpoint exists at /api/friends but expects a numeric
 * `friendshipId` from the DB, while the local FriendRequest type uses
 * a string `id`. The two systems aren't reconciled yet, so for now this
 * tab leaves the local-only behaviour in place by providing no-op
 * callbacks. When the local store learns DB friendshipIds (e.g. by
 * persisting them on accept of the original push from the server), wire
 * these to fetch('/api/friends', { method: 'PATCH', ... }).
 */

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
