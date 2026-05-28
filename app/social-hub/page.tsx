'use client';

export const dynamic = 'force-dynamic';

// TYPE-2: Explicit React type import for React.ElementType usage in MAIN_TABS definition
import type React from 'react';

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
import { AnimatePresence, m } from 'framer-motion';
import {
  Hash,
  MessageCircle,
  Banknote,
  BarChart2,
  Sparkles,
  Users,
  Camera,
} from 'lucide-react';
import { useEffect, useMemo, useState, Suspense} from 'react';
import { useSearchParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { Footer } from '@/components/layout/Footer';

// Feed tab imports
import { CreatePostCard } from './components/CreatePostCard';
// TYPE-1: Import exported SocialPost type for proper useState typing
import { PostCard, type SocialPost } from './components/PostCard';
import { TrendingSidebar } from './components/TrendingSidebar';

// Messages tab — lazy import from social-messaging components
import { MessagesTab } from '@/app/social-messaging/components/MessagesTab';
import { CirclesTab } from '@/app/social-messaging/components/CirclesTab';
import { GroupsTab } from '@/app/social-messaging/components/GroupsTab';
import { DiscoverTab } from '@/app/social-messaging/components/DiscoverTab';

// Pay Friends tab — from social-payments
import { UnifiedActivityFeed } from '@/components/social/UnifiedActivityFeed';


// Stories tab — from social/stories components
import nextDynamic from 'next/dynamic';
const StoriesContent = nextDynamic(
  () => import('@/app/stories/components/StoriesContent'),
  { loading: () => <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" /></div>, ssr: false }
);

// Analytics tab — from social
import { OverviewTab as SocialOverviewTab } from '@/app/social/components/OverviewTab';
import { EngagementTab } from '@/app/social/components/EngagementTab';
import { GrowthTab } from '@/app/social/components/GrowthTab';

// ── Tab definitions ───────────────────────────────────────────────────────────

type MainTab = 'feed' | 'stories' | 'messages' | 'pay' | 'analytics';
type FeedFilter = 'all' | 'following' | 'trending';
type MsgTab = 'messages' | 'circles' | 'groups' | 'discover';
type AnalyticsTab = 'overview' | 'engagement' | 'growth';

const MAIN_TABS: { id: MainTab; label: string; icon: React.ElementType }[] = [
  { id: 'feed',      label: 'Feed',        icon: Hash          },
  { id: 'stories',   label: 'Stories',     icon: Camera        },
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

// UX-1: Valid tab IDs for type-safe URL parsing
const VALID_MAIN_TABS = new Set<MainTab>(['feed', 'stories', 'messages', 'pay', 'analytics']);

function SocialHubPageInner() {
  const { isConnected, address } = useAccount();
  // UX-1: Read initial tab from URL search params so ?tab= links work correctly
  // and browser Back/Forward preserves the active tab context
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as MainTab | null;

  const [mainTab, setMainTab]           = useState<MainTab>(
    tabParam && VALID_MAIN_TABS.has(tabParam) ? tabParam : 'feed'
  );
  const [feedFilter, setFeedFilter]     = useState<FeedFilter>('all');
  const [msgTab, setMsgTab]             = useState<MsgTab>('messages');
  const [analyticsTab, setAnalyticsTab] = useState<AnalyticsTab>('overview');
  const [posts, setPosts]               = useState<SocialPost[]>([]);
  const [postError, setPostError]       = useState<string | null>(null);
  // UX-4: Track posts loading state so we show a skeleton instead of flashing "0 posts"
  const [postsLoading, setPostsLoading] = useState(false);

  useEffect(() => {
    if (!isConnected || mainTab !== 'feed') { setPosts([]); setPostsLoading(false); return; }
    // UX-4: Set loading=true before fetch so the count shows skeleton not "0"
    setPostsLoading(true);
    fetch('/api/community/posts')
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setPosts(Array.isArray(d.posts) ? d.posts : []))
      .catch(() => setPosts([]))
      .finally(() => setPostsLoading(false));
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
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Community</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-accent via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  Social
                </span>
              </h1>
              <p className="text-white/50 text-lg">Feed, messages, payments, and community analytics.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="analytics-card text-center px-5 py-3">
                {/* UX-4: Show skeleton while posts are loading to avoid flashing "0" */}
                {postsLoading ? (
                  <div className="h-7 w-10 mx-auto rounded bg-white/10 animate-pulse" />
                ) : (
                  <div className="text-xl font-bold text-accent">{posts.length}</div>
                )}
                <div className="text-xs text-white/40">Posts</div>
              </div>
              <div className="analytics-card text-center px-5 py-3">
                <div className="text-xl font-bold text-violet-400">3.2K</div>
                <div className="text-xs text-white/40">Members</div>
              </div>
            </div>
          </div>
        </m.div>

        {/* Main tab bar */}
        <div
          className="sticky top-7 md:top-[5.25rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}
        >
          {/* A11Y-1: role=tablist so AT announces this as a tab widget */}
          <div role="tablist" aria-label="Social Hub sections" className="flex gap-2 overflow-x-auto scrollbar-hide">
            {MAIN_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMainTab(id)}
                role="tab"
                aria-selected={mainTab === id}
                aria-controls={"social-panel-" + id}
                id={"social-tab-" + id}
                className={mainTab === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        {/* Gate: require wallet */}
        {!isConnected ? (
          <m.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card-premium max-w-lg mx-auto text-center py-16 px-8">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="text-accent" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Join the Conversation</h2>
            <p className="text-white/50 mb-8">Connect your wallet to unlock the VFIDE social experience.</p>
            <div className="flex justify-center">
              <VfideConnectButton size="md" />
            </div>
          </m.div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ── FEED ── */}
            {mainTab === 'feed' && (
              <m.div key="feed"
                role="tabpanel" id="social-panel-feed" aria-labelledby="social-tab-feed"
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
                        <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                          {postError}
                        </m.div>
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
              </m.div>
            )}

            {/* ── MESSAGES ── */}
            {mainTab === 'messages' && (
              <m.div key="messages"
                role="tabpanel" id="social-panel-messages" aria-labelledby="social-tab-messages"
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
              </m.div>
            )}

            {/* ── PAY FRIENDS ── */}
            {mainTab === 'pay' && (
              <m.div key="pay"
                role="tabpanel" id="social-panel-pay" aria-labelledby="social-tab-pay"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-white mb-1">Pay Friends</h2>
                  <p className="text-white/40 text-sm">Send crypto to contacts, split bills, and view social payment activity.</p>
                </div>
                <UnifiedActivityFeed />
              </m.div>
            )}

            {/* ── ANALYTICS ── */}
            {mainTab === 'stories' && (
              <m.div key="stories"
                role="tabpanel" id="social-panel-stories" aria-labelledby="social-tab-stories"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}>
                <StoriesContent />
              </m.div>
            )}
            {mainTab === 'analytics' && (
              <m.div key="analytics"
                role="tabpanel" id="social-panel-analytics" aria-labelledby="social-tab-analytics"
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
              </m.div>
            )}
          </AnimatePresence>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default function SocialHubPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <SocialHubPageInner />
    </Suspense>
  );
}
