'use client';

import React, { useState, useEffect } from 'react';
import { Footer } from '@/components/layout/Footer';
import { PageWrapper } from '@/components/ui/PageLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
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
// MOCK DATA
// ============================================================================

const mockStories: Story[] = [
  { id: '1', author: { address: '0x1234', name: 'You', avatar: '✨' }, preview: '', viewed: false, isLive: false },
  { id: '2', author: { address: '0x2345', name: 'CryptoKing', avatar: '👑' }, preview: 'https://picsum.photos/100/180?1', viewed: false, isLive: true },
  { id: '3', author: { address: '0x3456', name: 'DeFiQueen', avatar: '💎' }, preview: 'https://picsum.photos/100/180?2', viewed: false, isLive: false },
  { id: '4', author: { address: '0x4567', name: 'NFTArtist', avatar: '🎨' }, preview: 'https://picsum.photos/100/180?3', viewed: true, isLive: false },
  { id: '5', author: { address: '0x5678', name: 'DAOBuilder', avatar: '🏗️' }, preview: 'https://picsum.photos/100/180?4', viewed: true, isLive: false },
  { id: '6', author: { address: '0x6789', name: 'TokenTrader', avatar: '📊' }, preview: 'https://picsum.photos/100/180?5', viewed: false, isLive: false },
];

const mockPosts: Post[] = [
  {
    id: '1',
    author: {
      address: '0xCrypto...King',
      name: 'CryptoKing',
      avatar: '👑',
      verified: true,
      proofScore: 95,
    },
    content: 'Just hit 1000 successful transactions on VFIDE! The trust protocol is working exactly as designed. Loving the seamless P2P experience 🚀\n\n#VFIDE #DeFi #TrustProtocol',
    media: [{ type: 'image', url: 'https://picsum.photos/600/400?1' }],
    timestamp: Date.now() - 1000 * 60 * 30,
    likes: 234,
    comments: 45,
    shares: 12,
    views: 1420,
    liked: false,
    bookmarked: false,
    isFollowing: true,
    tags: ['VFIDE', 'DeFi', 'TrustProtocol'],
  },
  {
    id: '2',
    author: {
      address: '0xDeFi...Queen',
      name: 'DeFiQueen',
      avatar: '💎',
      verified: true,
      proofScore: 88,
    },
    content: 'PSA: Always check ProofScore before transacting with new addresses. Just avoided a potential scam thanks to the reputation system! 🛡️\n\nStay safe out there, friends.',
    timestamp: Date.now() - 1000 * 60 * 120,
    likes: 567,
    comments: 89,
    shares: 156,
    views: 3240,
    liked: true,
    bookmarked: true,
    isFollowing: false,
    tags: ['Security', 'ProofScore'],
  },
  {
    id: '3',
    author: {
      address: '0xNFT...Artist',
      name: 'NFTArtist',
      avatar: '🎨',
      verified: false,
      proofScore: 72,
    },
    content: 'New collection dropping next week! All payments will be through VFIDE for that sweet escrow protection. Preview coming soon 👀',
    media: [
      { type: 'image', url: 'https://picsum.photos/600/400?2' },
      { type: 'image', url: 'https://picsum.photos/600/400?3' },
    ],
    timestamp: Date.now() - 1000 * 60 * 240,
    likes: 892,
    comments: 156,
    shares: 78,
    views: 5670,
    liked: false,
    bookmarked: false,
    isFollowing: true,
    tags: ['NFT', 'Art', 'ComingSoon'],
  },
  {
    id: '4',
    author: {
      address: '0xDAO...Builder',
      name: 'DAOBuilder',
      avatar: '🏗️',
      verified: true,
      proofScore: 91,
    },
    content: 'Proposal #42 passed! Our community decided to allocate 10% of treasury to developer grants. This is what decentralized governance looks like! 🗳️\n\nThank you to everyone who participated in the vote.',
    timestamp: Date.now() - 1000 * 60 * 360,
    likes: 1203,
    comments: 234,
    shares: 189,
    views: 8900,
    liked: true,
    bookmarked: false,
    isFollowing: true,
    tags: ['DAO', 'Governance', 'Community'],
  },
];

const mockTrending: TrendingTopic[] = [
  { id: '1', tag: '#VFIDE', posts: 12450, trending: 'up' },
  { id: '2', tag: '#DeFi', posts: 8920, trending: 'up' },
  { id: '3', tag: '#ProofScore', posts: 5670, trending: 'stable' },
  { id: '4', tag: '#Web3', posts: 4230, trending: 'up' },
  { id: '5', tag: '#NFT', posts: 3890, trending: 'down' },
];

const mockSuggested: SuggestedUser[] = [
  { address: '0x7890', name: 'WhaleWatcher', avatar: '🐋', bio: 'Tracking big moves', followers: 45000, mutualFriends: 12, verified: true },
  { address: '0x8901', name: 'YieldFarmer', avatar: '🌾', bio: 'Max APY seeker', followers: 23000, mutualFriends: 8, verified: true },
  { address: '0x9012', name: 'GasOptimizer', avatar: '⛽', bio: 'Saving you fees', followers: 18000, mutualFriends: 5, verified: false },
];

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
      className="flex flex-col items-center gap-1 min-w-[72px]"
    >
      <div className={`
        relative p-0.5 rounded-full
        ${story.viewed ? 'bg-[#3A3A4F]' : 'bg-gradient-to-tr from-[#FF006E] via-[#FF6B9D] to-[#00F0FF]'}
        ${story.isLive ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-[#0A0A0F]' : ''}
      `}>
        <div className="w-14 h-14 rounded-full bg-[#1A1A2E] flex items-center justify-center text-2xl overflow-hidden">
          {story.preview ? (
            <img src={story.preview} alt="" className="w-full h-full object-cover" />
          ) : isYou ? (
            <Plus className="w-6 h-6 text-[#00F0FF]" />
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
      <span className="text-xs text-[#A0A0A5] truncate max-w-[60px]">
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
      className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-[#3A3A4F] rounded-2xl p-4"
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-lg">
          ✨
        </div>
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="What's happening in Web3?"
            className="w-full bg-transparent text-[#F8F8FC] placeholder-[#6A6A6F] resize-none outline-none min-h-[60px]"
            rows={isFocused ? 3 : 1}
          />
          
          <AnimatePresence>
            {isFocused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between pt-3 border-t border-[#3A3A4F] mt-3"
              >
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-[#3A3A4F] rounded-lg transition-colors text-[#00F0FF]">
                    <ImageIcon className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-[#3A3A4F] rounded-lg transition-colors text-[#A78BFA]">
                    <Video className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-[#3A3A4F] rounded-lg transition-colors text-[#FF6B9D]">
                    <Smile className="w-5 h-5" />
                  </button>
                  <button className="p-2 hover:bg-[#3A3A4F] rounded-lg transition-colors text-[#50C878]">
                    <MapPin className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${content.length > 280 ? 'text-red-400' : 'text-[#6A6A6F]'}`}>
                    {content.length}/280
                  </span>
                  <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || content.length > 280}
                    className="px-4 py-2 bg-gradient-to-r from-[#00F0FF] to-[#A78BFA] text-[#0A0A0F] font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
      className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-[#3A3A4F] rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-xl">
            {post.author.avatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#F8F8FC]">{post.author.name}</span>
              {post.author.verified && (
                <Shield className="w-4 h-4 text-[#00F0FF]" />
              )}
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#00F0FF]/20 text-[#00F0FF]">
                {post.author.proofScore} PS
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#6A6A6F]">
              <span>{post.author.address}</span>
              <span>•</span>
              <span>{formatTimeAgo(post.timestamp)}</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-[#3A3A4F] rounded-lg transition-colors text-[#6A6A6F]"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-[#1A1A2E] border border-[#3A3A4F] rounded-lg py-1 min-w-[150px] z-10">
              <button className="w-full px-4 py-2 text-left text-sm text-[#A0A0A5] hover:bg-[#3A3A4F] flex items-center gap-2">
                <Flag className="w-4 h-4" /> Report
              </button>
              <button className="w-full px-4 py-2 text-left text-sm text-[#A0A0A5] hover:bg-[#3A3A4F] flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> {post.isFollowing ? 'Unfollow' : 'Follow'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-[#F8F8FC] whitespace-pre-wrap">{post.content}</p>
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[#00F0FF] text-sm hover:underline cursor-pointer">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className={`grid ${post.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-0.5`}>
          {post.media.map((m) => (
            <img
              key={m.url}
              src={m.url}
              alt=""
              className="w-full h-64 object-cover"
            />
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="px-4 py-2 flex items-center gap-4 text-sm text-[#6A6A6F] border-t border-[#3A3A4F]/50">
        <span>{formatNumber(post.views)} views</span>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex items-center justify-between border-t border-[#3A3A4F]">
        <button
          onClick={onLike}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
            post.liked ? 'text-[#FF6B9D] bg-[#FF6B9D]/10' : 'text-[#A0A0A5] hover:bg-[#3A3A4F]'
          }`}
        >
          <Heart className={`w-5 h-5 ${post.liked ? 'fill-current' : ''}`} />
          <span className="text-sm">{formatNumber(post.likes)}</span>
        </button>
        
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#A0A0A5] hover:bg-[#3A3A4F] transition-colors">
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm">{formatNumber(post.comments)}</span>
        </button>
        
        <button className="flex items-center gap-2 px-3 py-2 rounded-lg text-[#A0A0A5] hover:bg-[#3A3A4F] transition-colors">
          <Repeat2 className="w-5 h-5" />
          <span className="text-sm">{formatNumber(post.shares)}</span>
        </button>
        
        <button
          onClick={onBookmark}
          className={`p-2 rounded-lg transition-colors ${
            post.bookmarked ? 'text-[#00F0FF] bg-[#00F0FF]/10' : 'text-[#A0A0A5] hover:bg-[#3A3A4F]'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${post.bookmarked ? 'fill-current' : ''}`} />
        </button>
        
        <button className="p-2 rounded-lg text-[#A0A0A5] hover:bg-[#3A3A4F] transition-colors">
          <Share2 className="w-5 h-5" />
        </button>
      </div>
    </motion.article>
  );
}

function TrendingSidebar() {
  return (
    <div className="space-y-6">
      {/* Quick Links */}
      <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-[#3A3A4F] rounded-2xl p-4">
        <h3 className="font-semibold text-[#F8F8FC] mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-[#00F0FF]" />
          Quick Access
        </h3>
        <div className="space-y-2">
          <Link href="/feed" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#3A3A4F] transition-colors text-[#A0A0A5]">
            <Rss className="w-5 h-5" />
            <span>Activity Feed</span>
          </Link>
          <Link href="/stories" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#3A3A4F] transition-colors text-[#A0A0A5]">
            <Camera className="w-5 h-5" />
            <span>Stories</span>
          </Link>
          <Link href="/social-messaging" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#3A3A4F] transition-colors text-[#A0A0A5]">
            <MessageCircle className="w-5 h-5" />
            <span>Messages</span>
          </Link>
          <Link href="/social-payments" className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#3A3A4F] transition-colors text-[#A0A0A5]">
            <Zap className="w-5 h-5" />
            <span>Social Payments</span>
          </Link>
        </div>
      </div>

      {/* Trending */}
      <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-[#3A3A4F] rounded-2xl p-4">
        <h3 className="font-semibold text-[#F8F8FC] mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[#FF6B9D]" />
          Trending
        </h3>
        <div className="space-y-3">
          {mockTrending.map((topic, index) => (
            <div key={topic.id} className="flex items-center justify-between group cursor-pointer">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-[#6A6A6F]">{index + 1}</span>
                  <span className="text-[#00F0FF] font-medium group-hover:underline">{topic.tag}</span>
                </div>
                <span className="text-xs text-[#6A6A6F]">{formatNumber(topic.posts)} posts</span>
              </div>
              {topic.trending === 'up' && <TrendingUp className="w-4 h-4 text-green-400" />}
              {topic.trending === 'down' && <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />}
            </div>
          ))}
        </div>
      </div>

      {/* Who to Follow */}
      <div className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-[#3A3A4F] rounded-2xl p-4">
        <h3 className="font-semibold text-[#F8F8FC] mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-[#A78BFA]" />
          Who to Follow
        </h3>
        <div className="space-y-4">
          {mockSuggested.map((user) => (
            <div key={user.address} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#A78BFA] flex items-center justify-center text-lg">
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-[#F8F8FC] truncate">{user.name}</span>
                  {user.verified && <Shield className="w-3 h-3 text-[#00F0FF]" />}
                </div>
                <span className="text-xs text-[#6A6A6F]">{user.mutualFriends} mutual</span>
              </div>
              <button className="px-3 py-1 bg-[#00F0FF] text-[#0A0A0F] text-sm font-semibold rounded-full hover:bg-[#00D4E0] transition-colors">
                Follow
              </button>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 text-[#00F0FF] text-sm hover:underline">
          Show more
        </button>
      </div>

      {/* Stats Card */}
      <div className="bg-gradient-to-br from-[#1A1A2E] to-[#2A2A3E] border border-[#3A3A4F] rounded-2xl p-4">
        <h3 className="font-semibold text-[#F8F8FC] mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-[#FFD700]" />
          Your Stats
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00F0FF]">1.2K</div>
            <div className="text-xs text-[#6A6A6F]">Followers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#A78BFA]">847</div>
            <div className="text-xs text-[#6A6A6F]">Following</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#FF6B9D]">15.2K</div>
            <div className="text-xs text-[#6A6A6F]">Total Likes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#50C878]">89</div>
            <div className="text-xs text-[#6A6A6F]">ProofScore</div>
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
  const [stories, setStories] = useState<Story[]>([]);
  const [trending, setTrending] = useState<TrendingTopic[]>([]);
  const [suggested, setSuggested] = useState<SuggestedUser[]>([]);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'trending'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch social data on mount
  useEffect(() => {
    const fetchSocialData = async () => {
      setIsLoading(true);
      try {
        const [postsRes, storiesRes, trendingRes, suggestedRes] = await Promise.all([
          fetch('/api/community/posts').catch(() => null),
          fetch('/api/community/stories').catch(() => null),
          fetch('/api/community/trending').catch(() => null),
          fetch('/api/friends/suggested').catch(() => null),
        ]);
        
        if (postsRes?.ok) {
          const data = await postsRes.json();
          setPosts(data.posts || []);
        }
        if (storiesRes?.ok) {
          const data = await storiesRes.json();
          setStories(data.stories || []);
        }
        if (trendingRes?.ok) {
          const data = await trendingRes.json();
          setTrending(data.topics || []);
        }
        if (suggestedRes?.ok) {
          const data = await suggestedRes.json();
          setSuggested(data.users || []);
        }
      } catch {
        // APIs not available yet - use empty state
      } finally {
        setIsLoading(false);
      }
    };
    fetchSocialData();
  }, []);

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
              <h1 className="text-4xl md:text-5xl font-bold text-[#F8F8FC] mb-3 flex items-center justify-center gap-3">
                <Sparkles className="w-10 h-10 text-[#00F0FF]" />
                Social Hub
              </h1>
              <p className="text-[#A0A0A5] text-lg max-w-2xl mx-auto">
                Connect, share, and engage with the VFIDE community
              </p>
            </motion.div>

            {!isConnected ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <div className="bg-[#1A1A2E] border border-[#3A3A4F] rounded-xl p-8 max-w-md mx-auto">
                  <div className="text-6xl mb-4">🔗</div>
                  <h2 className="text-xl font-bold text-[#F8F8FC] mb-4">
                    Connect to Join the Conversation
                  </h2>
                  <p className="text-[#A0A0A5] mb-6">
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
                    className="bg-[#1A1A2E]/80 backdrop-blur-xl border border-[#3A3A4F] rounded-2xl p-4"
                  >
                    <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                      {mockStories.map((story) => (
                        <StoryRing
                          key={story.id}
                          story={story}
                          onClick={() => {}}
                        />
                      ))}
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
                              ? 'bg-[#00F0FF] text-[#0A0A0F]'
                              : 'bg-[#1A1A2E] text-[#A0A0A5] hover:bg-[#3A3A4F]'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="p-2 hover:bg-[#3A3A4F] rounded-lg transition-colors text-[#A0A0A5]"
                    >
                      <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </motion.div>

                  {/* Posts */}
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

                  {/* Load More */}
                  <button className="w-full py-4 bg-[#1A1A2E] border border-[#3A3A4F] rounded-xl text-[#00F0FF] hover:bg-[#3A3A4F] transition-colors">
                    Load More Posts
                  </button>
                </div>

                {/* Sidebar */}
                <div className="hidden lg:block">
                  <div className="sticky top-24">
                    <TrendingSidebar />
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
