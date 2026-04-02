'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark,
  Flag,
  Heart,
  MessageSquare,
  MoreHorizontal,
  Repeat2,
  Share2,
  Shield,
  UserPlus,
} from 'lucide-react';

type SocialPost = {
  id?: string | number;
  author: {
    name: string;
    address?: string;
    avatar?: string;
    verified?: boolean;
    proofScore?: number;
  };
  content: string;
  timestamp?: string | number | Date;
  tags?: string[];
  media?: Array<{ url: string }>;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  liked?: boolean;
  bookmarked?: boolean;
  isFollowing?: boolean;
};

const formatNumber = (value: number | undefined) => new Intl.NumberFormat().format(value ?? 0);

const formatTimeAgo = (value: string | number | Date | undefined) => {
  if (!value) return 'just now';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'just now';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

export function PostCard({ post, onLike, onBookmark }: { post: SocialPost; onLike: () => void; onBookmark: () => void }) {
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
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 to-violet-400 flex items-center justify-center text-xl">
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
            <div className="absolute right-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-lg py-1 min-w-37.5 z-10">
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
            <img
              key={m.url}
              src={m.url}
              alt={`Post image ${index + 1}`}
              className="w-full h-64 object-cover"
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
