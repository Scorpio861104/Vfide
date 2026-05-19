'use client';

export const dynamic = 'force-dynamic';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { AnimatePresence, motion } from 'framer-motion';
import { Hash, MessageCircle, Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

import { Footer } from '@/components/layout/Footer';

import { CreatePostCard } from './components/CreatePostCard';
import { PostCard } from './components/PostCard';
import { TrendingSidebar } from './components/TrendingSidebar';

type FeedFilter = 'all' | 'following' | 'trending';

const FILTERS: { id: FeedFilter; label: string; icon: React.ElementType }[] = [
  { id: 'all',       label: 'All',       icon: Hash },
  { id: 'following', label: 'Following', icon: Users },
  { id: 'trending',  label: 'Trending',  icon: MessageCircle },
];

export default function SocialHubPage() {
  const { isConnected, address } = useAccount();
  const [posts, setPosts] = useState<any[]>([]);
  const [postError, setPostError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FeedFilter>('all');

  useEffect(() => {
    if (!isConnected) { setPosts([]); return; }
    fetch('/api/community/posts')
      .then((r) => (r.ok ? r.json() : { posts: [] }))
      .then((d) => setPosts(Array.isArray(d.posts) ? d.posts : []))
      .catch(() => setPosts([]));
  }, [isConnected]);

  const filteredPosts = useMemo(() => {
    if (filter === 'following') return posts.filter((p) => p.isFollowing);
    if (filter === 'trending')  return [...posts].sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0));
    return posts;
  }, [filter, posts]);

  const handlePost = async (content: string) => {
    setPostError(null);
    const optimisticId = `draft-${Date.now()}`;
    const optimistic = {
      id: optimisticId, author: { address: address ?? 'You', name: 'You', avatar: '✨', verified: true, proofScore: 100 },
      author_address: address, content, timestamp: Date.now(), likes: 0, comments: 0, shares: 0, views: 0,
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
    <div className="min-h-screen bg-zinc-950 pt-[4.5rem]">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative container mx-auto px-4 max-w-6xl py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />Community Feed</span>
          </div>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                  Social Hub
                </span>
              </h1>
              <p className="text-white/50 text-lg">Follow merchants, share updates, and track community activity.</p>
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

        {/* Filter Bar */}
        <div className="sticky top-[4.5rem] z-30 -mx-4 px-4 py-3 backdrop-blur-xl border-b border-white/5 mb-8"
          style={{ background: 'rgba(9,9,11,0.85)' }}>
          <div className="flex gap-2 overflow-x-auto scrollbar-none">
            {FILTERS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setFilter(id)}
                className={filter === id ? 'tab-pill-active' : 'tab-pill-inactive'}>
                <Icon size={14} />{label}
              </button>
            ))}
          </div>
        </div>

        {!isConnected ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card-premium max-w-lg mx-auto text-center py-16 px-8">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-6">
              <Sparkles className="text-cyan-400" size={28} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Join the Conversation</h2>
            <p className="text-white/50 mb-8">Connect your wallet to unlock the VFIDE social feed and community.</p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </motion.div>
        ) : (
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

              {filteredPosts.map((post, index) => (
                <PostCard key={post.id || index} post={post} onLike={() => {}} onBookmark={() => {}} />
              ))}

              {filteredPosts.length === 0 && (
                <div className="glass-card-premium py-16 text-center">
                  <Users size={48} className="mx-auto mb-4 opacity-30 text-white" />
                  <p className="text-lg text-white/60">Your feed is empty</p>
                  <p className="mt-1 text-sm text-white/30">Follow merchants and users to see activity</p>
                </div>
              )}

              <button type="button" disabled title="Pagination requires cursor support in /api/community/posts."
                className="w-full rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-sm font-semibold text-white/20 cursor-not-allowed">
                Load More Posts
              </button>
            </div>

            <div className="hidden lg:block">
              <TrendingSidebar trending={[]} suggested={[]} />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
