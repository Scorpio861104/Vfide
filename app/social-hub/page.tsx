'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { getAuthHeaders } from '@/lib/auth/client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import Image from 'next/image';
import {
  Rss,
  Camera,
  MessageCircle,
  Users,
  Heart,
  Share2,
  TrendingUp,
  Plus,
  Image as ImageIcon,
  Video,
  Smile,
  Send,
  MoreHorizontal,
  Bookmark,
  Flag,
  UserPlus,
  Award,
  Zap,
  MapPin,
  MessageSquare,
  Repeat2,
  Shield,
  Sparkles,
  RefreshCw,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface Post {
  id: string;
  author: {
    address: string;
    name: string;
    avatar: string;
    verified: boolean;
    proofScore: number;
  };
  content: string;
  media?: {
    type: 'image' | 'video';
    url: string;
  }[];
  timestamp: number;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  liked: boolean;
  bookmarked: boolean;
  isFollowing: boolean;
  tags?: string[];
}

interface Story {
  id: string;
  author: {
    address: string;
    name: string;
    avatar: string;
  };
  preview: string;
  viewed: boolean;
  isLive: boolean;
}

interface TrendingTopic {
  id: string;
  tag: string;
  posts: number;
  trending: 'up' | 'down' | 'stable';
}

interface SuggestedUser {
  address: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  mutualFriends: number;
  verified: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

const FALLBACK_TRENDING_TOPICS: TrendingTopic[] = [
  { id: 'fallback-1', tag: '#VFIDE', posts: 12400, trending: 'up' },
  { id: 'fallback-2', tag: '#DeFi', posts: 9800, trending: 'up' },
  { id: 'fallback-3', tag: '#ProofScore', posts: 5400, trending: 'stable' },
];

const FALLBACK_SUGGESTED_USERS: SuggestedUser[] = [
  {
    address: '0xwhale...watcher',
    name: 'WhaleWatcher',
    avatar: '🐋',
    bio: 'Tracking liquidity moves',
    followers: 18200,
    mutualFriends: 12,
    verified: true,
  },
  {
    address: '0xyield...farmer',
    name: 'YieldFarmer',
    avatar: '🌾',
    bio: 'Hunting sustainable yields',
    followers: 8400,
    mutualFriends: 8,
    verified: false,
  },
];

const FALLBACK_STORY: Story = {
  id: 'story-you',
  author: { address: '', name: 'You', avatar: '✨' },
  preview: '',
  viewed: false,
  isLive: false,
};

// ============================================================================
// COMPONENTS
// ============================================================================

function StoryRing({ story, onClick }: { story: Story; onClick: () => void }) {
  const isYou = story.author.name === 'You';
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[4.5rem]"
    >
      <div className={`
        relative p-0.5 rounded-full
        ${story.viewed ? 'bg-zinc-700' : 'bg-linear-to-tr from-rose-500 via-[#FF6B9D] to-cyan-400'}
        ${story.isLive ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#0A0A0F]' : ''}
      `}>
        <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center text-2xl overflow-hidden">
          {story.preview ? (
            <Image src={story.preview} alt="" width={56} height={56} className="w-full h-full object-cover" unoptimized />
          ) : isYou ? (
            <Plus className="w-6 h-6 text-cyan-400" />
          ) : (
            story.author.avatar
          )}
        </div>
        {story.isLive && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
            LIVE
          </span>
        )}
      </div>
      <span className="text-xs text-zinc-400 truncate max-w-[3.75rem]">
        {story.author.name}
      </span>
    </motion.button>
  );
}

function CreatePostCard({ onPost }: { onPost: (content: string) => void }) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (content.trim()) {
      onPost(content);
      setContent('');
      setIsFocused(false);
    }
  };

  return (
    <motion.div
      layout
      className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4"
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-lg">
          ✨
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="What's happening in Web3?"
            className="w-full bg-transparent text-zinc-50 placeholder-[#6A6A6F] resize-none outline-none min-h-[3.75rem]"
            rows={isFocused ? 3 : 1}
          />
          
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between pt-3 border-t border-zinc-700 mt-3"
              >
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-cyan-400">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-violet-400">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-pink-400">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-emerald-500">
                    <MapPin className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${content.length > 280 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {content.length}/280
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || content.length > 280}
                    className="px-4 py-2 bg-linear-to-r from-cyan-400 to-violet-400 text-zinc-950 font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Post
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function PostCard({ post, onLike, onBookmark }: { post: Post; onLike: () => void; onBookmark: () => void }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-xl">
            {post.author.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-50">{post.author.name}</span>
              {post.author.verified && (
                <Shield className="w-4 h-4 text-cyan-400" />
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-400">
                {post.author.proofScore} PS
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <span>{post.author.address}</span>
              <span>•</span>
              <span>{formatTimeAgo(post.timestamp)}</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg py-1 min-w-[9.375rem] z-10">
              <button className="w-full px-4 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-700 flex items-center gap-2">
                <Flag className="w-4 h-4" /> Report
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-zinc-400 hover:bg-zinc-700 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> {post.isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-zinc-50 whitespace-pre-wrap">{post.content}</p>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {post.tags.map((tag) => (
              <span key={tag} className="text-cyan-400 text-sm hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className={`grid ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-0.5`}>
          {post.media.map((m, index) => (
            <Image
              key={m.url}
              src={m.url}
              alt={`Post image ${index + 1}`}
              width={600}
              height={256}
              className="w-full h-64 object-cover"
              unoptimized
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center gap-4 text-sm text-zinc-500 border-t border-zinc-700/50">
        <span>{formatNumber(post.views)} views</span>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-zinc-700">
        <button
          onClick={onLike}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            post.liked ? 'text-pink-400 bg-pink-400/10' : 'text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
          <span className="text-sm">{formatNumber(post.likes)}</span>
        </button>
        
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-700 transition-colors">
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm">{formatNumber(post.comments)}</span>
        </button>
        
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-zinc-400 hover:bg-zinc-700 transition-colors">
          <Repeat2 className="w-5 h-5" />
          <span className="text-sm">{formatNumber(post.shares)}</span>
        </button>
        
        <button
          onClick={onBookmark}
          className={`p-2 rounded-lg transition-colors ${
            post.bookmarked ? 'text-cyan-400 bg-cyan-400/10' : 'text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${post.bookmarked ? 'fill-current' : ''}`} />
        </button>
        
        <button className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-700 transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </motion.article>
  );
}

function TrendingSidebar({
  trendingTopics,
  suggestedUsers,
  userStats,
}: {
  trendingTopics: TrendingTopic[];
  suggestedUsers: SuggestedUser[];
  userStats: { followers: number; following: number; likes: number; proofScore: number };
}) {
  return (
    <div className="space-y-6">
      {/* Quick Links */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4">
        <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          Quick Access
        </h3>
        <div className="space-y-2">
          <Link href="/feed" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400">
            <Rss className="w-5 h-5" />
            <span>Activity Feed</span>
          </Link>
          <Link href="/stories" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400">
            <Camera className="w-5 h-5" />
            <span>Stories</span>
          </Link>
          <Link href="/social-messaging" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400">
            <MessageCircle className="w-5 h-5" />
            <span>Messages</span>
          </Link>
          <Link href="/social-payments" className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-700 transition-colors text-zinc-400">
            <Zap className="w-5 h-5" />
            <span>Social Payments</span>
          </Link>
        </div>
      </div>

      {/* Trending */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4">
        <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-pink-400" />
          Trending
        </h3>
        {trendingTopics.length === 0 ? (
          <div className="text-sm text-zinc-500">No trending topics yet.</div>
        ) : (
          <div className="space-y-3">
            {trendingTopics.map((topic, index) => (
              <div key={topic.id} className="flex items-center justify-between group cursor-pointer">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-zinc-500">{index + 1}</span>
                    <span className="text-cyan-400 font-medium group-hover:underline">{topic.tag}</span>
                  </div>
                  <span className="text-xs text-zinc-500">{formatNumber(topic.posts)} posts</span>
                </div>
                {topic.trending === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
                {topic.trending === 'down' && <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Who to Follow */}
      <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4">
        <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-400" />
          Who to Follow
        </h3>
        {suggestedUsers.length === 0 ? (
          <div className="text-sm text-zinc-500">No suggestions yet.</div>
        ) : (
          <div className="space-y-4">
            {suggestedUsers.map((user) => (
              <div key={user.address} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-lg">
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-zinc-50 truncate">{user.name}</span>
                    {user.verified && <Shield className="w-3 h-3 text-cyan-400" />}
                  </div>
                  <span className="text-xs text-zinc-500">{user.mutualFriends} mutual</span>
                </div>
                <button className="px-3 py-1 bg-cyan-400 text-zinc-950 text-sm font-semibold rounded-full hover:bg-cyan-400 transition-colors">
                  Follow
                </button>
              </div>
            ))}
          </div>
        )}
        <button className="w-full mt-4 text-cyan-400 text-sm hover:underline">
          Show more
        </button>
      </div>

      {/* Stats Card */}
      <div className="bg-linear-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-4">
        <h3 className="font-semibold text-zinc-50 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Your Stats
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{formatNumber(userStats.followers)}</div>
            <div className="text-xs text-zinc-500">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-400">{formatNumber(userStats.following)}</div>
            <div className="text-xs text-zinc-500">Following</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-400">{formatNumber(userStats.likes)}</div>
            <div className="text-xs text-zinc-500">Total Likes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-500">{userStats.proofScore}</div>
            <div className="text-xs text-zinc-500">ProofScore</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function SocialHubPage() {
  const { address, isConnected } = useAccount();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([FALLBACK_STORY]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>(FALLBACK_TRENDING_TOPICS);
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>(FALLBACK_SUGGESTED_USERS);
  const [profileStats, setProfileStats] = useState({ followers: 0, following: 0, proofScore: 0 });
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'trending'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch social data on mount
  useEffect(() => {
    const fetchSocialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const authHeaders = getAuthHeaders();
        const [postsRes, storiesRes, trendingRes, suggestedRes] = await Promise.all([
          fetch('/api/community/posts').catch(() => null),
          fetch('/api/community/stories').catch(() => null),
          fetch('/api/community/trending').catch(() => null),
          fetch('/api/friends/suggested', { headers: authHeaders }).catch(() => null),
        ]);
        
        if (postsRes?.ok) {
          const data = await postsRes.json();
          setPosts(data.posts || []);
        }
        if (storiesRes?.ok) {
          const data = await storiesRes.json();
          const apiStories = Array.isArray(data.stories) ? data.stories : [];
          const mergedStories = [
            FALLBACK_STORY,
            ...apiStories.filter((story: Story) => story?.author?.name !== 'You'),
          ];
          setStories(mergedStories);
        }
        if (trendingRes?.ok) {
          const data = await trendingRes.json();
          const topics = Array.isArray(data.topics) ? data.topics : [];
          setTrendingTopics(topics.length > 0 ? topics : FALLBACK_TRENDING_TOPICS);
        }
        if (suggestedRes?.ok) {
          const data = await suggestedRes.json();
          const users = Array.isArray(data.users) ? data.users : [];
          setSuggestedUsers(users.length > 0 ? users : FALLBACK_SUGGESTED_USERS);
        }
      } catch {
        setError('Failed to load social data');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSocialData();
  }, []);

  useEffect(() => {
    if (!address) {
      setProfileStats({ followers: 0, following: 0, proofScore: 0 });
      return;
    }

    const loadProfile = async () => {
      try {
        const res = await fetch(`/api/users/${address}`, { headers: getAuthHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        const stats = data?.user?.stats;
        setProfileStats({
          followers: Number(stats?.friend_count ?? 0),
          following: Number(stats?.friend_count ?? 0),
          proofScore: Number(data?.user?.proof_score ?? 0),
        });
      } catch {
        // Ignore profile failures
      }
    };

    loadProfile();
  }, [address]);

  const userStats = useMemo(
    () => ({
      ...profileStats,
      likes: posts.reduce((sum, post) => sum + post.likes, 0),
    }),
    [posts, profileStats]
  );

  const handlePost = async (content: string) => {
    const newPost: Post = {
      id: Date.now().toString(),
      author: {
        address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x...',
        name: 'You',
        avatar: '✨',
        verified: false,
        proofScore: 75,
      },
      content,
      timestamp: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0,
      views: 0,
      liked: false,
      bookmarked: false,
      isFollowing: false,
    };
    setPosts([newPost, ...posts]);
    
    // Post to API
    try {
      await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, author: address }),
      });
    } catch {
      // Local-only if API fails
    }
  };

  const handleLike = (postId: string) => {
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  const handleBookmark = (postId: string) => {
    setPosts(posts.map(p => 
      p.id === postId 
        ? { ...p, bookmarked: !p.bookmarked }
        : p
    ));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const postsRes = await fetch('/api/community/posts');
      if (postsRes.ok) {
        const data = await postsRes.json();
        setPosts(data.posts || []);
      }
    } catch {
      // Refresh failed silently
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <PageWrapper variant="cosmic" showOrbs showGrid>
        <main className="pt-20 pb-20 min-h-screen">
          <div className="container mx-auto px-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-zinc-50 mb-3 flex items-center justify-center gap-3">
                <Sparkles className="w-10 h-10 text-cyan-400" />
                Social Hub
              </h1>
              <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
                Connect, share, and engage with the VFIDE community
              </p>
            </motion.div>

            {!isConnected ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-8 max-w-md mx-auto">
                  <div className="text-6xl mb-4">🔗</div>
                  <h2 className="text-xl font-bold text-zinc-50 mb-4">
                    Connect to Join the Conversation
                  </h2>
                  <p className="text-zinc-400 mb-6">
                    Connect your wallet to post, like, comment, and interact with the community.
                  </p>
                  <ConnectButton />
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Feed */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Stories */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-700 rounded-2xl p-4"
                  >
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {stories.length === 0 ? (
                        <div className="text-zinc-500 text-sm py-4">No stories yet.</div>
                      ) : (
                        stories.map((story) => (
                          <StoryRing
                            key={story.id}
                            story={story}
                            onClick={() => {}}
                          />
                        ))
                      )}
                    </div>
                  </motion.div>

                  {/* Create Post */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <CreatePostCard onPost={handlePost} />
                  </motion.div>

                  {/* Feed Filter */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex gap-2">
                      {(['all', 'following', 'trending'] as const).map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setFeedFilter(filter)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                            feedFilter === filter
                              ? 'bg-cyan-400 text-zinc-950'
                              : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-400"
                    >
                      <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </motion.div>

                  {/* Posts */}
                  {error && (
                    <div className="text-sm text-pink-400">{error}</div>
                  )}

                  {isLoading ? (
                    <div className="text-zinc-500 text-sm">Loading feed…</div>
                  ) : posts.length === 0 ? (
                    <div className="text-zinc-500 text-sm">No posts yet.</div>
                  ) : (
                    <div className="space-y-6">
                      {posts.map((post, index) => (
                        <motion.div
                          key={post.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                        >
                          <PostCard
                            post={post}
                            onLike={() => handleLike(post.id)}
                            onBookmark={() => handleBookmark(post.id)}
                          />
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Load More */}
                  <button className="w-full py-4 bg-zinc-900 border border-zinc-700 rounded-xl text-cyan-400 hover:bg-zinc-700 transition-colors">
                    Load More Posts
                  </button>
                </div>

                {/* Sidebar */}
                <div className="hidden lg:block">
                  <div className="sticky top-24">
                    <TrendingSidebar
                      trendingTopics={trendingTopics}
                      suggestedUsers={suggestedUsers}
                      userStats={userStats}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </PageWrapper>
    </>
  );
}
