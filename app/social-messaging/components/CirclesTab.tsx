'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { FriendCirclesManager } from '@/components/social/FriendCirclesManager';
import type { Friend } from '@/types/messaging';
import { safeLocalStorage } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/messageEncryption';

export function CirclesTab() {
  const { address } = useAccount();
  const [friends, setFriends] = useState<Friend[]>([]);

  useEffect(() => {
    if (!address) return;
    const stored = safeLocalStorage.getItem(`${STORAGE_KEYS.FRIENDS}_${address}`);
    if (stored) {
      try {
        setFriends(JSON.parse(stored));
      } catch {
        setFriends([]);
      }
    }
  }, [address]);

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl">
        <FriendCirclesManager friends={friends} />
      </div>
    </div>
  );
}
