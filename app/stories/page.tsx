'use client';

export const dynamic = 'force-dynamic';

import { Footer } from '@/components/layout/Footer';
import { StoryViewer } from '@/components/social/StoryViewer';
import { StoryCreator } from '@/components/social/StoryCreator';
import { StoryRing } from '@/components/social/StoryRing';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { useAccount } from 'wagmi';
import { VfideConnectButton } from '@/components/crypto/VfideConnectButton';
import { m, AnimatePresence , LazyMotion, domAnimation } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Plus, Camera, Sparkles } from 'lucide-react';
import { Story, isStoryExpired } from '@/lib/storiesSystem';
import { useLocale } from '@/lib/locale/LocaleProvider';

type UserStoriesGroup = {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: Story[];
};

export default function StoriesPage() {
  const { locale } = useLocale();
  void locale;

  const { address, isConnected } = useAccount();
  const [userStories, setUserStories] = useState<UserStoriesGroup[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [viewingStories, setViewingStories] = useState<{ stories: Story[]; index: number } | null>(null);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [_isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let _cancelled = false;
    const fetchStories = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/community/stories');
        if (res.ok) {
          const data = await res.json();
          setUserStories(data.stories || []);
        }
      } catch {
        // API not available yet
      } finally {
        setIsLoading(false);
      }
    };
    fetchStories();
    return () => { _cancelled = true; };
    }, []);

  useEffect(() => {
    if (!address) return;
    const stored = localStorage.getItem(`vfide_my_stories_${address}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMyStories(parsed.filter((s: Story) => !isStoryExpired(s)));
      } catch {}
    }
  }, [address]);

  useEffect(() => {
    if (!address) return;
    localStorage.setItem(`vfide_my_stories_${address}`, JSON.stringify(myStories));
  }, [myStories, address]);

  const handleCreateStory = (story: Story) => setMyStories(prev => [...prev, story]);
  const handleViewStory = (storyId: string) => setViewedStories(prev => new Set(prev).add(storyId));
  const handleReactToStory = (storyId: string, emoji: string) => {
    setUserStories(prev => prev.map(user => ({
      ...user,
      stories: user.stories.map(story =>
        story.id === storyId
          ? { ...story, reactions: [...story.reactions, { userId: address || '', emoji, timestamp: Date.now() }] }
          : story
      ),
    })));
  };
  const hasUnviewedStories = (stories: Story[]) => stories.some(s => !viewedStories.has(s.id) && !isStoryExpired(s));

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] pb-8 relative">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-20 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)' }} />
        <div className="grid-pattern absolute inset-0 opacity-[0.03]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4">
        {/* Header */}
        <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="badge-live"><span className="badge-live-dot" />24h Community</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3">
            <span className="bg-gradient-to-r from-accent via-violet-400 to-pink-400 bg-clip-text text-transparent flex items-center justify-center gap-3">
              <Sparkles size={36} className="text-accent" />Stories
            </span>
          </h1>
          <p className="text-white/50 text-lg max-w-2xl mx-auto">Share moments that disappear in 24 hours. See what the community is up to!</p>
          <div className="flex flex-wrap justify-center gap-2 text-xs uppercase tracking-[0.2em] text-white/30 mt-4">
            <span>Capture</span>
            <span className="text-accent">→</span>
            <span>Share</span>
            <span className="text-accent">→</span>
            <span>Inspire</span>
          </div>
        </m.div>

        {!isConnected ? (
          <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-12">
            <div className="glass-card-premium p-10 max-w-md mx-auto">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-xl font-bold text-white mb-3">Connect Your Wallet</h2>
              <p className="text-white/50 mb-6">Connect your wallet to view and share stories with the community.</p>
              <VfideConnectButton size="md" />
            </div>
          </m.div>
        ) : (
          <div>
            {/* Stories Row */}
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="glass-card-premium p-6 mb-8">
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {/* Add Story */}
                <m.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="flex flex-col items-center gap-2 cursor-pointer shrink-0"
                  onClick={() => setShowCreator(true)}>
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-violet-400/20 border-2 border-dashed border-accent/50 flex items-center justify-center hover:bg-accent/10 transition-colors">
                    <Plus size={28} className="text-accent" />
                  </div>
                  <p className="text-accent text-xs font-medium">Add Story</p>
                </m.div>

                {myStories.length > 0 && (
                  <StoryRing userId={address || ''} userName="Your Story" userAvatar="✨"
                    stories={myStories} hasUnviewed={false}
                    onClick={() => setViewingStories({ stories: myStories, index: 0 })} size="md" />
                )}

                {userStories.map(user => (
                  <StoryRing key={user.userId} userId={user.userId} userName={user.userName}
                    userAvatar={user.userAvatar} stories={user.stories}
                    hasUnviewed={hasUnviewedStories(user.stories)}
                    onClick={() => setViewingStories({ stories: user.stories, index: 0 })} size="md" />
                ))}
              </div>
            </m.div>

            {/* Tips */}
            <m.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid md:grid-cols-3 gap-4 mb-8">
              {[
                { emoji: '✍️', title: 'Text Stories', desc: 'Share thoughts with beautiful gradient backgrounds' },
                { emoji: '📸', title: 'Photo & Video', desc: 'Upload photos and videos with captions' },
                { emoji: '⏰', title: '24 Hour Limit', desc: 'Stories disappear after 24 hours automatically' },
              ].map(tip => (
                <div key={tip.title} className="glass-card-premium p-5 text-center hover:border-white/20 transition-all">
                  <div className="text-4xl mb-3">{tip.emoji}</div>
                  <h3 className="font-semibold text-white mb-2">{tip.title}</h3>
                  <p className="text-white/40 text-sm">{tip.desc}</p>
                </div>
              ))}
            </m.div>

            {userStories.length === 0 && myStories.length === 0 && (
              <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-white mb-2">No Stories Yet</h3>
                <p className="text-white/40 mb-6">Be the first to share a story with the community!</p>
                <button onClick={() => setShowCreator(true)}
                  className="btn-premium-primary inline-flex items-center gap-2">
                  <Camera size={18} />Create Your First Story
                </button>
              </m.div>
            )}
          </div>
        )}

        {/* Modals */}
        <AnimatePresence>
          {showCreator && address && (
            <ErrorBoundary>
              <StoryCreator onClose={() => setShowCreator(false)} onCreate={handleCreateStory}
                userAddress={address} userName={address.slice(0, 6) + '...' + address.slice(-4)} userAvatar="✨" />
            </ErrorBoundary>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {viewingStories && address && (
            <ErrorBoundary>
              <StoryViewer stories={viewingStories.stories} initialIndex={viewingStories.index}
                onClose={() => setViewingStories(null)} onView={handleViewStory}
                onReact={handleReactToStory} userAddress={address} />
            </ErrorBoundary>
          )}
        </AnimatePresence>
      </div>

      <Footer />
    </div>
    </LazyMotion>
  );
}
