'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import SocialNav from '@/components/social/SocialNav';

export default function DiscoverPage() {
  const { address } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');

  if (!address) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Please connect your wallet</p>
        </div>
      </div>
    );
  }

  const categories = [
    { name: 'Trending', icon: '🔥', count: 234 },
    { name: 'Crypto', icon: '💎', count: 156 },
    { name: 'Gaming', icon: '🎮', count: 89 },
    { name: 'Tech', icon: '💻', count: 112 },
    { name: 'Art', icon: '🎨', count: 67 },
    { name: 'Music', icon: '🎵', count: 45 },
  ];

  const suggestedUsers = [
    { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', name: 'CryptoWhale', followers: '12.5K' },
    { address: '0x1234567890abcdef1234567890abcdef12345678', name: 'NFTArtist', followers: '8.2K' },
    { address: '0xabcdef1234567890abcdef1234567890abcdef12', name: 'DeFiBuilder', followers: '15.1K' },
  ];

  return (
    <div className="min-h-screen bg-black">
      <SocialNav />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/social" className="text-[#00F0FF] hover:underline mb-2 inline-block">
            ← Back to Social Hub
          </Link>
          <h1 className="text-3xl font-bold text-white">Discover</h1>
          <p className="text-gray-400">Find friends, communities, and interesting content</p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for users, communities, or topics..."
            className="w-full px-6 py-4 bg-gray-900 border-2 border-gray-800 rounded-xl text-white focus:outline-none focus:border-[#00F0FF] transition-colors"
          />
        </div>

        {/* Categories */}
        <div className="mb-12">
          <h2 className="text-xl font-bold text-white mb-4">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <button
                key={category.name}
                className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6 hover:border-[#00F0FF] transition-all group text-center"
              >
                <div className="text-4xl mb-2">{category.icon}</div>
                <div className="font-semibold text-white group-hover:text-[#00F0FF] transition-colors">
                  {category.name}
                </div>
                <div className="text-sm text-gray-400">{category.count} communities</div>
              </button>
            ))}
          </div>
        </div>

        {/* Suggested Users */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Suggested for You</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestedUsers.map((user) => (
              <div
                key={user.address}
                className="bg-gray-900 border-2 border-gray-800 rounded-xl p-6 hover:border-[#00F0FF] transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00F0FF]/20 to-[#FF6B9D]/20 flex items-center justify-center text-3xl">
                    👤
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{user.name}</h3>
                    <p className="text-sm text-gray-400">
                      {user.address.slice(0, 6)}...{user.address.slice(-4)}
                    </p>
                    <p className="text-sm text-gray-500">{user.followers} followers</p>
                  </div>
                </div>
                <button className="w-full py-2 bg-[#00F0FF] text-black font-semibold rounded-lg hover:bg-[#00F0FF]/80 transition-colors">
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
