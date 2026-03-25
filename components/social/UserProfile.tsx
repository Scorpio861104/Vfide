'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Users,
  Calendar,
  MapPin,
  Share2,
  MessageCircle,
  Flame,
  Copy,
  CheckCircle2,
} from 'lucide-react';

// ==================== TYPES ====================

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  coverImage?: string;
  bio: string;
  location?: string;
  joinedAt: Date;
  proofScore: number;
  followers: number;
  following: number;
  friends: number;
  badges: Badge[];
  isVerified: boolean;
  isFollowing: boolean;
  isFriend: boolean;
  activityStreak: number;
  totalPoints: number;
  level: number;
  lastActive: Date;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: Date;
}

interface ActivityItem {
  id: string;
  type: 'achievement' | 'badge' | 'proposal' | 'governance' | 'transaction';
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  details?: Record<string, unknown>;
}

interface FriendInfo {
  id: string;
  displayName: string;
  avatar: string;
  proofScore: number;
  isMutual: boolean;
}

// ==================== COMPONENTS ====================

interface UserProfileProps {
  user?: UserProfile;
  isOwnProfile?: boolean;
}

export function UserProfileComponent({ user, isOwnProfile = false }: UserProfileProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'friends' | 'achievements' | 'badges'>('activity');
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-[#1A1A2E] to-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Profile not available.</p>
      </div>
    );
  }

  const handleCopyProfile = () => {
    navigator.clipboard.writeText(`https://vfide.app/profile/${user.username}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { key: 'activity', label: 'Activity', icon: '📊', count: 0 },
    { key: 'friends', label: 'Friends', icon: '👥', count: user.friends },
    { key: 'achievements', label: 'Achievements', icon: '🎯', count: 0 },
    { key: 'badges', label: 'Badges', icon: '🏆', count: user.badges.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-[#1A1A2E] to-zinc-950">
      {/* Cover Image */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative h-48 md:h-64 bg-gradient-to-r from-cyan-400/20 via-violet-400/20 to-rose-500/20"
      >
        {user.coverImage && (
          <Image src={user.coverImage} alt="cover" fill className="object-cover" sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
      </motion.div>

      {/* Profile Header */}
      <div className="relative px-4 md:px-8 pb-8">
        {/* Avatar */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col md:flex-row md:items-end gap-4 -mt-20 mb-6"
        >
          <div className="shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-400 p-1 shadow-2xl">
              <div className="w-full h-full rounded-xl bg-zinc-900 flex items-center justify-center text-6xl md:text-8xl">
                {user.avatar}
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-zinc-100">{user.displayName}</h1>
              {user.isVerified && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  title="Verified user"
                >
                  <CheckCircle2 className="w-8 h-8 text-cyan-400" />
                </motion.div>
              )}
            </div>
            <p className="text-zinc-400 text-lg mb-3">@{user.username}</p>

            {user.location && (
              <div className="flex items-center gap-2 text-zinc-400 mb-3">
                <MapPin className="w-4 h-4" />
                {user.location}
              </div>
            )}

            <p className="text-zinc-300 max-w-2xl mb-4">{user.bio}</p>

            <div className="flex items-center gap-2 text-sm text-zinc-400 mb-4">
              <Calendar className="w-4 h-4" />
              Joined {user.joinedAt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 shrink-0">
            {isOwnProfile ? (
              <button className="px-6 py-3 bg-cyan-400/20 border border-cyan-400 text-cyan-400 rounded-lg hover:bg-cyan-400/30 transition-colors font-semibold">
                Edit Profile
              </button>
            ) : (
              <>
                <button className="px-4 py-2 bg-cyan-400 text-zinc-950 rounded-lg hover:bg-cyan-400 transition-colors font-semibold">
                  {user.isFollowing ? 'Following' : 'Follow'}
                </button>
                <button className="px-4 py-2 bg-violet-400 text-white rounded-lg hover:bg-purple-500 transition-colors font-semibold">
                  {user.isFriend ? 'Friends' : 'Add Friend'}
                </button>
              </>
            )}

            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="px-4 py-2 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg hover:border-cyan-400 transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>

              <AnimatePresence>
                {showShareMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-10"
                  >
                    <button
                      onClick={handleCopyProfile}
                      className="w-full text-left px-4 py-3 text-zinc-100 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-b border-zinc-700"
                    >
                      {copied ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                    <button className="w-full text-left px-4 py-3 text-zinc-100 hover:bg-zinc-800 flex items-center gap-2 transition-colors border-b border-zinc-700">
                      <Share2 className="w-4 h-4" />
                      Share on X
                    </button>
                    <button className="w-full text-left px-4 py-3 text-zinc-100 hover:bg-zinc-800 flex items-center gap-2 transition-colors">
                      <MessageCircle className="w-4 h-4" />
                      Share Message
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center hover:border-cyan-400 transition-colors">
            <div className="text-cyan-400 text-2xl font-bold mb-1">{user.proofScore.toLocaleString()}</div>
            <div className="text-xs text-zinc-400">Proof Score</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center hover:border-violet-400 transition-colors">
            <div className="text-violet-400 text-2xl font-bold mb-1">{user.level}</div>
            <div className="text-xs text-zinc-400">Level</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center hover:border-emerald-500 transition-colors">
            <div className="text-emerald-500 text-2xl font-bold mb-1">{user.followers.toLocaleString()}</div>
            <div className="text-xs text-zinc-400">Followers</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center hover:border-pink-400 transition-colors">
            <div className="text-pink-400 text-2xl font-bold mb-1 flex items-center justify-center gap-1">
              <Flame className="w-5 h-5" />
              {user.activityStreak}
            </div>
            <div className="text-xs text-zinc-400">Day Streak</div>
          </div>

          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-center hover:border-amber-400 transition-colors">
            <div className="text-amber-400 text-2xl font-bold mb-1">{user.totalPoints.toLocaleString()}</div>
            <div className="text-xs text-zinc-400">Total Points</div>
          </div>
        </motion.div>

        {/* Badges Quick View */}
        {user.badges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h3 className="text-lg font-bold text-zinc-100 mb-4">Featured Badges</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {user.badges.slice(0, 4).map((badge) => (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: 1.1 }}
                  className={`shrink-0 relative group cursor-pointer`}
                >
                  <div
                    className={`w-20 h-20 rounded-xl flex items-center justify-center text-3xl border-2 ${
                      badge.rarity === 'common'
                        ? 'border-gray-500 bg-gray-500/10'
                        : badge.rarity === 'uncommon'
                          ? 'border-green-500 bg-green-500/10'
                          : badge.rarity === 'rare'
                            ? 'border-cyan-400 bg-cyan-400/10'
                            : badge.rarity === 'epic'
                              ? 'border-violet-400 bg-violet-400/10'
                              : 'border-yellow-500 bg-yellow-500/10'
                    }`}
                  >
                    {badge.icon}
                  </div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute inset-0 bg-black/80 rounded-xl flex flex-col items-center justify-center p-2"
                  >
                    <div className="text-xs font-bold text-center text-zinc-100">{badge.name}</div>
                    <div className="text-[10px] text-zinc-400 text-center mt-1">{badge.description}</div>
                  </motion.div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-700">
        <div className="px-4 md:px-8">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-3 font-semibold text-sm whitespace-nowrap border-b-2 transition-all ${
                  activeTab === tab.key
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-100'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label} <span className="text-xs ml-1">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {([] as ActivityItem[]).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 hover:border-cyan-400/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-2xl shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-zinc-100 font-semibold">{item.title}</h4>
                      <p className="text-zinc-400 text-sm">{item.description}</p>
                      <p className="text-zinc-500 text-xs mt-1">
                        {new Date(item.timestamp).toLocaleDateString()} at{' '}
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {([] as FriendInfo[]).map((friend, idx) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 hover:border-violet-400 transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
                      {friend.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-zinc-100 truncate">{friend.displayName}</h4>
                      {friend.isMutual && (
                        <div className="text-xs text-cyan-400 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          Mutual friends
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mb-3">
                    <div>
                      <div className="text-cyan-400 font-semibold">{friend.proofScore}</div>
                      <div className="text-zinc-400 text-xs">Proof Score</div>
                    </div>
                  </div>
                  <button className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 text-zinc-100 rounded hover:border-violet-400 transition-colors text-sm font-semibold">
                    View Profile
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Achievements Tab */}
          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {([] as Achievement[]).map((achievement, idx) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-zinc-900 border rounded-lg p-4 transition-colors ${
                    achievement.isUnlocked ? 'border-cyan-400' : 'border-zinc-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`text-4xl shrink-0 ${achievement.isUnlocked ? 'opacity-100' : 'opacity-50'}`}>
                      {achievement.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-zinc-100 mb-1">{achievement.title}</h4>
                      <p className="text-zinc-400 text-sm mb-3">{achievement.description}</p>
                      <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className={`h-full ${achievement.isUnlocked ? 'bg-gradient-to-r from-cyan-400 to-violet-400' : 'bg-zinc-700'}`}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-zinc-400">
                          {achievement.progress} / {achievement.maxProgress}
                        </span>
                        {achievement.isUnlocked && (
                          <span className="text-[10px] text-cyan-400 font-semibold">UNLOCKED</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Badges Tab */}
          {activeTab === 'badges' && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
            >
              {user.badges.map((badge, idx) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group cursor-pointer"
                >
                  <motion.div
                    whileHover={{ scale: 1.05, rotateZ: 5 }}
                    className={`w-full aspect-square rounded-xl flex items-center justify-center text-6xl border-2 mb-3 transition-colors ${
                      badge.rarity === 'common'
                        ? 'border-gray-500 bg-gray-500/10'
                        : badge.rarity === 'uncommon'
                          ? 'border-green-500 bg-green-500/10'
                          : badge.rarity === 'rare'
                            ? 'border-cyan-400 bg-cyan-400/10'
                            : badge.rarity === 'epic'
                              ? 'border-violet-400 bg-violet-400/10'
                              : 'border-yellow-500 bg-yellow-500/10'
                    }`}
                  >
                    {badge.icon}
                  </motion.div>
                  <h4 className="font-semibold text-zinc-100 text-center text-sm mb-1">{badge.name}</h4>
                  <p className="text-zinc-400 text-xs text-center">{badge.description}</p>
                  <div className="text-center mt-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded ${
                        badge.rarity === 'common'
                          ? 'text-gray-400 bg-gray-500/20'
                          : badge.rarity === 'uncommon'
                            ? 'text-green-400 bg-green-500/20'
                            : badge.rarity === 'rare'
                              ? 'text-cyan-400 bg-cyan-400/20'
                              : badge.rarity === 'epic'
                                ? 'text-violet-400 bg-violet-400/20'
                                : 'text-yellow-400 bg-yellow-500/20'
                      }`}
                    >
                      {badge.rarity.toUpperCase()}
                    </span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default UserProfileComponent;
