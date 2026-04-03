'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Content extracted from original demo/crypto-social page

export function FeedTab() {
  return (
    <div className="space-y-6">
      <div className="space-y-8">
    <div>
    <h2 className="text-2xl font-bold mb-4">Social Feed with Integrated Tipping</h2>
    <p className="text-gray-600 dark:text-gray-300 mb-6">
    Users can tip content creators directly from the feed. Tips are instant,
    transparent, and recorded on-chain.
    </p>

    {/* Demo Post */}
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 max-w-2xl">
    {/* Post Header */}
    <div className="flex items-center justify-between mb-4">
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

    {/* Post Content */}
    <p className="text-gray-800 dark:text-gray-200 mb-4">{demoPost.content}</p>

    {/* Engagement Stats */}
    <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
    <span>❤️ {demoPost.likes} likes</span>
    <span>💬 {demoPost.comments} comments</span>
    <span className="text-green-600 font-medium">💰 {demoPost.tips} ETH tips</span>
    </div>

    {/* Action Buttons */}
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
    <SocialPaymentButton
    recipientAddress={demoPost.author.address}
    recipientName={demoPost.author.displayName}
    contentId={demoPost.id}
    />
    </div>
    </div>
    </div>

    {/* Activity Feed */}
    <div>
    <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
    <UnifiedActivityFeed className="max-w-2xl" />
    </div>
    </div>
    </div>
  );
}
