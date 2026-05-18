'use client';

import { SubscriptionManager } from '@/components/social/SubscriptionManager';

export function SubscriptionsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold">Creator Subscriptions</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Subscribe to your favorite creators for ongoing access to exclusive content,
          perks, and community features.
        </p>

        <SubscriptionManager
          creatorAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
          creatorName="Crypto Artist"
          className="max-w-4xl"
        />

        <div className="mt-8 grid max-w-4xl gap-6 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 text-3xl">🎨</div>
            <h3 className="mb-2 font-semibold">Exclusive Content</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Access all subscriber-only posts, tutorials, and behind-the-scenes content
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 text-3xl">👥</div>
            <h3 className="mb-2 font-semibold">Private Community</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Join exclusive Discord/Telegram groups with direct creator access
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-3 text-3xl">⭐</div>
            <h3 className="mb-2 font-semibold">Subscriber Badge</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Display your supporter status with a special badge on your profile
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
