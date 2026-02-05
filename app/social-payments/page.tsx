/**
 * Social Payments Dashboard
 * 
 * Unified view of social and financial activities.
 * Seamlessly blends cryptocurrency payments with social interactions.
 */

'use client';

import { SocialFeed } from '@/components/social/SocialFeed';
import { UnifiedActivityFeed } from '@/components/social/UnifiedActivityFeed';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import {
    ArrowDownLeft,
    ArrowUpRight,
    Award,
    DollarSign,
    Heart,
    Lock,
    MessageCircle,
    Sparkles,
    TrendingUp,
    Users,
} from 'lucide-react';
import { useState } from 'react';

export default function SocialPaymentsDashboard() {
  const { address: _address, isConnected: _isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'feed' | 'activity' | 'earnings'>('feed');

  // Mock stats for demo
  const mockStats = {
    totalTipsReceived: '124.5 VFIDE',
    totalTipsSent: '89.2 VFIDE',
    contentSales: 12,
    totalContentRevenue: '340 VFIDE',
    endorsementRewards: 8,
    topTippers: [
      { name: 'Alex Rivera', amount: '25 VFIDE', avatar: '👨‍💼' },
      { name: 'Sara Chen', amount: '18 VFIDE', avatar: '👩‍🎤' },
      { name: 'John Park', amount: '15 VFIDE', avatar: '👨‍💻' },
    ],
  };

  return (
    <div className="min-h-screen bg-zinc-950">

      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-24 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">Social Payments</h1>
          </div>
          <p className="text-zinc-400">
            Seamlessly integrated cryptocurrency and social interactions
          </p>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wider text-zinc-500 mt-3">
            <span>Tip</span>
            <span className="text-purple-400">→</span>
            <span>Earn</span>
            <span className="text-purple-400">→</span>
            <span>Grow</span>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl ring-effect"
          >
            <div className="flex items-center justify-between mb-4">
              <ArrowDownLeft className="w-8 h-8 text-green-400" />
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100 mb-1">
              {mockStats.totalTipsReceived}
            </div>
            <div className="text-sm text-green-400">Tips Received</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl ring-effect"
          >
            <div className="flex items-center justify-between mb-4">
              <ArrowUpRight className="w-8 h-8 text-purple-400" />
              <Heart className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100 mb-1">
              {mockStats.totalTipsSent}
            </div>
            <div className="text-sm text-purple-400">Tips Sent</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl ring-effect"
          >
            <div className="flex items-center justify-between mb-4">
              <Lock className="w-8 h-8 text-blue-400" />
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100 mb-1">
              {mockStats.contentSales}
            </div>
            <div className="text-sm text-blue-400">Content Sales</div>
            <div className="text-xs text-zinc-500 mt-1">
              {mockStats.totalContentRevenue} earned
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl ring-effect"
          >
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 text-yellow-400" />
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100 mb-1">
              {mockStats.endorsementRewards}
            </div>
            <div className="text-sm text-yellow-400">Endorsement Rewards</div>
          </motion.div>
        </div>

        {/* Top Tippers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-xl ring-effect"
        >
          <h3 className="font-bold text-zinc-100 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Top Supporters
          </h3>
          <div className="space-y-3">
            {mockStats.topTippers.map((tipper, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg">
                    {tipper.avatar}
                  </div>
                  <span className="font-medium text-zinc-100">{tipper.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-purple-400">{tipper.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800">
          {[
            { id: 'feed' as const, label: 'Social Feed', icon: MessageCircle },
            { id: 'activity' as const, label: 'All Activity', icon: TrendingUp },
            { id: 'earnings' as const, label: 'Earnings', icon: DollarSign },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 font-semibold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-purple-400 border-purple-500'
                  : 'text-zinc-500 border-transparent hover:text-zinc-400'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'feed' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <SocialFeed onPostCreated={() => {/* Post created */}} />
            </div>
          )}

          {activeTab === 'activity' && (
            <UnifiedActivityFeed filter="all" limit={50} />
          )}

          {activeTab === 'earnings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tip History */}
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                <h3 className="font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <ArrowDownLeft className="w-5 h-5 text-green-400" />
                  Recent Tips Received
                </h3>
                <div className="space-y-3">
                  {[
                    { from: 'Alex Rivera', amount: '5 VFIDE', time: '2h ago' },
                    { from: 'Sara Chen', amount: '3 VFIDE', time: '5h ago' },
                    { from: 'John Park', amount: '2.5 VFIDE', time: '8h ago' },
                  ].map((tip, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-950 rounded-lg flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-zinc-100">{tip.from}</div>
                        <div className="text-xs text-zinc-500">{tip.time}</div>
                      </div>
                      <div className="font-bold text-green-400">+{tip.amount}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Content Sales */}
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                <h3 className="font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-400" />
                  Content Sales
                </h3>
                <div className="space-y-3">
                  {[
                    { item: 'Premium Article', buyer: 'Sara Chen', amount: '10 VFIDE', time: '1d ago' },
                    { item: 'Group Access', buyer: 'John Park', amount: '15 VFIDE', time: '2d ago' },
                    { item: 'Premium Post', buyer: 'Emma Wilson', amount: '5 VFIDE', time: '3d ago' },
                  ].map((sale, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-zinc-950 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-medium text-zinc-100">{sale.item}</div>
                        <div className="font-bold text-blue-400">+{sale.amount}</div>
                      </div>
                      <div className="text-xs text-zinc-500">
                        to {sale.buyer} • {sale.time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
