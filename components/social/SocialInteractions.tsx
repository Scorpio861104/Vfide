'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  Users,
  Flame,
  CheckCircle2,
  Award,
} from 'lucide-react';

// ==================== TYPES ====================

interface FriendRequest {
  id: string;
  from: {
    id: string;
    avatar: string;
    name: string;
    username: string;
    proofScore: number;
  };
  mutualFriends: number;
  mutualInterests: string[];
  timestamp: Date;
}

interface Message {
  id: string;
  from: {
    id: string;
    avatar: string;
    name: string;
    username: string;
  };
  content: string;
  timestamp: Date;
  read: boolean;
}

interface LeaderboardEntry {
  rank: number;
  user: {
    id: string;
    avatar: string;
    name: string;
    username: string;
    isVerified: boolean;
  };
  score: number;
  change: number;
  badges: number;
  streak: number;
  icon: string;
}

interface ActivityStreak {
  userId: string;
  username: string;
  avatar: string;
  currentStreak: number;
  longestStreak: number;
  lastActivity: Date;
  activities: string[];
}

// ==================== MOCK DATA ====================

const mockFriendRequests: FriendRequest[] = [
  {
    id: 'fr1',
    from: {
      id: 'u20',
      avatar: '👩‍⚕️',
      name: 'Lisa Martinez',
      username: 'lisa_med',
      proofScore: 6800,
    },
    mutualFriends: 3,
    mutualInterests: ['DeFi', 'Governance'],
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'fr2',
    from: {
      id: 'u21',
      avatar: '🎨',
      name: 'Carlos Designer',
      username: 'carlos_art',
      proofScore: 5200,
    },
    mutualFriends: 1,
    mutualInterests: ['Community'],
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

const mockMessages: Message[] = [
  {
    id: 'm1',
    from: {
      id: 'u1',
      avatar: '👨‍💼',
      name: 'Alex Rivera',
      username: 'alex_finance',
    },
    content: 'Hey! Great contribution to the governance forum. Want to collaborate?',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: false,
  },
  {
    id: 'm2',
    from: {
      id: 'u2',
      avatar: '👩‍🎤',
      name: 'Sara Chen',
      username: 'sara_merchant',
    },
    content: 'Thanks for the referral! 🎉 Your friend just set up their first merchant account.',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    read: true,
  },
];

const mockLeaderboards = {
  proofScore: [
    {
      rank: 1,
      user: { id: 'u1', avatar: '👑', name: 'King Crypto', username: 'king_crypto', isVerified: true },
      score: 12500,
      change: 2,
      badges: 28,
      streak: 145,
      icon: '🥇',
    },
    {
      rank: 2,
      user: { id: 'u2', avatar: '💎', name: 'Diamond Hands', username: 'diamond_hands', isVerified: true },
      score: 11800,
      change: -1,
      badges: 26,
      streak: 98,
      icon: '🥈',
    },
    {
      rank: 3,
      user: { id: 'u3', avatar: '⚡', name: 'Lightning Fast', username: 'lightning_fast', isVerified: true },
      score: 10200,
      change: 3,
      badges: 22,
      streak: 67,
      icon: '🥉',
    },
    {
      rank: 4,
      user: { id: 'u4', avatar: '🔥', name: 'Hot Stuff', username: 'hot_stuff', isVerified: false },
      score: 9100,
      change: 5,
      badges: 19,
      streak: 45,
      icon: '4️⃣',
    },
    {
      rank: 5,
      user: { id: 'u5', avatar: '🚀', name: 'Rocket Man', username: 'rocket_man', isVerified: true },
      score: 8700,
      change: -2,
      badges: 18,
      streak: 34,
      icon: '5️⃣',
    },
  ] as LeaderboardEntry[],
  badges: [
    {
      rank: 1,
      user: { id: 'u6', avatar: '🏆', name: 'Badge Collector', username: 'badge_collector', isVerified: true },
      score: 42,
      change: 1,
      badges: 42,
      streak: 120,
      icon: '🥇',
    },
    {
      rank: 2,
      user: { id: 'u7', avatar: '🎖️', name: 'Honored One', username: 'honored_one', isVerified: true },
      score: 38,
      change: 0,
      badges: 38,
      streak: 95,
      icon: '🥈',
    },
    {
      rank: 3,
      user: { id: 'u8', avatar: '⭐', name: 'Star Player', username: 'star_player', isVerified: false },
      score: 35,
      change: 2,
      badges: 35,
      streak: 78,
      icon: '🥉',
    },
  ] as LeaderboardEntry[],
};

const mockStreaks: ActivityStreak[] = [
  {
    userId: 'u1',
    username: 'alex_finance',
    avatar: '👨‍💼',
    currentStreak: 145,
    longestStreak: 156,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    activities: ['transaction', 'vote', 'engagement'],
  },
  {
    userId: 'u2',
    username: 'luna_dev',
    avatar: '🌙',
    currentStreak: 98,
    longestStreak: 178,
    lastActivity: new Date(Date.now() - 1 * 60 * 60 * 1000),
    activities: ['achievement', 'governance'],
  },
  {
    userId: 'u3',
    username: 'emma_community',
    avatar: '👩‍🔬',
    currentStreak: 67,
    longestStreak: 89,
    lastActivity: new Date(Date.now() - 3 * 60 * 60 * 1000),
    activities: ['social', 'referral'],
  },
];

// ==================== COMPONENTS ====================

interface SocialInteractionsProps {
  currentUserId?: string;
}

export function SocialInteractions({ currentUserId: _currentUserId = 'current_user' }: SocialInteractionsProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'messages' | 'leaderboards' | 'streaks'>('requests');
  const [leaderboardType, setLeaderboardType] = useState<'proofScore' | 'badges'>('proofScore');
  const [_expandedRequestId, _setExpandedRequestId] = useState<string | null>(null);
  const [acceptedRequests, setAcceptedRequests] = useState<Set<string>>(new Set());
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());

  const unreadCount = useMemo(() => {
    return mockMessages.filter((m) => !m.read && !readMessages.has(m.id)).length;
  }, [readMessages]);

  const handleAcceptRequest = (requestId: string) => {
    setAcceptedRequests((prev) => {
      const newSet = new Set(prev);
      newSet.add(requestId);
      return newSet;
    });
  };

  const handleMarkAsRead = (messageId: string) => {
    setReadMessages((prev) => {
      const newSet = new Set(prev);
      newSet.add(messageId);
      return newSet;
    });
  };

  const tabs = [
    { key: 'requests', label: 'Friend Requests', icon: '👥', count: mockFriendRequests.length - acceptedRequests.size },
    { key: 'messages', label: 'Messages', icon: '💬', count: unreadCount },
    { key: 'leaderboards', label: 'Leaderboards', icon: '🏆', count: undefined },
    { key: 'streaks', label: 'Activity Streaks', icon: '🔥', count: undefined },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-[#1A1A2E] to-zinc-950">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-700 px-4 md:px-8 py-6"
      >
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-6">Social Interactions</h1>

          {/* Tab Navigation */}
          <div className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                  activeTab === tab.key
                    ? 'bg-cyan-400 text-zinc-950'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-1 px-2 py-0.5 bg-pink-400 text-white rounded-full text-xs font-bold">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="px-4 md:px-8 py-8 max-w-6xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Friend Requests Tab */}
          {activeTab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {mockFriendRequests.map((request, idx) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-zinc-900 border transition-all rounded-lg p-6 ${
                    acceptedRequests.has(request.id)
                      ? 'border-emerald-500/50 bg-emerald-500/5'
                      : 'border-zinc-700 hover:border-cyan-400'
                  }`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl shrink-0">
                      {request.from.avatar}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-zinc-100">{request.from.name}</h3>
                        <span className="text-zinc-400">@{request.from.username}</span>
                      </div>

                      <div className="text-sm text-cyan-400 font-semibold mb-2">
                        {request.from.proofScore} Proof Score
                      </div>

                      {request.mutualFriends > 0 && (
                        <div className="text-sm text-zinc-400 mb-2">
                          <Users className="w-4 h-4 inline mr-1" />
                          {request.mutualFriends} mutual friends
                        </div>
                      )}

                      {request.mutualInterests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {request.mutualInterests.map((interest) => (
                            <span key={interest} className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-violet-400">
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-zinc-500">
                        Requested {new Date(request.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {acceptedRequests.has(request.id) ? (
                    <motion.button
                      initial={{ scale: 0.9 }}
                      animate={{ scale: 1 }}
                      disabled
                      className="w-full px-4 py-3 bg-emerald-500/20 border border-emerald-500 text-emerald-500 rounded-lg font-semibold flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Friends
                    </motion.button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        className="flex-1 px-4 py-3 bg-cyan-400 text-zinc-950 rounded-lg hover:bg-cyan-400 transition-all font-semibold"
                      >
                        Accept
                      </button>
                      <button className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 text-zinc-400 rounded-lg hover:border-pink-400 transition-colors font-semibold">
                        Decline
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <motion.div
              key="messages"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {mockMessages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-zinc-100 mb-2">No messages</h3>
                  <p className="text-zinc-400">Start a conversation with your friends</p>
                </div>
              ) : (
                mockMessages.map((message, idx) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => handleMarkAsRead(message.id)}
                    className={`bg-zinc-900 border rounded-lg p-5 hover:border-violet-400 transition-all cursor-pointer ${
                      !message.read && !readMessages.has(message.id)
                        ? 'border-violet-400 bg-violet-400/5'
                        : 'border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start gap-4 mb-3">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-2xl shrink-0">
                        {message.from.avatar}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-zinc-100">{message.from.name}</h3>
                          <span className="text-zinc-400 text-sm">@{message.from.username}</span>
                        </div>
                        <p className="text-xs text-zinc-500">
                          {new Date(message.timestamp).toLocaleDateString()} at{' '}
                          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {!message.read && !readMessages.has(message.id) && (
                        <div className="w-3 h-3 rounded-full bg-violet-400 shrink-0 mt-1" />
                      )}
                    </div>

                    <p className="text-zinc-300 mb-3">{message.content}</p>

                    <button className="text-sm text-cyan-400 hover:text-cyan-400 transition-colors font-semibold">
                      Reply →
                    </button>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {/* Leaderboards Tab */}
          {activeTab === 'leaderboards' && (
            <motion.div
              key="leaderboards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-6 flex gap-3">
                {(['proofScore', 'badges'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setLeaderboardType(type)}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      leaderboardType === type
                        ? 'bg-amber-400 text-zinc-950'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                    }`}
                  >
                    {type === 'proofScore' ? '📊 Proof Score' : '🏆 Badges'}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {mockLeaderboards[leaderboardType].map((entry, idx) => (
                  <motion.div
                    key={entry.user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`bg-zinc-900 border rounded-lg p-4 transition-all hover:border-amber-400/50 group`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-3xl font-bold text-amber-400 w-16 text-center">{entry.icon}</div>

                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-xl shrink-0">
                          {entry.user.avatar}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-zinc-100">{entry.user.name}</h4>
                            {entry.user.isVerified && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                          </div>
                          <p className="text-xs text-zinc-400">@{entry.user.username}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-amber-400">{entry.score}</div>
                        <div className={`text-xs font-semibold ${entry.change > 0 ? 'text-emerald-500' : entry.change < 0 ? 'text-pink-400' : 'text-zinc-500'}`}>
                          {entry.change > 0 ? '↑' : entry.change < 0 ? '↓' : '='} {Math.abs(entry.change)}
                        </div>
                      </div>
                    </div>

                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      whileHover={{ opacity: 1, height: 'auto' }}
                      className="mt-3 pt-3 border-t border-zinc-700 text-xs text-zinc-400"
                    >
                      <div className="flex gap-4">
                        <div className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {entry.badges} badges
                        </div>
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {entry.streak} day streak
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Activity Streaks Tab */}
          {activeTab === 'streaks' && (
            <motion.div
              key="streaks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {mockStreaks.map((streak, idx) => (
                <motion.div
                  key={streak.userId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-gradient-to-r from-zinc-900 to-zinc-800 border border-zinc-700 rounded-lg p-6 hover:border-pink-400/50 transition-colors"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl shrink-0">
                      {streak.avatar}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-zinc-100">{streak.username}</h3>
                      <div className="flex items-center gap-2 text-pink-400 font-bold text-lg mt-1">
                        <Flame className="w-5 h-5" />
                        {streak.currentStreak} day streak
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm text-zinc-400 mb-1">Personal best</div>
                      <div className="text-2xl font-bold text-amber-400">{streak.longestStreak}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4 pb-4 border-b border-zinc-700">
                    <div>
                      <div className="text-cyan-400 font-bold">1 day ago</div>
                      <div className="text-xs text-zinc-500">Last activity</div>
                    </div>
                    <div className="text-center">
                      <div className="inline-block px-3 py-2 bg-pink-400/20 text-pink-400 rounded-lg text-sm font-semibold">
                        On Fire! 🔥
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-emerald-500 font-bold">{streak.activities.length}</div>
                      <div className="text-xs text-zinc-500">Activity types</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs text-zinc-400 font-semibold mb-2">Recent Activities</h4>
                    <div className="flex flex-wrap gap-2">
                      {streak.activities.map((activity) => {
                        const activityEmojis: Record<string, string> = {
                          transaction: '💳',
                          vote: '🗳️',
                          engagement: '💬',
                          achievement: '🏆',
                          governance: '⚙️',
                          social: '👥',
                          referral: '🤝',
                        };
                        return (
                          <span
                            key={activity}
                            className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-sm"
                          >
                            {activityEmojis[activity] || '•'} {activity}
                          </span>
                        );
                      })}
                    </div>
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

export default SocialInteractions;
