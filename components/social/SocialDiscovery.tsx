'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { safeParseInt } from '@/lib/validation';
import {
  Search,
  Filter,
  TrendingUp,
  Users,
  ChevronRight,
  Check,
  Sparkles,
  Flame,
} from 'lucide-react';

// ==================== TYPES ====================

interface UserCard {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  proofScore: number;
  followers: number;
  badges: number;
  isVerified: boolean;
  matchScore: number;
  reason: string;
  tags: string[];
}

interface DiscoverFilter {
  proofScoreMin?: number;
  proofScoreMax?: number;
  tags?: string[];
  sortBy: 'trending' | 'proofScore' | 'followers' | 'recent';
}

interface TrendingUser {
  id: string;
  displayName: string;
  avatar: string;
  trendingScore: number;
  trendingReason: string;
  newFollowers: number;
}

interface CommunityHighlight {
  id: string;
  title: string;
  description: string;
  participantCount: number;
  activity: string;
  icon: string;
}

// ==================== MOCK DATA ====================

const mockUserCards: UserCard[] = [
  {
    id: 'u1',
    username: 'alex_finance',
    displayName: 'Alex Rivera',
    avatar: '👨‍💼',
    bio: 'DeFi strategist and governance participant',
    proofScore: 9200,
    followers: 542,
    badges: 12,
    isVerified: true,
    matchScore: 94,
    reason: 'Shared interests',
    tags: ['DeFi', 'Governance', 'Trading'],
  },
  {
    id: 'u2',
    username: 'sara_merchant',
    displayName: 'Sara Chen',
    avatar: '👩‍🎤',
    bio: 'Payment processor and merchant portal expert',
    proofScore: 7800,
    followers: 423,
    badges: 9,
    isVerified: true,
    matchScore: 88,
    reason: 'Mutual followers',
    tags: ['Payments', 'Merchant', 'Finance'],
  },
  {
    id: 'u3',
    username: 'dev_john',
    displayName: 'John Park',
    avatar: '👨‍💻',
    bio: 'Smart contract developer building on VFIDE',
    proofScore: 8600,
    followers: 367,
    badges: 15,
    isVerified: true,
    matchScore: 82,
    reason: 'Active contributor',
    tags: ['Development', 'Smart Contracts', 'Tech'],
  },
  {
    id: 'u4',
    username: 'emma_community',
    displayName: 'Emma Wilson',
    avatar: '👩‍🔬',
    bio: 'Community organizer and trust builder',
    proofScore: 6900,
    followers: 612,
    badges: 8,
    isVerified: false,
    matchScore: 76,
    reason: 'Similar activity',
    tags: ['Community', 'Trust', 'Social'],
  },
  {
    id: 'u5',
    username: 'mark_vault',
    displayName: 'Mark Johnson',
    avatar: '🧑‍💼',
    bio: 'Vault master with 500k+ locked',
    proofScore: 7500,
    followers: 289,
    badges: 11,
    isVerified: true,
    matchScore: 79,
    reason: 'Similar interests',
    tags: ['Vault', 'Security', 'Finance'],
  },
];

const mockTrendingUsers: TrendingUser[] = [
  {
    id: 't1',
    displayName: 'Luna Tech',
    avatar: '🌙',
    trendingScore: 98,
    trendingReason: 'Viral governance proposal',
    newFollowers: 245,
  },
  {
    id: 't2',
    displayName: 'Crypto Kate',
    avatar: '👑',
    trendingScore: 94,
    trendingReason: 'Record transaction volume',
    newFollowers: 189,
  },
  {
    id: 't3',
    displayName: 'Felix Dev',
    avatar: '🦊',
    trendingScore: 89,
    trendingReason: 'Major contract deployment',
    newFollowers: 156,
  },
];

const mockHighlights: CommunityHighlight[] = [
  {
    id: 'h1',
    title: 'Governance Enthusiasts',
    description: 'Active participants in DAO proposals and voting',
    participantCount: 2341,
    activity: 'High',
    icon: '🗳️',
  },
  {
    id: 'h2',
    title: 'DeFi Traders',
    description: 'Strategic traders and yield farmers',
    participantCount: 1892,
    activity: 'Very High',
    icon: '📊',
  },
  {
    id: 'h3',
    title: 'Payment Merchants',
    description: 'Accepting payments and building commerce',
    participantCount: 1456,
    activity: 'High',
    icon: '💳',
  },
  {
    id: 'h4',
    title: 'Security & Vault Masters',
    description: 'Protecting assets and managing vaults',
    participantCount: 987,
    activity: 'Medium',
    icon: '🔒',
  },
  {
    id: 'h5',
    title: 'Community Builders',
    description: 'Growing networks and mentoring users',
    participantCount: 1234,
    activity: 'High',
    icon: '🤝',
  },
  {
    id: 'h6',
    title: 'Development Contributors',
    description: 'Building and improving the protocol',
    participantCount: 567,
    activity: 'Medium',
    icon: '⚙️',
  },
];

// ==================== COMPONENTS ====================

interface SocialDiscoveryProps {
  onSelectUser?: (userId: string) => void;
}

export function SocialDiscovery({ onSelectUser }: SocialDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<DiscoverFilter>({ sortBy: 'trending' });
  const [showFilters, setShowFilters] = useState(false);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    let results = mockUserCards;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(
        (u) =>
          u.displayName.toLowerCase().includes(query) ||
          u.username.toLowerCase().includes(query) ||
          u.bio.toLowerCase().includes(query),
      );
    }

    // Tag filter
    if (selectedTag) {
      results = results.filter((u) => u.tags.includes(selectedTag));
    }

    // ProofScore filter
    if (filter.proofScoreMin) {
      results = results.filter((u) => u.proofScore >= filter.proofScoreMin!);
    }
    if (filter.proofScoreMax) {
      results = results.filter((u) => u.proofScore <= filter.proofScoreMax!);
    }

    // Sort
    const sorted = [...results];
    switch (filter.sortBy) {
      case 'proofScore':
        sorted.sort((a, b) => b.proofScore - a.proofScore);
        break;
      case 'followers':
        sorted.sort((a, b) => b.followers - a.followers);
        break;
      case 'recent':
        sorted.reverse();
        break;
      case 'trending':
      default:
        sorted.sort((a, b) => b.matchScore - a.matchScore);
    }

    return sorted;
  }, [searchQuery, filter, selectedTag]);

  const allTags = Array.from(new Set(mockUserCards.flatMap((u) => u.tags)));

  const handleFollow = (userId: string) => {
    setFollowedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-zinc-950 via-[#1A1A2E] to-zinc-950">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-700 px-4 md:px-8 py-6"
      >
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">Discover Community</h1>

          {/* Search Bar */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search users, tags, or interests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-lg border transition-colors flex items-center gap-2 font-semibold ${
                showFilters
                  ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-cyan-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filters</span>
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm text-zinc-400 font-semibold mb-2 block">Min Proof Score</label>
                    <input
                      type="number"
                      value={filter.proofScoreMin || ''}
                      onChange={(e) => setFilter({ ...filter, proofScoreMin: e.target.value ? safeParseInt(e.target.value, 0, { min: 0 }) : undefined })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-cyan-400"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 font-semibold mb-2 block">Max Proof Score</label>
                    <input
                      type="number"
                      value={filter.proofScoreMax || ''}
                      onChange={(e) => setFilter({ ...filter, proofScoreMax: e.target.value ? safeParseInt(e.target.value, undefined, { max: 10000 }) : undefined })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-cyan-400"
                      placeholder="10000"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-zinc-400 font-semibold mb-2 block">Sort By</label>
                    <select
                      value={filter.sortBy}
                      onChange={(e) => setFilter({ ...filter, sortBy: e.target.value as DiscoverFilter['sortBy'] })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-zinc-100 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="trending">Trending</option>
                      <option value="proofScore">Proof Score</option>
                      <option value="followers">Followers</option>
                      <option value="recent">Recent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-zinc-400 font-semibold mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                          selectedTag === tag
                            ? 'bg-cyan-400 text-zinc-950'
                            : 'bg-zinc-800 text-zinc-400 hover:border-cyan-400'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Tags */}
          {!selectedTag && (
            <div className="flex flex-wrap gap-2">
              {allTags.slice(0, 5).map((tag) => (
                <motion.button
                  key={tag}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedTag(tag)}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
                >
                  #{tag}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        {/* Trending Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-6 h-6 text-pink-400" />
            <h2 className="text-2xl font-bold text-zinc-100">Trending Now</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockTrendingUsers.map((user, idx) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-linear-to-br from-zinc-900 via-[#2A2A3E] to-zinc-900 border border-pink-400/30 rounded-lg p-6 hover:border-pink-400 transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="text-5xl">{user.avatar}</div>
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="text-pink-400"
                  >
                    <Flame className="w-5 h-5" />
                  </motion.div>
                </div>

                <h3 className="text-lg font-bold text-zinc-100 mb-1">{user.displayName}</h3>
                <p className="text-sm text-zinc-400 mb-3">{user.trendingReason}</p>

                <div className="bg-zinc-950 rounded p-3 mb-4">
                  <div className="text-pink-400 text-2xl font-bold">{user.trendingScore}</div>
                  <div className="text-xs text-zinc-500">Trending Score</div>
                </div>

                <div className="text-sm text-zinc-400 mb-4">
                  <span className="text-cyan-400 font-semibold">+{user.newFollowers}</span> new followers
                </div>

                <button className="w-full px-4 py-2 bg-pink-400 text-white rounded-lg hover:bg-pink-500 transition-colors font-semibold text-sm group-hover:shadow-lg group-hover:shadow-pink-400/50">
                  Follow
                </button>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Community Highlights */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12"
        >
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-6 h-6 text-violet-400" />
            <h2 className="text-2xl font-bold text-zinc-100">Community Highlights</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockHighlights.map((highlight, idx) => (
              <motion.div
                key={highlight.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 hover:border-violet-400 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{highlight.icon}</div>
                  <div className="text-right">
                    <div className="text-cyan-400 text-sm font-bold">{highlight.participantCount}</div>
                    <div className="text-zinc-500 text-xs">members</div>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-zinc-100 mb-2">{highlight.title}</h3>
                <p className="text-zinc-400 text-sm mb-4">{highlight.description}</p>

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    highlight.activity === 'Very High'
                      ? 'bg-cyan-400/20 text-cyan-400'
                      : highlight.activity === 'High'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-amber-400/20 text-amber-400'
                  }`}>
                    {highlight.activity} Activity
                  </span>
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-violet-400 transition-colors" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* User Discovery Cards */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              <h2 className="text-2xl font-bold text-zinc-100">
                Recommended Users {filteredUsers.length > 0 && `(${filteredUsers.length})`}
              </h2>
            </div>
          </div>

          {filteredUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Search className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-100 mb-2">No results found</h3>
              <p className="text-zinc-400">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user, idx) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => onSelectUser?.(user.id)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-5 hover:border-cyan-400 transition-all group cursor-pointer"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shrink-0">
                      {user.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-zinc-100 truncate">{user.displayName}</h3>
                        {user.isVerified && (
                          <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Check className="w-4 h-4 text-cyan-400" />
                          </motion.div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">@{user.username}</p>
                    </div>

                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-xs font-bold bg-linear-to-r from-cyan-400 to-violet-400 text-transparent bg-clip-text shrink-0"
                    >
                      {user.matchScore}%
                    </motion.div>
                  </div>

                  <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{user.bio}</p>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4 pb-4 border-b border-zinc-700">
                    <div>
                      <div className="text-cyan-400 font-bold">{user.proofScore}</div>
                      <div className="text-zinc-500">Score</div>
                    </div>
                    <div>
                      <div className="text-violet-400 font-bold">{user.followers}</div>
                      <div className="text-zinc-500">Followers</div>
                    </div>
                    <div>
                      <div className="text-emerald-500 font-bold">{user.badges}</div>
                      <div className="text-zinc-500">Badges</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {user.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-cyan-400">
                        #{tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-zinc-500 mb-4">💡 {user.reason}</p>

                  <button
                    onClick={() => handleFollow(user.id)}
                    className={`w-full px-3 py-2 rounded-lg font-semibold text-sm transition-all ${
                      followedUsers.has(user.id)
                        ? 'bg-cyan-400/20 border border-cyan-400 text-cyan-400'
                        : 'bg-cyan-400 text-zinc-950 hover:bg-cyan-400'
                    }`}
                  >
                    {followedUsers.has(user.id) ? '✓ Following' : 'Follow'}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}

export default SocialDiscovery;
