'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original social-messaging page

export function MessagesTab() {
  return (
    <div className="space-y-6">
      <motion.div
    key="messages"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="grid lg:grid-cols-3 gap-6"
    style={{ minHeight: '600px' }}
    >
    {/* Friends List */}
    <div className="lg:col-span-1">
    <Suspense fallback={<SocialPanelFallback message="Loading friends…" />}>
    <FriendsList
    onSelectFriend={(friend) => {
    setSelectedFriend(friend);
    setSelectedGroup(undefined);
    // Store friends for group creation
    const stored = safeLocalStorage.getItem(`vfide_friends_${address}`);
    if (stored) {
    try {
    setFriends(JSON.parse(stored));
    } catch {
    // Invalid JSON in storage, ignore and use default empty array
    }
    }
    }}
    selectedFriend={selectedFriend}
    />
    </Suspense>
    </div>

    {/* Messaging Center */}
    <div className="lg:col-span-2">
    {selectedFriend ? (
    <Suspense fallback={<SocialPanelFallback message="Loading encrypted conversation…" />}>
    <MessagingCenter friend={selectedFriend} hasVault={hasVault} />
    </Suspense>
    ) : (
    <div className="bg-zinc-900 rounded-xl border border-zinc-700 h-full flex flex-col items-center justify-center p-12 text-center">
    <div className="w-24 h-24 rounded-full bg-cyan-400/10 flex items-center justify-center mb-6">
    <MessageCircle className="w-12 h-12 text-cyan-400" />
    </div>
    <h3 className="text-2xl font-bold text-zinc-100 mb-3">
    Select a Friend to Start Messaging
    </h3>
    <p className="text-zinc-400 max-w-md mb-6">
    All messages are encrypted using your wallet signature. Only you and your friend can read them.
    </p>
    <div className="flex items-center gap-2 text-sm text-zinc-500">
    <Shield className="w-4 h-4 text-emerald-500" />
    <span>End-to-end encrypted • Non-custodial • Private</span>
    </div>
    </div>
    )}
    </div>
    </motion.div>
    </div>
  );
}
