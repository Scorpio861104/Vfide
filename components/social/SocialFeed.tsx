'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  MessageCircle,
  Share2,
  Send,
  Image as ImageIcon,
  Smile,
  Search,
  Filter,
  MoreHorizontal,
} from 'lucide-react';
import { SocialTipButton } from './SocialTipButton';

// ==================== TYPES ====================

interface FeedPost {
  id: string;
  author: {
    id: string;
    avatar: string;
    name: string;
    username: string;
    isVerified: boolean;
    proofScore: number;
  };
  content: string;
  type: 'status' | 'achievement' | 'activity' | 'proposal';
  timestamp: Date;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  liked: boolean;
  saved: boolean;
  metrics?: {
    engagement: number;
    reach: number;
    impressions: number;
  };
  tags?: string[];
}

interface FeedFilter {
  type?: 'all' | 'status' | 'achievement' | 'activity' | 'proposal';
  sortBy: 'latest' | 'trending' | 'mostEngaged';
}

interface Comment {
  id: string;
  author: {
    avatar: string;
    name: string;
    username: string;
  };
  content: string;
  timestamp: Date;
  likes: number;
  liked: boolean;
}

// ==================== DATA ====================

const commentsData: Comment[] = [];

// ==================== COMPONENTS ====================

interface SocialFeedProps {
  onPostCreated?: (content: string) => void;
}

export function SocialFeed({ onPostCreated }: SocialFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [filter, setFilter] = useState<FeedFilter>({ type: 'all', sortBy: 'latest' });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const observerTarget = useRef<HTMLDivElement>(null);

  const filteredPosts = posts.filter((post) => {
    if (filter.type && filter.type !== 'all' && post.type !== filter.type) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        post.content.toLowerCase().includes(query) ||
        post.author.name.toLowerCase().includes(query) ||
        post.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    switch (filter.sortBy) {
      case 'trending':
        return (b.metrics?.engagement || 0) - (a.metrics?.engagement || 0);
      case 'mostEngaged':
        return (b.likes + b.comments + b.shares) - (a.likes + a.comments + a.shares);
      case 'latest':
      default:
        return b.timestamp.getTime() - a.timestamp.getTime();
    }
  });

  const handleLike = useCallback((postId: string) => {
    setLikedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });

    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId ? { ...post, likes: post.likes + (likedPosts.has(postId) ? -1 : 1) } : post,
      ),
    );
  }, [likedPosts]);

  const handleSave = useCallback((postId: string) => {
    setSavedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);

  const handlePostCreate = () => {
    if (!newPostContent.trim()) return;

    const newPost: FeedPost = {
      id: `p_${Date.now()}`,
      author: {
        id: 'current_user',
        avatar: '👤',
        name: 'You',
        username: 'your_username',
        isVerified: false,
        proofScore: 5000,
      },
      content: newPostContent,
      type: 'status',
      timestamp: new Date(),
      likes: 0,
      comments: 0,
      shares: 0,
      liked: false,
      saved: false,
    };

    setPosts((prev) => [newPost, ...prev]);
    setNewPostContent('');
    onPostCreated?.(newPostContent);
  };

  const getPostIcon = (type: FeedPost['type']) => {
    switch (type) {
      case 'status':
        return '💭';
      case 'achievement':
        return '🏆';
      case 'activity':
        return '📊';
      case 'proposal':
        return '🗳️';
    }
  };

  const getPostColor = (type: FeedPost['type']): string => {
    switch (type) {
      case 'status':
        return 'from-cyan-400/20 to-transparent border-cyan-400/30';
      case 'achievement':
        return 'from-amber-400/20 to-transparent border-amber-400/30';
      case 'activity':
        return 'from-violet-400/20 to-transparent border-violet-400/30';
      case 'proposal':
        return 'from-emerald-500/20 to-transparent border-emerald-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-[#1A1A2E] to-zinc-950">
      {/* Sticky Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-700 px-4 md:px-8 py-4"
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 mb-4">Community Feed</h1>

          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search feed..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors text-sm"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors flex items-center gap-2 font-semibold ${
                showFilters
                  ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-cyan-400'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex gap-2 pb-4 overflow-x-auto"
              >
                {(['all', 'status', 'achievement', 'activity', 'proposal'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter({ ...filter, type })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      filter.type === type
                        ? 'bg-cyan-400 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {type === 'all' ? '📋 All' : type === 'status' ? '💭 Status' : type === 'achievement' ? '🏆 Achievements' : type === 'activity' ? '📊 Activity' : '🗳️ Proposals'}
                  </button>
                ))}

                <div className="border-l border-zinc-700 mx-2" />

                {(['latest', 'trending', 'mostEngaged'] as const).map((sortBy) => (
                  <button
                    key={sortBy}
                    onClick={() => setFilter({ ...filter, sortBy })}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                      filter.sortBy === sortBy
                        ? 'bg-violet-400 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {sortBy === 'latest' ? '🕐 Latest' : sortBy === 'trending' ? '🔥 Trending' : '⭐ Engaged'}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="px-4 md:px-8 py-8 max-w-3xl mx-auto">
        {/* Create Post Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-6 mb-8 sticky top-20 z-20"
        >
          <div className="flex gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg shrink-0">👤</div>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share your thoughts, achievements, or updates with the community..."
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button className="p-2 text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg transition-colors">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button className="p-2 text-zinc-400 hover:text-violet-400 hover:bg-zinc-800 rounded-lg transition-colors">
                <Smile className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={handlePostCreate}
              disabled={!newPostContent.trim()}
              className="px-6 py-2 bg-cyan-400 text-zinc-950 rounded-lg hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Post
            </button>
          </div>
        </motion.div>

        {/* Posts List */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {sortedPosts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Search className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-zinc-100 mb-2">No posts found</h3>
                <p className="text-zinc-400">Try adjusting your search or filters</p>
              </motion.div>
            ) : (
              sortedPosts.map((post, idx) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-gradient-to-br ${getPostColor(post.type)} border rounded-xl p-6 hover:border-cyan-400/50 transition-all group`}
                >
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl shrink-0">
                        {post.author.avatar}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-zinc-100">{post.author.name}</h3>
                          {post.author.isVerified && <Check className="w-4 h-4 text-cyan-400" />}
                          <span className="text-zinc-400 text-sm">@{post.author.username}</span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          {post.timestamp.toLocaleDateString()} at{' '}
                          {post.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <span className="text-2xl">{getPostIcon(post.type)}</span>
                      <button className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Post Content */}
                  <p className="text-zinc-300 mb-4 leading-relaxed">{post.content}</p>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span key={tag} className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-cyan-400">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Metrics */}
                  {post.metrics && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="grid grid-cols-3 gap-3 text-center text-xs mb-4 pb-4 border-b border-zinc-700"
                    >
                      <div>
                        <div className="text-cyan-400 font-bold">{post.metrics.reach}</div>
                        <div className="text-zinc-500">Reach</div>
                      </div>
                      <div>
                        <div className="text-violet-400 font-bold">{post.metrics.engagement}%</div>
                        <div className="text-zinc-500">Engagement</div>
                      </div>
                      <div>
                        <div className="text-emerald-500 font-bold">{post.metrics.impressions}</div>
                        <div className="text-zinc-500">Impressions</div>
                      </div>
                    </motion.div>
                  )}

                  {/* Engagement Stats */}
                  <div className="flex gap-6 text-sm text-zinc-400 mb-4">
                    <span>{post.likes} likes</span>
                    <span>{post.comments} comments</span>
                    <span>{post.shares} shares</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                        likedPosts.has(post.id)
                          ? 'bg-pink-400/20 text-pink-400 border border-pink-400/50'
                          : 'bg-zinc-800 text-zinc-400 hover:border-pink-400 border border-transparent'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                      Like
                    </button>

                    <button
                      onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                      className="flex-1 px-3 py-2 bg-zinc-800 text-zinc-400 hover:border-violet-400 border border-transparent rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Reply
                    </button>

                    <SocialTipButton
                      postId={post.id}
                      recipientAddress={`0x${post.author.id.padEnd(40, '0')}`}
                      recipientName={post.author.name}
                      compact={true}
                      showTotal={true}
                      className="flex-1"
                    />

                    <button className="flex-1 px-3 py-2 bg-zinc-800 text-zinc-400 hover:border-emerald-500 border border-transparent rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>

                    <button
                      onClick={() => handleSave(post.id)}
                      className={`px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                        savedPosts.has(post.id)
                          ? 'bg-amber-400/20 text-amber-400'
                          : 'bg-zinc-800 text-zinc-400 hover:text-amber-400'
                      }`}
                    >
                      {savedPosts.has(post.id) ? '★' : '☆'}
                    </button>
                  </div>

                  {/* Expanded Comments */}
                  <AnimatePresence>
                    {expandedPostId === post.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 pt-6 border-t border-zinc-700"
                      >
                        <div className="space-y-4 mb-4">
                          {commentsData.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                                {comment.author.avatar}
                              </div>
                              <div className="flex-1 bg-zinc-950 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-zinc-100 text-sm">{comment.author.name}</h4>
                                  <span className="text-xs text-zinc-500">@{comment.author.username}</span>
                                </div>
                                <p className="text-sm text-zinc-300 mb-2">{comment.content}</p>
                                <div className="flex items-center gap-3 text-xs text-zinc-500">
                                  <button className="hover:text-pink-400 transition-colors">
                                    {comment.liked ? '❤️' : '🤍'} {comment.likes}
                                  </button>
                                  <span>Reply</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Reply Input */}
                        <div className="flex gap-3 mt-4">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm shrink-0">
                            👤
                          </div>
                          <div className="flex-1 flex gap-2">
                            <input
                              type="text"
                              placeholder="Write a reply..."
                              className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-3 py-2 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 text-sm"
                            />
                            <button className="p-2 bg-cyan-400 text-zinc-950 rounded hover:bg-cyan-400 transition-colors">
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Load more sentinel */}
        <div ref={observerTarget} className="h-20" />
      </div>
    </div>
  );
}

interface CheckProps {
  className?: string;
}

function Check({ className }: CheckProps) {
  return (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
  </svg>
  );
}

export default SocialFeed;
