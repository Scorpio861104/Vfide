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
import { useEffect, useMemo, useState } from 'react';

type SocialPaymentEvent = {
  event_data?: unknown;
  eventData?: unknown;
  timestamp?: string;
};

type TopTipper = {
  name: string;
  amount: number;
  avatar?: string;
};

type TipActivity = {
  from: string;
  amount: number;
  time: string;
};

type ContentSale = {
  item: string;
  buyer: string;
  amount: number;
  time: string;
};

const parseEventData = (data: unknown) => {
  if (!data) return {} as Record<string, unknown>;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  }
  return typeof data === 'object' ? (data as Record<string, unknown>) : {};
};

const parseAmount = (value: unknown) => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) ? numeric : 0;
  }
  return 0;
};

const formatAmount = (value: number) => `${value.toFixed(2)} VFIDE`;

const formatRelativeTime = (timestamp?: string) => {
  if (!timestamp) return 'recently';
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return 'recently';
  const seconds = Math.floor((Date.now() - time) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function SocialPaymentsDashboard() {
  const { address: _address, isConnected: _isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'feed' | 'activity' | 'earnings'>('feed');
  const [events, setEvents] = useState<SocialPaymentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchEvents = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch('/api/analytics?eventType=social_interaction&limit=200');
        if (!response.ok) throw new Error('Failed to load social activity');
        const data = await response.json();
        if (isMounted) {
          setEvents(Array.isArray(data.events) ? data.events : []);
        }
      } catch {
        if (isMounted) {
          setEvents([]);
          setLoadError('Unable to load social payment analytics.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  const { stats, topTippers, tipHistory, contentSales } = useMemo(() => {
    let tipsReceived = 0;
    let tipsSent = 0;
    let contentSalesCount = 0;
    let contentRevenue = 0;
    let endorsementRewards = 0;

    const tippers: Record<string, TopTipper> = {};
    const tipItems: TipActivity[] = [];
    const saleItems: ContentSale[] = [];

    events.forEach((event) => {
      const data = parseEventData(event.event_data ?? event.eventData);
      const actionRaw = data.action ?? data.type ?? data.event ?? '';
      const action = typeof actionRaw === 'string' ? actionRaw.toLowerCase() : '';
      const amount = parseAmount(data.amount ?? data.value ?? data.tipAmount ?? 0);
      const timestamp = typeof event.timestamp === 'string' ? event.timestamp : undefined;

      if (action.includes('tip')) {
        const from = (data.from ?? data.sender ?? data.user ?? 'Supporter') as string;
        const direction = action.includes('sent') ? 'sent' : action.includes('receive') || action.includes('received') ? 'received' : 'received';
        if (direction === 'received') tipsReceived += amount;
        if (direction === 'sent') tipsSent += amount;

        if (direction === 'received') {
          tipItems.push({
            from,
            amount,
            time: formatRelativeTime(timestamp),
          });

          const key = from || 'Supporter';
          if (!tippers[key]) {
            tippers[key] = { name: key, amount: 0, avatar: data.avatar as string | undefined };
          }
          tippers[key].amount += amount;
        }
      }

      if (action.includes('content') || action.includes('sale') || action.includes('purchase')) {
        const item = (data.item ?? data.content ?? 'Content') as string;
        const buyer = (data.buyer ?? data.to ?? data.user ?? 'Buyer') as string;
        contentSalesCount += 1;
        contentRevenue += amount;
        saleItems.push({
          item,
          buyer,
          amount,
          time: formatRelativeTime(timestamp),
        });
      }

      if (action.includes('endorsement')) {
        endorsementRewards += 1;
      }
    });

    const topTipperList = Object.values(tippers)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    return {
      stats: {
        totalTipsReceived: tipsReceived,
        totalTipsSent: tipsSent,
        contentSales: contentSalesCount,
        totalContentRevenue: contentRevenue,
        endorsementRewards,
      },
      topTippers: topTipperList,
      tipHistory: tipItems.slice(0, 3),
      contentSales: saleItems.slice(0, 3),
    };
  }, [events]);

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
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <ArrowDownLeft className="w-8 h-8 text-green-400" />
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100 mb-1">
              {formatAmount(stats.totalTipsReceived)}
            </div>
            <div className="text-sm text-green-400">Tips Received</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <ArrowUpRight className="w-8 h-8 text-purple-400" />
              <Heart className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100 mb-1">
              {formatAmount(stats.totalTipsSent)}
            </div>
            <div className="text-sm text-purple-400">Tips Sent</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Lock className="w-8 h-8 text-blue-400" />
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100 mb-1">
              {stats.contentSales}
            </div>
            <div className="text-sm text-blue-400">Content Sales</div>
            <div className="text-xs text-zinc-500 mt-1">
              {formatAmount(stats.totalContentRevenue)} earned
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 text-yellow-400" />
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100 mb-1">
              {stats.endorsementRewards}
            </div>
            <div className="text-sm text-yellow-400">Endorsement Rewards</div>
          </motion.div>
        </div>

        {/* Top Tippers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-xl"
        >
          <h3 className="font-bold text-zinc-100 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            Top Supporters
          </h3>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-sm text-zinc-400">Loading supporters...</div>
            ) : loadError ? (
              <div className="text-sm text-red-400">{loadError}</div>
            ) : topTippers.length === 0 ? (
              <div className="text-sm text-zinc-400">No supporters yet.</div>
            ) : (
              topTippers.map((tipper) => (
                <div
                  key={tipper.name}
                  className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg">
                      {tipper.avatar || '👤'}
                    </div>
                    <span className="font-medium text-zinc-100">{tipper.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-purple-400" />
                    <span className="font-bold text-purple-400">{formatAmount(tipper.amount)}</span>
                  </div>
                </div>
              ))
            )}
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
                  {isLoading ? (
                    <div className="text-sm text-zinc-400">Loading tips...</div>
                  ) : loadError ? (
                    <div className="text-sm text-red-400">{loadError}</div>
                  ) : tipHistory.length === 0 ? (
                    <div className="text-sm text-zinc-400">No tips received yet.</div>
                  ) : (
                    tipHistory.map((tip, idx) => (
                      <div
                        key={`${tip.from}-${idx}`}
                        className="p-3 bg-zinc-950 rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <div className="font-medium text-zinc-100">{tip.from}</div>
                          <div className="text-xs text-zinc-500">{tip.time}</div>
                        </div>
                        <div className="font-bold text-green-400">+{formatAmount(tip.amount)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Content Sales */}
              <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                <h3 className="font-bold text-zinc-100 mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-400" />
                  Content Sales
                </h3>
                <div className="space-y-3">
                  {isLoading ? (
                    <div className="text-sm text-zinc-400">Loading sales...</div>
                  ) : loadError ? (
                    <div className="text-sm text-red-400">{loadError}</div>
                  ) : contentSales.length === 0 ? (
                    <div className="text-sm text-zinc-400">No content sales yet.</div>
                  ) : (
                    contentSales.map((sale, idx) => (
                      <div
                        key={`${sale.item}-${idx}`}
                        className="p-3 bg-zinc-950 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-medium text-zinc-100">{sale.item}</div>
                          <div className="font-bold text-blue-400">+{formatAmount(sale.amount)}</div>
                        </div>
                        <div className="text-xs text-zinc-500">
                          to {sale.buyer} • {sale.time}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
