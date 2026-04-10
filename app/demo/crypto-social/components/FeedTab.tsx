'use client';

import { SocialPaymentButton } from '@/components/social/SocialPaymentButton';
import { UnifiedActivityFeed } from '@/components/social/UnifiedActivityFeed';

const demoPost = {
  id: 'demo-post-1',
  content: 'Shared a new creator strategy drop with instant on-chain tipping enabled.',
  likes: 128,
  comments: 24,
  tips: '0.42',
  author: {
    avatar: '🎨',
    displayName: 'Crypto Artist',
    username: 'cryptoartist',
    isVerified: true,
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  },
};

export function FeedTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-8">
        <div>
          <h2 className="mb-4 text-2xl font-bold">Social Feed with Integrated Tipping</h2>
          <p className="mb-6 text-gray-600 dark:text-gray-300">
            Users can tip content creators directly from the feed. Tips are instant,
            transparent, and recorded on-chain.
          </p>

          <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{demoPost.author.avatar}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{demoPost.author.displayName}</h3>
                    {demoPost.author.isVerified && <span className="text-blue-500">✓</span>}
                  </div>
                  <p className="text-sm text-gray-500">@{demoPost.author.username}</p>
                </div>
              </div>
              <span className="text-sm text-gray-500">30 mins ago</span>
            </div>

            <p className="mb-4 text-gray-800 dark:text-gray-200">{demoPost.content}</p>

            <div className="mb-4 flex items-center gap-6 text-sm text-gray-500">
              <span>❤️ {demoPost.likes} likes</span>
              <span>💬 {demoPost.comments} comments</span>
              <span className="font-medium text-green-600">💰 {demoPost.tips} ETH tips</span>
            </div>

            <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
              <SocialPaymentButton
                recipientAddress={demoPost.author.address}
                recipientName={demoPost.author.displayName}
                contentId={demoPost.id}
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-xl font-semibold">Recent Activity</h3>
          <UnifiedActivityFeed className="max-w-2xl" />
        </div>
      </div>
    </div>
  );
}
