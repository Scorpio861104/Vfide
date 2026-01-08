'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount } from 'wagmi';
import SocialNav from '@/components/social/SocialNav';

interface SocialNavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
  badge?: number;
}

export default function SocialHub() {
  const pathname = usePathname();
  const { address } = useAccount();

  const navItems: SocialNavItem[] = [
    { id: 'messaging', label: 'Messages', icon: '💬', path: '/social/messages' },
    { id: 'stories', label: 'Stories', icon: '📱', path: '/social/stories' },
    { id: 'communities', label: 'Communities', icon: '🏛️', path: '/social/communities' },
    { id: 'calls', label: 'Calls', icon: '📞', path: '/social/calls' },
    { id: 'discover', label: 'Discover', icon: '🔍', path: '/social/discover' },
  ];

  const features = [
    {
      title: 'Direct Messages',
      description: 'Encrypted 1-on-1 chats with crypto payments',
      icon: '💬',
      href: '/social/messages',
      color: 'from-[#00F0FF]/20 to-[#00F0FF]/5',
    },
    {
      title: 'Voice & Video',
      description: 'WebRTC peer-to-peer calls',
      icon: '📞',
      href: '/social/calls',
      color: 'from-[#50C878]/20 to-[#50C878]/5',
    },
    {
      title: 'Stories',
      description: '24-hour ephemeral content',
      icon: '📱',
      href: '/social/stories',
      color: 'from-[#FF6B9D]/20 to-[#FF6B9D]/5',
    },
    {
      title: 'Communities',
      description: 'Discord-style servers with channels',
      icon: '🏛️',
      href: '/social/communities',
      color: 'from-[#A78BFA]/20 to-[#A78BFA]/5',
    },
    {
      title: 'Media Sharing',
      description: 'Share images, videos, and files',
      icon: '📸',
      href: '/social/messages',
      color: 'from-[#FFD700]/20 to-[#FFD700]/5',
    },
    {
      title: 'Discover',
      description: 'Find friends and communities',
      icon: '🔍',
      href: '/social/discover',
      color: 'from-[#FF8C42]/20 to-[#FF8C42]/5',
    },
  ];

  const stats = [
    { label: 'Active Users', value: '12.5K', icon: '👥' },
    { label: 'Messages Sent', value: '2.3M', icon: '💬' },
    { label: 'Communities', value: '856', icon: '🏛️' },
    { label: 'Stories Today', value: '4.2K', icon: '📱' },
  ];

  if (!address) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-6xl mb-6">🔐</div>
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-8">
            Sign in with your wallet to access VFIDE Social
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <SocialNav />
      {/* Hero Section */}
      <div className="relative border-b border-gray-800 bg-gradient-to-b from-[#00F0FF]/5 via-transparent to-transparent">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#00F0FF] via-[#FF6B9D] to-[#A78BFA] text-transparent bg-clip-text">
                VFIDE Social
              </span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              The most complete Web3 social platform with crypto payments, NFTs, and true ownership
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 text-center hover:border-[#00F0FF]/50 transition-colors"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Quick Nav */}
          <div className="flex flex-wrap justify-center gap-3">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.path}
                className="px-6 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white hover:border-[#00F0FF] hover:bg-gray-800 transition-all flex items-center gap-2 group"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-semibold">{item.label}</span>
                <span className="text-gray-500 group-hover:text-[#00F0FF] transition-colors">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">Everything You Need</h2>
          <p className="text-gray-400">
            Professional-grade social features with Web3 integration
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="group relative bg-gray-900 border-2 border-gray-800 rounded-xl p-6 hover:border-[#00F0FF] transition-all overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#00F0FF] transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 mb-4">{feature.description}</p>
                <div className="flex items-center gap-2 text-[#00F0FF] font-semibold">
                  <span>Explore</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Why VFIDE Social */}
      <div className="border-t border-gray-800 bg-gradient-to-b from-transparent to-[#00F0FF]/5">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose VFIDE?</h2>
            <p className="text-gray-400">The only social platform built for Web3 from the ground up</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#00F0FF]/10 rounded-full flex items-center justify-center">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Crypto Integrated</h3>
              <p className="text-gray-400">
                Send payments, tips, and rewards directly in messages. No third-party apps needed.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#50C878]/10 rounded-full flex items-center justify-center">
                <span className="text-3xl">🔐</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Privacy First</h3>
              <p className="text-gray-400">
                End-to-end encryption by default. Your data stays yours. No corporate surveillance.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[#FF6B9D]/10 rounded-full flex items-center justify-center">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Feature Complete</h3>
              <p className="text-gray-400">
                Everything major platforms offer, plus Web3 advantages. No compromises.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t border-gray-800">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-gray-400 mb-8">
            Join thousands of users building the future of social on Web3
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/social/messages"
              className="px-8 py-4 bg-[#00F0FF] text-black font-bold rounded-lg hover:bg-[#00F0FF]/80 transition-colors"
            >
              Start Messaging
            </Link>
            <Link
              href="/social-showcase"
              className="px-8 py-4 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition-colors"
            >
              View Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
