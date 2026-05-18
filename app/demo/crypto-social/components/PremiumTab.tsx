'use client';

import { PremiumContentGate } from '@/components/social/PremiumContentGate';

const demoPremiumContent = {
  id: 'premium-content-demo',
  title: 'Premium Creator Alpha Pack',
  description: 'Deep-dive notes, trade structure examples, and creator-only insights bundled into one unlock.',
  preview: 'Unlock the full alpha pack to access the complete breakdown and downloadable resources.',
  price: '0.05',
  creator: {
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    displayName: 'Crypto Artist',
  },
};

export function PremiumTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-4 text-2xl font-bold">Premium Content Monetization</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          Creators can gate premium content behind payments. Users unlock content
          with a one-time payment, gaining permanent access.
        </p>

        <PremiumContentGate
          contentId={demoPremiumContent.id}
          contentType="premium_content"
          price={demoPremiumContent.price}
          currency="ETH"
          sellerAddress={demoPremiumContent.creator.address}
          sellerName={demoPremiumContent.creator.displayName}
          preview={<p className="text-gray-600 dark:text-gray-400">{demoPremiumContent.preview}</p>}
          className="max-w-3xl"
        >
          <div className="prose max-w-none dark:prose-invert">
            <h2>{demoPremiumContent.title}</h2>
            <p>{demoPremiumContent.description}</p>
            <p>
              This is the full premium content that becomes visible after unlocking. It includes detailed
              trading strategies, exclusive insights, and proven techniques that have generated consistent returns.
            </p>
          </div>
        </PremiumContentGate>

        <div className="mt-8 max-w-3xl rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 p-6 dark:from-purple-900/20 dark:to-pink-900/20">
          <h3 className="mb-3 text-lg font-semibold">Benefits of Premium Content</h3>
          <ul className="space-y-2 text-gray-700 dark:text-gray-300">
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span><span>One-time payment for permanent access</span></li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span><span>Ownership recorded on blockchain</span></li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span><span>Creators earn directly without intermediaries</span></li>
            <li className="flex items-center gap-2"><span className="text-green-500">✓</span><span>Instant unlock after confirmation</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
