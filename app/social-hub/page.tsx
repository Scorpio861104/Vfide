'use client';

export const dynamic = 'force-dynamic';

/**
 * Social Hub — consolidated social surface.
 *
 * Previously, social features were scattered across four separate routes:
 *   /social-hub     → community feed
 *   /social-messaging → DMs, circles, groups
 *   /social-payments  → pay friends, activity
 *   /social          → analytics (overview/engagement/growth)
 *
 * This was confusing: a user clicking "Social" expected one place,
 * not four. They are now unified here under four tabs:
 *   Feed       → community posts (was /social-hub)
 *   Messages   → DMs, circles, groups (was /social-messaging)
 *   Pay Friends → social payments & activity (was /social-payments)
 *   Analytics  → community stats (was /social)
 *
 * The old routes redirect here via Next.js redirects in next.config.
 */

import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Hash,
  MessageCircle,
  Banknote,
  BarChart2,
  Sparkles,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';

// Feed tab imports
import { CreatePostCard } from './components/CreatePostCard';
import { PostCard } from './components/PostCard';
import { TrendingSidebar } from './components/TrendingSidebar';

// Messages tab — lazy import from social-messaging components
import { MessagesTab } from '@/app/social-messaging/components/MessagesTab';
import { CirclesTab } from '@/app/social-messaging/components/CirclesTab';
import { GroupsTab } from '@/app/social-messaging/components/GroupsTab';
import { DiscoverTab } from '@/app/social-messaging/components/DiscoverTab';

// Pay Friends tab — from social-payments
import { UnifiedActivityFeed } from '@/components/social/UnifiedActivityFeed';

// Analytics tab — from social
import { OverviewTab as SocialOverviewTab } from '@/app/social/components/OverviewTab';
import { EngagementTab } from '@/app/social/components/EngagementTab';
import { GrowthTab } from '@/app/social/components/GrowthTab';

// ── Tab definitions ───────────────────────────────────────────────────────────

type MainTab = 'feed' | 'messages' | 'pay' | 'analytics';
type FeedFilter = 'all' | 'following' | 'trending';
type MsgTab = 'messages' | 'circles' | 'groups' | 'discover';
type AnalyticsTab = 'overview' | 'engagement' | 'growth';

const MAIN_TABS: { id: MainTab; label: string; icon: React.ElementType }[] = [
  { id: 'feed',      label: 'Feed',        icon: Hash          },
  { id: 'messages',  label: 'Messages',    icon: MessageCircle },
  { id: 'pay',       label: 'Pay Friends', icon: Banknote      },
  { id: 'analytics', label: 'Analytics',   icon: BarChart2     },
];

const FEED_FILTERS: { id: FeedFilter; label: string }[] = [
  { id: 'all',       label: 'All'       },
  { id: 'following', label: 'Following' },
  { id: 'trending',  label: 'Trending'  },
];

const MSG_TABS: { id: MsgTab; label: string }[] = [
  { id: 'messages', label: 'Messages' },
  { id: 'circles',  label: 'Circles'  },
  { id: 'groups',   label: 'Groups'   },
  { id: 'discover', label: 'Discover' },
];

const ANALYTICS_TABS: { id: AnalyticsTab; label: string }[] = [
  { id: 'overview',   label: 'Overview'   },
  { id: 'engagement', label: 'Engagement' },
  { id: 'growth',     label: 'Growth'     },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SocialHubPage() {
  const { isConnected, address } = useAccount();
  const [mainTab, setMainTab]           = useState<MainTab>('feed');
  const [feedFilter, setFeedFilter]     = useState<FeedFilter>('all');
  const [msgTab, setMsgTab]             = useState<MsgTab>('messages');
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>('overview');
  const [posts, setPosts]               = useState<any[]>([]);
  const [postError, setPostError]       = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || mainTab !== 'feed') { setPosts([]); return; }
    fetch('/api/community/posts')
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setPosts(Array.isArray(d.posts) ? d.posts : []))
      .catch(() => setPosts([]));
  }, [isConnected, mainTab]);

  const filteredPosts = useMemo(() => {
    if (feedFilter === 'following') return posts.filter((p) => p.isFollowing);
    if (feedFilter === 'trending')  return [...posts].sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0));
    return posts;
  }, [posts, feedFilter]);

  const handlePost = async (content: string) => {
    setPostError(null);
    const optimisticId = `draft-${Date.now()}`;
    const optimistic = {
      id: optimisticId,
      author: { address: address ?? 'You', name: 'You', avatar: '✨', verified: true, proofScore: 100 },
      author_address: address, content, timestamp: Date.now(),
      likes: 0, comments: 0, shares: 0, views: 0,
      liked: false, bookmarked: false, isFollowing: true, tags: [],
    };
    setPosts((prev) => [optimistic, ...prev]);
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorAddress: address, content }),
      });
      if (!res.ok) {
        const p = await res.json().catch(() => ({}));
        throw new Error(typeof p?.error === 'string' ? p.error : `Post failed (${res.status})`);
      }
      const { post } = await res.json();
      if (post) setPosts((prev) => prev.map((p) => (p.id === optimisticId ? post : p)));
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Failed to publish post');
      setPosts((prev) => prev.filter((p) => p.id !== optimisticId));
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950 md:pt-[3.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Community</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  Social
                </span>
              </h1>
              <p className="text-white/50 text-lg">Feed, messages, payments, and community analytics.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-cyan-400">{posts.length}</div>
                <div className="text-xs text-white/40">Posts</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-violet-400">3.2K</div>
                <div className="text-xs text-white/40">Members</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main tab bar */}
        <div
          className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}
        >
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {MAIN_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMainTab(id)}
                className={mainTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Gate: require wallet */}
        {!isConnected ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card-premium max-w-lg mx-auto text-center py-16 px-8">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="text-cyan-400" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Join the Conversation</h2>
            <p className="text-white/50 mb-8">Connect your wallet to unlock the VFIDE social experience.</p>
            <div className="flex justify-center">
              <VfideConnectButton size="md" />
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ── FEED ── */}
            {mainTab === 'feed' && (
              <motion.div key="feed"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}>
                {/* Feed sub-filters */}
                <div className="flex gap-2 mb-6">
                  {FEED_FILTERS.map(({ id, label }) => (
                    <button key={id} onClick={() => setFeedFilter(id)}
                      className={feedFilter === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                  <div className="space-y-6 lg:col-span-2">
                    <CreatePostCard onPost={handlePost} />
                    <AnimatePresence>
                      {postError && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                          {postError}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {filteredPosts.map((post, i) => (
                      <PostCard key={post.id || i} post={post} onLike={() => {}} onBookmark={() => {}} />
                    ))}
                    {filteredPosts.length === 0 && (
                      <div className="glass-card-premium py-16 text-center">
                        <Users size={48} className="mx-auto mb-4 opacity-30 text-white" />
                        <p className="text-lg text-white/60">Your feed is empty</p>
                        <p className="mt-1 text-sm text-white/30">Follow merchants and users to see activity</p>
                      </div>
                    )}
                  </div>
                  <div className="hidden lg:block">
                    <TrendingSidebar trending={[]} suggested={[]} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── MESSAGES ── */}
            {mainTab === 'messages' && (
              <motion.div key="messages"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}>
                {/* Messages sub-tabs */}
                <div className="flex gap-2 mb-6">
                  {MSG_TABS.map(({ id, label }) => (
                    <button key={id} onClick={() => setMsgTab(id)}
                      className={msgTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                      {label}
                    </button>
                  ))}
                </div>
                {msgTab === 'messages' && <MessagesTab />}
                {msgTab === 'circles'  && <CirclesTab  />}
                {msgTab === 'groups'   && <GroupsTab   />}
                {msgTab === 'discover' && <DiscoverTab />}
              </motion.div>
            )}

            {/* ── PAY FRIENDS ── */}
            {mainTab === 'pay' && (
              <motion.div key="pay"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">Pay Friends</h2>
                  <p className="text-white/40 text-sm">Send crypto to contacts, split bills, and view social payment activity.</p>
                </div>
                <UnifiedActivityFeed />
              </motion.div>
            )}

            {/* ── ANALYTICS ── */}
            {mainTab === 'analytics' && (
              <motion.div key="analytics"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}>
                <div className="flex gap-2 mb-6">
                  {ANALYTICS_TABS.map(({ id, label }) => (
                    <button key={id} onClick={() => setAnalyticsTab(id)}
                      className={analyticsTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                      {label}
                    </button>
                  ))}
                </div>
                {analyticsTab === 'overview'   && <SocialOverviewTab />}
                {analyticsTab === 'engagement' && <EngagementTab />}
                {analyticsTab === 'growth'     && <GrowthTab />}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
      <Footer />
    </div>
  );
}
