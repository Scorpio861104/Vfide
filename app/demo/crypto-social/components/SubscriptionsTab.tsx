'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original demo/crypto-social page

export function SubscriptionsTab() {
  return (
    <div className="space-y-6">
      <div>
    <h2 className="text-2xl font-bold mb-4">Creator Subscriptions</h2>
    <p className="text-gray-600 dark:text-gray-300 mb-6">
    Subscribe to your favorite creators for ongoing access to exclusive content,
    perks, and community features.
    </p>

    <SubscriptionManager
    creatorAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
    creatorName="Crypto Artist"
    className="max-w-4xl"
    />

    {/* Subscription Perks */}
    <div className="mt-8 grid md:grid-cols-3 gap-6 max-w-4xl">
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
    <div className="text-3xl mb-3">🎨</div>
    <h3 className="font-semibold mb-2">Exclusive Content</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">
    Access all subscriber-only posts, tutorials, and behind-the-scenes content
    </p>
    </div>
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
    <div className="text-3xl mb-3">👥</div>
    <h3 className="font-semibold mb-2">Private Community</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">
    Join exclusive Discord/Telegram groups with direct creator access
    </p>
    </div>
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
    <div className="text-3xl mb-3">⭐</div>
    <h3 className="font-semibold mb-2">Subscriber Badge</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">
    Display your supporter status with a special badge on your profile
    </p>
    </div>
    </div>
    </div>
    </div>
  );
}
