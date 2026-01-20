
'use client';

import React, { useState } from 'react';
import { SocialPaymentButton } from '@/components/social/SocialPaymentButton';
import { PremiumContentGate } from '@/components/social/PremiumContentGate';
import { SubscriptionManager } from '@/components/social/SubscriptionManager';
import { UnifiedActivityFeed } from '@/components/social/UnifiedActivityFeed';
import { CreatorDashboard } from '@/components/social/CreatorDashboard';

/**
 * Crypto-Social Integration Demo Page
 * Showcases the seamless blend of cryptocurrency payments and social media features
 */
export default function CryptoSocialDemo() {
  const [activeTab, setActiveTab] = useState<'feed' | 'premium' | 'dashboard' | 'subscriptions'>('feed');

  // Demo data
  const demoPost = {
    id: 'post-demo-1',
    author: {
      id: 'user-1',
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      username: 'cryptoartist',
      displayName: 'Crypto Artist',
      avatar: '🎨',
      isVerified: true,
    },
    content: 'Just minted my latest NFT collection! Check it out and let me know what you think. 🚀',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    likes: 42,
    comments: 12,
    tips: 2.5,
  };

  const demoPremiumContent = {
    id: 'premium-1',
    title: 'Exclusive Trading Strategy Guide',
    description: 'Learn my proven strategy for identifying 10x crypto gems before they moon.',
    preview: 'This comprehensive guide covers technical analysis, on-chain metrics, and sentiment analysis...',
    price: '1.0',
    creator: {
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      username: 'cryptotrader',
      displayName: 'Crypto Trader Pro',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🚀 Crypto-Social Integration Demo
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Experience the seamless blend of cryptocurrency payments and social media. 
            Tip creators, unlock premium content, and subscribe—all within your social feed.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-8">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('feed')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'feed'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                📱 Social Feed with Tipping
              </button>
              <button
                onClick={() => setActiveTab('premium')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'premium'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                🔒 Premium Content
              </button>
              <button
                onClick={() => setActiveTab('subscriptions')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'subscriptions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                ⭐ Subscriptions
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                💰 Creator Dashboard
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="p-8">
            {activeTab === 'feed' && (
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
            )}

            {activeTab === 'premium' && (
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
                <div className="mt-8 bg-linear-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-6 max-w-3xl">
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
            )}

            {activeTab === 'subscriptions' && (
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
            )}

            {activeTab === 'dashboard' && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Creator Dashboard</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Comprehensive analytics and earnings management for content creators. 
                  Track your revenue, top supporters, and content performance.
                </p>
                
                <CreatorDashboard />
              </div>
            )}
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-semibold mb-2">Instant Payments</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tips and payments are processed instantly on the blockchain
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="font-semibold mb-2">Secure & Transparent</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              All transactions are recorded on-chain and verifiable
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="font-semibold mb-2">Low Fees</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Direct creator payments with minimal platform fees
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-3">🌐</div>
            <h3 className="font-semibold mb-2">Global Access</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Send and receive payments anywhere in the world
            </p>
          </div>
        </div>

        {/* Technical Stack */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-lg">
          <h2 className="text-2xl font-bold mb-6 text-center">Technology Stack</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="font-semibold mb-3 text-blue-600 dark:text-blue-400">Frontend</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Next.js 16 with React 19</li>
                <li>• TypeScript for type safety</li>
                <li>• wagmi v2 for Web3 integration</li>
                <li>• Tailwind CSS for styling</li>
                <li>• React hooks for state management</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-purple-600 dark:text-purple-400">Smart Contracts</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• Solidity ^0.8.20</li>
                <li>• TokenDistributor for payments</li>
                <li>• VestingVault for subscriptions</li>
                <li>• SocialGraph for relationships</li>
                <li>• Deployed on Base Network</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-3 text-green-600 dark:text-green-400">Integration</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>• useSocialPayments custom hook</li>
                <li>• Real-time balance updates</li>
                <li>• Transaction history tracking</li>
                <li>• Unified activity feed</li>
                <li>• Creator analytics dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
