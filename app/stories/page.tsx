'use client';

import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import { StoryViewer } from '@/components/social/StoryViewer';
import { StoryCreator } from '@/components/social/StoryCreator';
import { StoryRing } from '@/components/social/StoryRing';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Plus, Camera } from 'lucide-react';
import { Story, isStoryExpired } from '@/lib/storiesSystem';

// Mock users with stories
const _mockUserStories: { userId: string; userName: string; userAvatar: string; stories: Story[] }[] = [
  {
    userId: '0x1234...5678',
    userName: 'alex_finance',
    userAvatar: '👨‍💼',
    stories: [
      {
        id: 's1',
        userId: '0x1234...5678',
        userName: 'alex_finance',
        userAvatar: '👨‍💼',
        type: 'text',
        content: 'Just hit 10,000 ProofScore! 🚀 The grind pays off!',
        backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        textColor: '#FFFFFF',
        createdAt: Date.now() - 2 * 60 * 60 * 1000,
        expiresAt: Date.now() + 22 * 60 * 60 * 1000,
        viewedBy: [],
        reactions: [{ userId: '0x2', emoji: '🔥', timestamp: Date.now() }],
      },
      {
        id: 's2',
        userId: '0x1234...5678',
        userName: 'alex_finance',
        userAvatar: '👨‍💼',
        type: 'text',
        content: 'Building the future of DeFi one transaction at a time 💪',
        backgroundColor: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        textColor: '#FFFFFF',
        createdAt: Date.now() - 1 * 60 * 60 * 1000,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000,
        viewedBy: [],
        reactions: [],
      },
    ],
  },
  {
    userId: '0x2345...6789',
    userName: 'sara_merchant',
    userAvatar: '👩‍🎤',
    stories: [
      {
        id: 's3',
        userId: '0x2345...6789',
        userName: 'sara_merchant',
        userAvatar: '👩‍🎤',
        type: 'text',
        content: 'New milestone: 500 payments processed! 🎉 Zero fees means happy customers!',
        backgroundColor: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        textColor: '#FFFFFF',
        createdAt: Date.now() - 4 * 60 * 60 * 1000,
        expiresAt: Date.now() + 20 * 60 * 60 * 1000,
        viewedBy: [],
        reactions: [
          { userId: '0x1', emoji: '👏', timestamp: Date.now() },
          { userId: '0x3', emoji: '❤️', timestamp: Date.now() },
        ],
      },
    ],
  },
  {
    userId: '0x3456...7890',
    userName: 'dev_john',
    userAvatar: '👨‍💻',
    stories: [
      {
        id: 's4',
        userId: '0x3456...7890',
        userName: 'dev_john',
        userAvatar: '👨‍💻',
        type: 'text',
        content: 'Pro tip: Always check your vault before big transfers! 🔐',
        backgroundColor: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
        textColor: '#FFFFFF',
        createdAt: Date.now() - 6 * 60 * 60 * 1000,
        expiresAt: Date.now() + 18 * 60 * 60 * 1000,
        viewedBy: [],
        reactions: [],
      },
    ],
  },
  {
    userId: '0x4567...8901',
    userName: 'luna_dev',
    userAvatar: '🌙',
    stories: [
      {
        id: 's5',
        userId: '0x4567...8901',
        userName: 'luna_dev',
        userAvatar: '🌙',
        type: 'text',
        content: 'Governance proposal passed! The community has spoken 🗳️',
        backgroundColor: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        textColor: '#FFFFFF',
        createdAt: Date.now() - 8 * 60 * 60 * 1000,
        expiresAt: Date.now() + 16 * 60 * 60 * 1000,
        viewedBy: [],
        reactions: [{ userId: '0x1', emoji: '🔥', timestamp: Date.now() }],
      },
    ],
  },
  {
    userId: '0x5678...9012',
    userName: 'crypto_whale',
    userAvatar: '🐋',
    stories: [
      {
        id: 's6',
        userId: '0x5678...9012',
        userName: 'crypto_whale',
        userAvatar: '🐋',
        type: 'text',
        content: 'Market update: Stay calm and HODL 📈',
        backgroundColor: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        textColor: '#333333',
        createdAt: Date.now() - 3 * 60 * 60 * 1000,
        expiresAt: Date.now() + 21 * 60 * 60 * 1000,
        viewedBy: [],
        reactions: [],
      },
    ],
  },
];

export default function StoriesPage() {
  const { address, isConnected } = useAccount();
  const [userStories, setUserStories] = useState<typeof _mockUserStories>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [showCreator, setShowCreator] = useState(false);
  const [viewingStories, setViewingStories] = useState<{ stories: Story[]; index: number } | null>(null);
  const [viewedStories, setViewedStories] = useState<Set<string>>(new Set());
  const [_isLoading, setIsLoading] = useState(true);

  // Fetch stories from API
  useEffect(() => {
    const fetchStories = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/community/stories');
        if (res.ok) {
          const data = await res.json();
          setUserStories(data.stories || []);
        }
      } catch {
        // API not available yet - use empty state
      } finally {
        setIsLoading(false);
      }
    };
    fetchStories();
  }, []);

  // Load my stories from localStorage
  useEffect(() => {
    if (!address) return;
    const stored = localStorage.getItem(`vfide_my_stories_${address}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Filter out expired stories
        const active = parsed.filter((s: Story) => !isStoryExpired(s));
        setMyStories(active);
      } catch {
      }
    }
  }, [address]);

  // Save my stories to localStorage
  useEffect(() => {
    if (!address) return;
    localStorage.setItem(`vfide_my_stories_${address}`, JSON.stringify(myStories));
  }, [myStories, address]);

  const handleCreateStory = (story: Story) => {
    setMyStories((prev) => [...prev, story]);
  };

  const handleViewStory = (storyId: string) => {
    setViewedStories((prev) => new Set(prev).add(storyId));
  };

  const handleReactToStory = (storyId: string, emoji: string) => {
    // Update reactions in user stories
    setUserStories((prev) =>
      prev.map((user) => ({
        ...user,
        stories: user.stories.map((story) =>
          story.id === storyId
            ? {
                ...story,
                reactions: [
                  ...story.reactions,
                  { userId: address || '', emoji, timestamp: Date.now() },
                ],
              }
            : story
        ),
      }))
    );
  };

  const hasUnviewedStories = (stories: Story[]) => {
    return stories.some((s) => !viewedStories.has(s.id) && !isStoryExpired(s));
  };

  return (
    <>
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20">
          {/* Header */}
          <motion.section
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold text-zinc-100 mb-3">Stories</h1>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Share moments that disappear in 24 hours. See what the community is up to!
              </p>
              <div
                className="flex flex-wrap justify-center gap-2 text-xs uppercase tracking-[0.2em] text-zinc-500 mt-4"
                aria-label="Story workflow: Capture, then Share, then Inspire"
              >
                <span>Capture</span>
                <span className="text-cyan-400">→</span>
                <span>Share</span>
                <span className="text-cyan-400">→</span>
                <span>Inspire</span>
              </div>
            </div>
          </motion.section>

          {!isConnected ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-md mx-auto ring-effect">
                <div className="text-6xl mb-4">📸</div>
                <h2 className="text-xl font-bold text-zinc-100 mb-4">Connect Your Wallet</h2>
                <p className="text-zinc-400 mb-6">
                  Connect your wallet to view and share stories with the community.
                </p>
                <ConnectButton />
              </div>
            </motion.div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* Stories Row */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-8 ring-effect"
              >
                <div className="flex gap-3 sm:gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-[#3A3A4F] scrollbar-track-transparent">
                  {/* Add Story Button */}
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-2 cursor-pointer shrink-0"
                    onClick={() => setShowCreator(true)}
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-400/20 to-violet-400/20 border-2 border-dashed border-cyan-400 flex items-center justify-center hover:bg-cyan-400/10 transition-colors ring-effect">
                      <Plus className="w-8 h-8 text-cyan-400" />
                    </div>
                    <p className="text-cyan-400 text-sm font-medium">Add Story</p>
                  </motion.div>

                  {/* My Stories */}
                  {myStories.length > 0 && (
                    <StoryRing
                      userId={address || ''}
                      userName="Your Story"
                      userAvatar="✨"
                      stories={myStories}
                      hasUnviewed={false}
                      onClick={() => setViewingStories({ stories: myStories, index: 0 })}
                      size="md"
                    />
                  )}

                  {/* Other Users' Stories */}
                  {userStories.map((user) => (
                    <StoryRing
                      key={user.userId}
                      userId={user.userId}
                      userName={user.userName}
                      userAvatar={user.userAvatar}
                      stories={user.stories}
                      hasUnviewed={hasUnviewedStories(user.stories)}
                      onClick={() => setViewingStories({ stories: user.stories, index: 0 })}
                      size="md"
                    />
                  ))}
                </div>
              </motion.div>

              {/* Story Tips */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid md:grid-cols-3 gap-6"
              >
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-center hover:border-cyan-400/50 transition-colors ring-effect">
                  <div className="text-4xl mb-4">✍️</div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">Text Stories</h3>
                  <p className="text-zinc-400 text-sm">
                    Share thoughts with beautiful gradient backgrounds
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-center hover:border-cyan-400/50 transition-colors ring-effect">
                  <div className="text-4xl mb-4">📸</div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">Photo & Video</h3>
                  <p className="text-zinc-400 text-sm">
                    Upload photos and videos with captions
                  </p>
                </div>

                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 text-center hover:border-cyan-400/50 transition-colors ring-effect">
                  <div className="text-4xl mb-4">⏰</div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-2">24 Hour Limit</h3>
                  <p className="text-zinc-400 text-sm">
                    Stories disappear after 24 hours automatically
                  </p>
                </div>
              </motion.div>

              {/* Empty State */}
              {userStories.length === 0 && myStories.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 mt-8"
                >
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">No Stories Yet</h3>
                  <p className="text-zinc-400 mb-6">
                    Be the first to share a story with the community!
                  </p>
                  <button
                    onClick={() => setShowCreator(true)}
                    className="px-6 py-3 bg-cyan-400 text-zinc-950 rounded-lg font-bold hover:bg-cyan-400 transition-colors inline-flex items-center gap-2"
                  >
                    <Camera size={20} />
                    Create Your First Story
                  </button>
                </motion.div>
              )}
            </div>
          )}

          {/* Story Creator Modal */}
          <AnimatePresence>
            {showCreator && address && (
              <StoryCreator
                onClose={() => setShowCreator(false)}
                onCreate={handleCreateStory}
                userAddress={address}
                userName={address.slice(0, 6) + '...' + address.slice(-4)}
                userAvatar="✨"
              />
            )}
          </AnimatePresence>

          {/* Story Viewer Modal */}
          <AnimatePresence>
            {viewingStories && address && (
              <StoryViewer
                stories={viewingStories.stories}
                initialIndex={viewingStories.index}
                onClose={() => setViewingStories(null)}
                onView={handleViewStory}
                onReact={handleReactToStory}
                userAddress={address}
              />
            )}
          </AnimatePresence>
        </main>
        <Footer />
      </PageWrapper>
    </>
  );
}
