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

function shortenAddress(value?: string) {
  return value ? `${value.slice(0, 6)}…${value.slice(-4)}` : 'Guest mode';
}

export default function SocialPaymentsDashboard() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'feed' | 'activity' | 'earnings'>('feed');
  const [activitySnapshot, setActivitySnapshot] = useState<{
    received: number;
    sent: number;
    sales: number;
    rewards: number;
    supporters: string[];
  }>({
    received: 0,
    sent: 0,
    sales: 0,
    rewards: 0,
    supporters: [],
  });

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshot() {
      const candidateUrls = address
        ? [`/api/activities?userAddress=${address}&limit=50`, '/api/activities?limit=50']
        : ['/api/activities?limit=50'];

      try {
        let rows: Array<{
          activity_type?: string;
          type?: string;
          user_username?: string;
          user_address?: string;
          title?: string;
          description?: string;
        }> = [];

        for (const candidateUrl of candidateUrls) {
          const response = await fetch(candidateUrl);
          if (!response.ok) {
            continue;
          }

          const data = await response.json();
          rows = Array.isArray(data.activities) ? data.activities : [];
          break;
        }

        if (cancelled) {
          return;
        }

        const received = rows.filter((row) => /receive|tip|reward/i.test(String(row.activity_type ?? row.type ?? ''))).length;
        const sent = rows.filter((row) => /send|payment|transfer/i.test(String(row.activity_type ?? row.type ?? ''))).length;
        const sales = rows.filter((row) => /sale|unlock|subscription|purchase|checkout/i.test(String(row.activity_type ?? row.type ?? ''))).length;
        const rewards = rows.filter((row) => /reward|endorse|badge|proof/i.test(String(row.activity_type ?? row.type ?? ''))).length;
        const supporters = Array.from(
          new Set(
            rows
              .map((row) => row.user_username ?? shortenAddress(row.user_address))
              .filter((value): value is string => Boolean(value))
          )
        ).slice(0, 3);

        setActivitySnapshot({
          received,
          sent,
          sales,
          rewards,
          supporters,
        });
      } catch {
        if (!cancelled) {
          setActivitySnapshot({ received: 0, sent: 0, sales: 0, rewards: 0, supporters: [] });
        }
      }
    }

    void loadSnapshot();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const statCards = useMemo(() => ([
    {
      label: 'Tips Received',
      value: isConnected ? `${activitySnapshot.received} recent events` : 'Connect wallet',
      helper: isConnected
        ? `${activitySnapshot.received} support events were detected in the latest activity rail.`
        : 'Connect to unlock direct creator support.',
      cardClass: 'from-green-500/10 to-emerald-500/10 border-green-500/20',
      labelClass: 'text-green-400',
      Icon: ArrowDownLeft,
      AccentIcon: TrendingUp,
    },
    {
      label: 'Tips Sent',
      value: isConnected ? `${activitySnapshot.sent} outbound actions` : 'Wallet required',
      helper: isConnected
        ? 'Recent sends and payment intents are now summarized from the live activity rail.'
        : 'Send appreciation straight from posts, stories, and creator profiles.',
      cardClass: 'from-purple-500/10 to-blue-500/10 border-purple-500/20',
      labelClass: 'text-purple-400',
      Icon: ArrowUpRight,
      AccentIcon: Heart,
    },
    {
      label: 'Content Sales',
      value: activitySnapshot.sales > 0 ? `${activitySnapshot.sales} live settlements` : 'Awaiting new checkout activity',
      helper: 'Premium posts, unlocks, and merchant checkouts settle through the same payment rail.',
      cardClass: 'from-blue-500/10 to-cyan-500/10 border-blue-500/20',
      labelClass: 'text-blue-400',
      Icon: Lock,
      AccentIcon: DollarSign,
    },
    {
      label: 'Endorsement Rewards',
      value: activitySnapshot.rewards > 0 ? `${activitySnapshot.rewards} reward signals` : 'ProofScore-linked',
      helper: 'Reputation events and rewards stay visible alongside social engagement.',
      cardClass: 'from-yellow-500/10 to-orange-500/10 border-yellow-500/20',
      labelClass: 'text-yellow-400',
      Icon: Award,
      AccentIcon: Users,
    },
  ]), [activitySnapshot.received, activitySnapshot.rewards, activitySnapshot.sales, activitySnapshot.sent, isConnected]);

  const supporterHighlights = useMemo(() => ([
    {
      name: 'Creator circle',
      note: activitySnapshot.supporters[0]
        ? `${activitySnapshot.supporters[0]} and other repeat backers are surfacing from the latest activity snapshot.`
        : 'Repeat backers, unlock buyers, and returning tippers surface here first.',
      status: isConnected ? 'Wallet-personalized' : 'Community snapshot',
    },
    {
      name: 'Merchant buyers',
      note: activitySnapshot.sales > 0
        ? `${activitySnapshot.sales} checkout or unlock events are currently linked into the same settlement rail.`
        : 'Checkout supporters and product unlocks share the same settlement rail.',
      status: 'Commerce-linked',
    },
    {
      name: 'Reward pool',
      note: activitySnapshot.rewards > 0
        ? `${activitySnapshot.rewards} reward-linked events are now visible next to payout activity.`
        : 'ProofScore boosts and endorsement rewards stay visible next to payout activity.',
      status: 'Rewards-aware',
    },
  ]), [activitySnapshot.rewards, activitySnapshot.sales, activitySnapshot.supporters, isConnected]);

  const earningsPanels = useMemo(() => ([
    {
      title: 'Recent Tips Received',
      icon: ArrowDownLeft,
      iconClass: 'text-green-400',
      copy: activitySnapshot.received > 0
        ? `${activitySnapshot.received} recent support events are currently flowing through the unified activity feed.`
        : 'Track incoming support, thank-you payments, and social transfers from the unified activity feed.',
    },
    {
      title: 'Content Sales',
      icon: Lock,
      iconClass: 'text-blue-400',
      copy: activitySnapshot.sales > 0
        ? `${activitySnapshot.sales} recent sales or unlock settlements are already syncing through the same payment surface.`
        : 'Creator unlocks, subscriptions, and merchant receipts settle through the same VFIDE payment surface.',
    },
  ]), [activitySnapshot.received, activitySnapshot.sales]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-zinc-100">Social Payments</h1>
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mt-1">{shortenAddress(address)} · {isConnected ? 'wallet connected' : 'browse mode'}</p>
            </div>
          </div>
          <p className="text-zinc-400">
            Send appreciation, monitor earnings, and keep creator payouts tied to the same social activity stream.
          </p>
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-wider text-zinc-500 mt-3">
            <span>Tip</span>
            <span className="text-purple-400">→</span>
            <span>Earn</span>
            <span className="text-purple-400">→</span>
            <span>Grow</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, index) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              className={`p-6 bg-gradient-to-br border rounded-xl ring-effect ${card.cardClass}`}
            >
              <div className="flex items-center justify-between mb-4">
                <card.Icon className={`w-8 h-8 ${card.labelClass}`} />
                <card.AccentIcon className={`w-5 h-5 ${card.labelClass}`} />
              </div>
              <div className="text-2xl font-bold text-zinc-100 mb-1">{card.value}</div>
              <div className={`text-sm ${card.labelClass}`}>{card.label}</div>
              <div className="text-xs text-zinc-500 mt-2">{card.helper}</div>
            </motion.div>
          ))}
        </div>

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
          <div className="grid gap-3 md:grid-cols-3">
            {supporterHighlights.map((item) => (
              <div key={item.name} className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-zinc-100">{item.name}</div>
                  <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-purple-300">
                    {item.status}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{item.note}</p>
              </div>
            ))}
          </div>
        </motion.div>

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

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'feed' && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <SocialFeed onPostCreated={() => { /* Post created */ }} />
            </div>
          )}

          {activeTab === 'activity' && (
            <UnifiedActivityFeed filter="all" limit={50} />
          )}

          {activeTab === 'earnings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {earningsPanels.map((panel) => (
                <div key={panel.title} className="p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                  <h3 className="font-bold text-zinc-100 mb-4 flex items-center gap-2">
                    <panel.icon className={`w-5 h-5 ${panel.iconClass}`} />
                    {panel.title}
                  </h3>
                  <div className="p-3 bg-zinc-950 rounded-lg text-sm text-zinc-400">
                    {panel.copy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
