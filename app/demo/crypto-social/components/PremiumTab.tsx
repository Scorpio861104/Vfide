'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original demo/crypto-social page

export function PremiumTab() {
  return (
    <div className="space-y-6">
      <div>
    <h2 className="text-2xl font-bold mb-4">Premium Content Monetization</h2>
    <p className="text-gray-600 dark:text-gray-300 mb-6">
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
    <div className="prose dark:prose-invert max-w-none">
    <h2>{demoPremiumContent.title}</h2>
    <p>{demoPremiumContent.description}</p>
    <p>This is the full premium content that becomes visible after unlocking. It includes detailed trading strategies, exclusive insights, and proven techniques that have generated consistent returns...</p>
    </div>
    </PremiumContentGate>

    {/* Benefits Section */}
    <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 max-w-3xl">
    <h3 className="text-lg font-semibold mb-3">Benefits of Premium Content</h3>
    <ul className="space-y-2 text-gray-700 dark:text-gray-300">
    <li className="flex items-center gap-2">
    <span className="text-green-500">✓</span>
    <span>One-time payment for permanent access</span>
    </li>
    <li className="flex items-center gap-2">
    <span className="text-green-500">✓</span>
    <span>Ownership recorded on blockchain</span>
    </li>
    <li className="flex items-center gap-2">
    <span className="text-green-500">✓</span>
    <span>Creators earn directly without intermediaries</span>
    </li>
    <li className="flex items-center gap-2">
    <span className="text-green-500">✓</span>
    <span>Instant unlock after confirmation</span>
    </li>
    </ul>
    </div>
    </div>
    </div>
  );
}
