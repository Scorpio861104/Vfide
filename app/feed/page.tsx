'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { Rss, ShoppingCart, Shield, PenSquare, ImageIcon, Camera, Sparkles, TrendingUp, Users, X } from 'lucide-react';
import { TrustEventCard, type TrustEvent } from '@/components/social/TrustEventCard';
import { MarketStory, MarketStoriesRow, type MarketStoryData } from '@/components/social/MarketStory';
import { CommunityBoard } from '@/components/social/MerchantReview';
import { ReactionsBar } from '@/components/social/Reactions';
import { generateSeedTrustEvents, generateSeedStories, SEED_TRENDING_MERCHANTS, SEED_TRENDING_PRODUCTS, useSeedData } from '@/lib/data/seed';
import { Footer } from '@/components/layout/Footer';

type FeedFilter = 'all' | 'trust' | 'commerce' | 'social';

interface FeedPost {
  id: string;
  type: 'post' | 'trust_event' | 'market_story' | 'shoppable';
  data: any;
  score: number;
  timestamp: number;
}

export default function FeedPage() {
  const { isConnected } = useAccount();
  const [filter, setFilter] = useState<FeedFilter>('all');
  const [showCompose, setShowCompose] = useState(false);
  const [composeText, setComposeText] = useState('');
  const [showBoard, setShowBoard] = useState(false);

  // Seed data → replaced by real data when community grows
  const seedEvents = useMemo(() => generateSeedTrustEvents(), []);
  const seedStories = useMemo(() => generateSeedStories(), []);

  const { data: marketStories } = useSeedData<MarketStoryData>(
    async () => { const r = await fetch('/api/community/stories'); return r.ok ? (await r.json()).stories : []; },
    seedStories
  );

  // Convert trust events into feed posts
  const posts: FeedPost[] = useMemo(() => {
    return seedEvents.map(e => ({
      id: e.id, type: 'trust_event' as const, data: e, score: e.actor.proofScore, timestamp: e.timestamp,
    }));
  }, [seedEvents]);

  const filtered = useMemo(() => {
    if (filter === 'all') return posts;
    return posts.filter(p => {
      if (filter === 'trust') return p.type === 'trust_event';
      if (filter === 'commerce') return p.type === 'market_story' || p.type === 'shoppable';
      if (filter === 'social') return p.type === 'post';
      return true;
    });
  }, [posts, filter]);

  if (!isConnected) return (
    <div className="min-h-screen bg-zinc-950 pt-20 flex items-center justify-center">
      <div className="text-center"><Rss size={48} className="mx-auto mb-4 text-gray-600" /><p className="text-gray-400">Connect wallet to see the community</p></div>
    </div>
  );

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-20 pb-24 md:pb-8">
        <div className="container mx-auto px-4 max-w-lg">
          <MarketStoriesRow stories={marketStories} onView={() => {}} />

          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1">
              {([
                { id: 'all' as FeedFilter, label: 'All', icon: <Sparkles size={12} /> },
                { id: 'trust' as FeedFilter, label: 'Trust', icon: <Shield size={12} /> },
                { id: 'commerce' as FeedFilter, label: 'Market', icon: <ShoppingCart size={12} /> },
                { id: 'social' as FeedFilter, label: 'Social', icon: <Users size={12} /> },
              ]).map(f => (
                <button key={f.id} onClick={() => setFilter(f.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold ${filter === f.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500'}`}>
                  {f.icon}{f.label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                aria-label="Toggle community board"
                onClick={() => setShowBoard(!showBoard)}
                className="p-2 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10"
              >
                <TrendingUp size={16} />
              </button>
              <button
                type="button"
                aria-label="Compose post"
                onClick={() => setShowCompose(!showCompose)}
                className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400"
              >
                <PenSquare size={16} />
              </button>
            </div>
          </div>

          <AnimatePresence>
            {showCompose && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                <div className="p-3 bg-white/3 border border-white/10 rounded-2xl">
                  <textarea value={composeText} onChange={e => setComposeText(e.target.value)} placeholder="What's happening at the market today?"
                    className="w-full bg-transparent text-white placeholder-gray-600 text-sm resize-none h-20 focus:outline-none" autoFocus />
                  <div className="flex items-center justify-between pt-2 border-t border-white/5">
                    <div className="flex gap-1">
                      <button className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400"><ImageIcon size={16} /></button>
                      <button className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-400"><Camera size={16} /></button>
                      <button className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-400"><ShoppingCart size={16} /></button>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowCompose(false)} className="px-3 py-1.5 text-gray-500 text-xs">Cancel</button>
                      <button disabled={!composeText.trim()} className="px-4 py-1.5 bg-cyan-500/80 text-white rounded-lg text-xs font-bold disabled:opacity-30">Post</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showBoard && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-4">
                <div className="p-4 bg-white/3 border border-white/10 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-white">Community Board</span>
                    <button type="button" aria-label="Close community board" onClick={() => setShowBoard(false)} className="p-1 text-gray-500"><X size={14} /></button>
                  </div>
                  <CommunityBoard merchants={SEED_TRENDING_MERCHANTS} products={SEED_TRENDING_PRODUCTS} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles size={48} className="mx-auto mb-4 text-cyan-400/20" />
              <p className="text-gray-400 mb-2">The feed is quiet</p>
              <p className="text-gray-600 text-xs mb-4">Be the first to post, or start shopping to generate trust events</p>
              <button onClick={() => setShowCompose(true)} className="px-4 py-2 bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl text-sm font-bold">Write a post</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(item => {
                if (item.type === 'trust_event') return <TrustEventCard key={item.id} event={item.data as TrustEvent} />;
                if (item.type === 'market_story') return <MarketStory key={item.id} story={item.data as MarketStoryData} />;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-white/3 border border-white/10 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-xs shrink-0">
                        {item.data?.author?.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-white text-sm font-medium">{item.data?.author?.name || 'Anonymous'}</span>
                          <span className="text-gray-600 text-xs">{new Date(item.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{item.data?.content}</p>
                        {item.data?.image && (
                          <img
                            src={item.data.image}
                            alt={`${item.data?.author?.name || 'Community'} post attachment`}
                            className="mt-2 rounded-xl w-full aspect-video object-cover"
                          />
                        )}
                        <div className="flex items-center gap-4 mt-3">
                          <ReactionsBar reactions={[
                            { emoji: '❤️', count: item.data?.likes || 0, reacted: false },
                            { emoji: '🔥', count: 0, reacted: false },
                            { emoji: '🙌', count: 0, reacted: false },
                          ]} onReact={() => {}} compact />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
