'use client';

import { useState } from 'react';
import { MessageCircle, Shield } from 'lucide-react';
import { FriendsList } from '@/components/social/FriendsList';
import { MessagingCenter } from '@/components/social/MessagingCenter';

interface MessagesTabProps {
  hasVault?: boolean;
}

export function MessagesTab({ hasVault = false }: MessagesTabProps) {
  const [selectedFriend, setSelectedFriend] = useState<any | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-3" style={{ minHeight: '600px' }}>
      <div className="lg:col-span-1">
        <FriendsList onSelectFriend={(friend) => setSelectedFriend(friend)} selectedFriend={selectedFriend ?? undefined} />
      </div>

      <div className="lg:col-span-2">
        {selectedFriend ? (
          <MessagingCenter friend={selectedFriend} hasVault={hasVault} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 p-12 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-cyan-400/10">
              <MessageCircle className="h-12 w-12 text-cyan-400" />
            </div>
            <h3 className="mb-3 text-2xl font-bold text-zinc-100">Select a Friend to Start Messaging</h3>
            <p className="mb-6 max-w-md text-zinc-400">
              All messages are encrypted using your wallet signature. Only you and your friend can read them.
            </p>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>End-to-end encrypted • Non-custodial • Private</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
