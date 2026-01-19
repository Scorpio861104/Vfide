/**
 * User Profile Component - Enhanced
 * 
 * Features:
 * - Animated stats counters with Framer Motion
 * - Activity heatmap calendar
 * - Badge showcase carousel with 3D effects
 * - Share profile QR code modal
 * - Inline bio editing with hover reveal
 * - Animated social connections
 * - Achievement timeline
 * - Mobile-responsive design
 */

'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { MobileButton, MobileInput } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';
import { AvatarUploadCompact } from './AvatarUpload';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { 
  Share2, Copy, Check, QrCode, ChevronLeft, ChevronRight, 
  Edit2, X, ExternalLink, Twitter, Github, Globe, MapPin, 
  Calendar, TrendingUp, Award, Zap, Users, MessageSquare
} from 'lucide-react';
import { useTransactionSounds } from '@/hooks/useTransactionSounds';

// ==================== TYPES ====================

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  email: string;
  bio: string;
  avatar?: string;
  joinedDate: Date;
  location?: string;
  website?: string;
  twitter?: string;
  github?: string;
}

interface UserStats {
  totalActivities: number;
  badgesEarned: number;
  votescast: number;
  transactionsCount: number;
  governanceScore: number;
  proofScore: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedDate: Date;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  timestamp: Date;
}

interface ActivityHeatmapDay {
  date: Date;
  count: number;
}

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showActivities: boolean;
  showBadges: boolean;
  showStats: boolean;
  allowMessages: boolean;
}

interface SocialConnections {
  followers: number;
  following: number;
  friends: number;
}

// ==================== MOCK DATA ====================

const generateMockProfile = (): UserProfile => ({
  id: 'user-1',
  username: 'johndoe',
  displayName: 'John Doe',
  email: 'john.doe@example.com',
  bio: 'Blockchain enthusiast and early adopter of Vfide. Passionate about decentralized governance and community-driven projects.',
  avatar: '👤',
  joinedDate: new Date('2024-01-15'),
  location: 'San Francisco, CA',
  website: 'https://johndoe.com',
  twitter: '@johndoe',
  github: 'johndoe',
});

const generateMockStats = (): UserStats => ({
  totalActivities: 247,
  badgesEarned: 12,
  votescast: 45,
  transactionsCount: 89,
  governanceScore: 850,
  proofScore: 1250,
});

const generateMockBadges = (): Badge[] => [
  {
    id: 'badge-1',
    name: 'Early Adopter',
    description: 'Joined in the first month',
    icon: '🚀',
    earnedDate: new Date('2024-01-20'),
    rarity: 'legendary',
  },
  {
    id: 'badge-2',
    name: 'Active Voter',
    description: 'Participated in 25+ votes',
    icon: '🗳️',
    earnedDate: new Date('2024-03-15'),
    rarity: 'epic',
  },
  {
    id: 'badge-3',
    name: 'Transaction Master',
    description: 'Completed 50+ transactions',
    icon: '💰',
    earnedDate: new Date('2024-05-10'),
    rarity: 'rare',
  },
  {
    id: 'badge-4',
    name: 'Community Builder',
    description: 'Referred 10+ users',
    icon: '🤝',
    earnedDate: new Date('2024-07-01'),
    rarity: 'rare',
  },
  {
    id: 'badge-5',
    name: 'Governance Pro',
    description: 'Created 5+ proposals',
    icon: '📜',
    earnedDate: new Date('2024-08-20'),
    rarity: 'epic',
  },
  {
    id: 'badge-6',
    name: 'Streak Champion',
    description: '30 day activity streak',
    icon: '🔥',
    earnedDate: new Date('2024-09-15'),
    rarity: 'common',
  },
];

const generateMockRecentActivities = (): RecentActivity[] => [
  {
    id: 'act-1',
    type: 'vote',
    title: 'Voted on Treasury Proposal #42',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: 'act-2',
    type: 'transaction',
    title: 'Received 500 USDC',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: 'act-3',
    type: 'badge',
    title: 'Earned "Streak Champion" badge',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
];

const generateMockPrivacySettings = (): PrivacySettings => ({
  profileVisibility: 'public',
  showEmail: false,
  showActivities: true,
  showBadges: true,
  showStats: true,
  allowMessages: true,
});

const generateMockSocialConnections = (): SocialConnections => ({
  followers: 156,
  following: 89,
  friends: 42,
});

const generateActivityHeatmap = (): ActivityHeatmapDay[] => {
  const days: ActivityHeatmapDay[] = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    days.push({
      date,
      count: Math.random() > 0.3 ? Math.floor(Math.random() * 12) : 0
    });
  }
  return days.reverse();
};

// ==================== HELPER FUNCTIONS ====================

const getRarityColor = (rarity: Badge['rarity']): string => {
  const colors: Record<Badge['rarity'], string> = {
    common: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    rare: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    epic: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    legendary: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };
  return colors[rarity];
};

const formatJoinDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const formatTimeAgo = (timestamp: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat('en-US').format(timestamp);
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateUsername = (username: string): boolean => {
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

const validateUrl = (url: string): boolean => {
  if (!url) return true; // Empty is valid
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ==================== SUB-COMPONENTS ====================

// Animated Counter Component
function AnimatedCounter({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const animation = animate(count, value, { duration, ease: 'easeOut' });
    const unsubscribe = rounded.on('change', v => setDisplayValue(v));
    return () => {
      animation.stop();
      unsubscribe();
    };
  }, [value, count, rounded, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
}

// Activity Heatmap Component
function ActivityHeatmap({ data }: { data: ActivityHeatmapDay[] }) {
  const weeks = useMemo(() => {
    const result: ActivityHeatmapDay[][] = [];
    let week: ActivityHeatmapDay[] = [];
    data.forEach((day, i) => {
      week.push(day);
      if ((i + 1) % 7 === 0) {
        result.push(week);
        week = [];
      }
    });
    if (week.length > 0) result.push(week);
    return result.slice(-52); // Last 52 weeks
  }, [data]);

  const getColor = (count: number) => {
    if (count === 0) return 'bg-[#1A1A1F]';
    if (count <= 2) return 'bg-green-900/50';
    if (count <= 5) return 'bg-green-700/70';
    if (count <= 8) return 'bg-green-500';
    return 'bg-green-400';
  };

  const totalContributions = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-[#0F0F14] rounded-xl p-4 border border-[#2A2A2F]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Activity Contributions</h3>
        <span className="text-xs text-[#A0A0A5]">{totalContributions} in the last year</span>
      </div>
      <div className="overflow-x-auto">
        <div className="flex gap-[2px] min-w-max">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px]">
              {week.map((day, di) => (
                <motion.div
                  key={`${wi}-${di}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: (wi * 7 + di) * 0.001 }}
                  className={`w-3 h-3 rounded-sm ${getColor(day.count)}`}
                  title={`${day.date.toLocaleDateString()}: ${day.count} activities`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 text-xs text-[#A0A0A5]">
        <span>Less</span>
        {[0, 2, 5, 8, 12].map(n => (
          <div key={n} className={`w-3 h-3 rounded-sm ${getColor(n)}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

// Badge Carousel Component
function BadgeCarousel({ badges }: { badges: Badge[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { playSound } = useTransactionSounds();

  const next = () => {
    playSound('click');
    setCurrentIndex(prev => (prev + 1) % badges.length);
  };
  const prev = () => {
    playSound('click');
    setCurrentIndex(prev => (prev - 1 + badges.length) % badges.length);
  };

  if (badges.length === 0) return null;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Badge Showcase</h3>
        <div className="flex gap-2">
          <button onClick={prev} className="p-2 bg-[#1A1A1F] rounded-lg hover:bg-[#2A2A3F] transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#A0A0A5]" />
          </button>
          <button onClick={next} className="p-2 bg-[#1A1A1F] rounded-lg hover:bg-[#2A2A3F] transition-colors">
            <ChevronRight className="w-4 h-4 text-[#A0A0A5]" />
          </button>
        </div>
      </div>
      <div className="relative h-48 overflow-hidden">
        <AnimatePresence mode="popLayout">
          {badges.map((badge, i) => {
            const offset = i - currentIndex;
            const isActive = i === currentIndex;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, x: 300, rotateY: 45 }}
                animate={{
                  opacity: Math.abs(offset) > 1 ? 0 : 1 - Math.abs(offset) * 0.3,
                  x: offset * 120,
                  scale: isActive ? 1 : 0.85,
                  rotateY: offset * -15,
                  zIndex: badges.length - Math.abs(offset)
                }}
                exit={{ opacity: 0, x: -300, rotateY: -45 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute left-1/2 -translate-x-1/2 w-40"
                style={{ perspective: 1000 }}
              >
                <div className={`bg-gradient-to-br ${
                  badge.rarity === 'legendary' ? 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50' :
                  badge.rarity === 'epic' ? 'from-purple-500/20 to-pink-500/20 border-purple-500/50' :
                  badge.rarity === 'rare' ? 'from-blue-500/20 to-cyan-500/20 border-blue-500/50' :
                  'from-gray-500/20 to-gray-600/20 border-gray-500/50'
                } border rounded-xl p-4 text-center ${isActive ? 'shadow-2xl' : ''}`}>
                  <motion.div 
                    className="text-5xl mb-2"
                    animate={isActive ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {badge.icon}
                  </motion.div>
                  <h4 className="font-bold text-white text-sm truncate">{badge.name}</h4>
                  <p className="text-xs text-[#A0A0A5] truncate">{badge.description}</p>
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    badge.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-400' :
                    badge.rarity === 'epic' ? 'bg-purple-500/20 text-purple-400' :
                    badge.rarity === 'rare' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {badge.rarity}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-1 mt-4">
        {badges.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === currentIndex ? 'bg-[#FFD700] w-4' : 'bg-[#2A2A3F]'}`}
          />
        ))}
      </div>
    </div>
  );
}

// Share Profile Modal
function ShareProfileModal({ profile, onClose }: { profile: UserProfile; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const profileUrl = typeof window !== 'undefined' ? `${window.location.origin}/profile/${profile.username}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  const shareToTwitter = () => {
    const text = `Check out ${profile.displayName}'s profile on VFIDE!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(profileUrl)}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1A1A1F] border border-[#2A2A2F] rounded-2xl p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Share Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-[#2A2A3F] rounded-lg transition-colors">
            <X className="w-5 h-5 text-[#A0A0A5]" />
          </button>
        </div>

        {/* QR Code Placeholder */}
        <div className="bg-white rounded-xl p-4 mb-6">
          <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
              <p className="text-xs text-gray-500">QR Code for {profile.username}</p>
            </div>
          </div>
        </div>

        {/* Share Link */}
        <div className="bg-[#0F0F14] rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={profileUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-[#A0A0A5] truncate outline-none"
            />
            <button onClick={copyLink} className="p-2 hover:bg-[#2A2A3F] rounded-lg transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-[#A0A0A5]" />}
            </button>
          </div>
        </div>

        {/* Share Options */}
        <div className="flex gap-2">
          <button
            onClick={shareToTwitter}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#1DA1F2]/20 text-[#1DA1F2] rounded-lg hover:bg-[#1DA1F2]/30 transition-colors"
          >
            <Twitter className="w-4 h-4" />
            Twitter
          </button>
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#FFD700]/20 text-[#FFD700] rounded-lg hover:bg-[#FFD700]/30 transition-colors"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
  animated?: boolean;
}

function StatCard({ label, value, icon, color = 'blue', animated = true }: StatCardProps) {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    green: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    purple: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    orange: 'from-orange-500/20 to-yellow-500/20 border-orange-500/30',
    gold: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
  };

  const iconColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    orange: 'text-orange-400',
    gold: 'text-yellow-400',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`bg-gradient-to-br ${colorClasses[color] || colorClasses.blue} border rounded-xl p-4 transition-all`}
    >
      <div className="flex items-center gap-3">
        <motion.div
          className="text-3xl"
          whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
          transition={{ duration: 0.3 }}
        >
          {icon}
        </motion.div>
        <div>
          <p className={`text-2xl font-bold ${iconColors[color] || 'text-white'}`}>
            {typeof value === 'number' && animated ? (
              <AnimatedCounter value={value} />
            ) : (
              value
            )}
          </p>
          <p className="text-sm text-[#A0A0A5]">{label}</p>
        </div>
      </div>
    </motion.div>
  );
};

interface BadgeCardProps {
  badge: Badge;
}

function BadgeCard({ badge }: BadgeCardProps) {
  const rarityStyles = {
    legendary: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50 shadow-yellow-500/20',
    epic: 'from-purple-500/20 to-pink-500/20 border-purple-500/50 shadow-purple-500/20',
    rare: 'from-blue-500/20 to-cyan-500/20 border-blue-500/50 shadow-blue-500/20',
    common: 'from-gray-500/10 to-gray-600/10 border-gray-500/30'
  };

  const rarityTextColors = {
    legendary: 'text-yellow-400',
    epic: 'text-purple-400',
    rare: 'text-blue-400',
    common: 'text-gray-400'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -5 }}
      className={`bg-gradient-to-br ${rarityStyles[badge.rarity]} border rounded-xl p-5 shadow-lg cursor-pointer transition-all`}
    >
      <div className="text-center">
        <motion.div 
          className="text-5xl mb-3"
          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.2 }}
          transition={{ duration: 0.3 }}
        >
          {badge.icon}
        </motion.div>
        <h3 className="font-bold text-white text-lg mb-1">{badge.name}</h3>
        <p className="text-sm text-[#A0A0A5] mb-3">{badge.description}</p>
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${rarityTextColors[badge.rarity]} bg-black/20`}>
          {badge.rarity}
        </span>
        <p className="text-xs text-[#606065] mt-2">
          Earned {formatTimeAgo(badge.earnedDate)}
        </p>
      </div>
    </motion.div>
  );
};

interface ActivityItemProps {
  activity: RecentActivity;
  index?: number;
}

function ActivityItem({ activity, index = 0 }: ActivityItemProps) {
  const getActivityIcon = (type: string): string => {
    const icons: Record<string, string> = {
      vote: '🗳️',
      transaction: '💰',
      badge: '🏆',
      proposal: '📝',
      merchant: '🏪',
    };
    return icons[type] || '📌';
  };

  const getActivityColor = (type: string): string => {
    const colors: Record<string, string> = {
      vote: 'from-purple-500/20 to-purple-600/20',
      transaction: 'from-green-500/20 to-green-600/20',
      badge: 'from-yellow-500/20 to-yellow-600/20',
      proposal: 'from-blue-500/20 to-blue-600/20',
      merchant: 'from-orange-500/20 to-orange-600/20',
    };
    return colors[type] || 'from-gray-500/20 to-gray-600/20';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ x: 5 }}
      className={`flex items-center gap-3 p-4 bg-gradient-to-r ${getActivityColor(activity.type)} rounded-xl transition-all cursor-pointer`}
    >
      <motion.div 
        className="text-2xl"
        whileHover={{ scale: 1.2 }}
      >
        {getActivityIcon(activity.type)}
      </motion.div>
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{activity.title}</p>
        <p className="text-xs text-[#A0A0A5]">{formatTimeAgo(activity.timestamp)}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[#A0A0A5]" />
    </motion.div>
  );
};

// ==================== MAIN COMPONENT ====================

export default function UserProfile() {
  // State
  const [profile, setProfile] = useState<UserProfile>(generateMockProfile());
  const [stats] = useState<UserStats>(generateMockStats());
  const [badges] = useState<Badge[]>(generateMockBadges());
  const [recentActivities] = useState<RecentActivity[]>(generateMockRecentActivities());
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(generateMockPrivacySettings());
  const [socialConnections] = useState<SocialConnections>(generateMockSocialConnections());
  const [activityHeatmap] = useState<ActivityHeatmapDay[]>(generateActivityHeatmap());
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'activity' | 'settings'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { playSound } = useTransactionSounds();

  // Validation
  const validateProfile = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editedProfile.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!validateUsername(editedProfile.username)) {
      newErrors.username = 'Username must be 3-20 characters (letters, numbers, underscore)';
    }

    if (!editedProfile.displayName.trim()) {
      newErrors.displayName = 'Display name is required';
    }

    if (!editedProfile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(editedProfile.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (editedProfile.website && !validateUrl(editedProfile.website)) {
      newErrors.website = 'Please enter a valid URL';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [editedProfile]);

  // Handlers
  const handleEditClick = useCallback(() => {
    setEditedProfile(profile);
    setIsEditing(true);
    setErrors({});
  }, [profile]);

  const handleCancelEdit = useCallback(() => {
    setEditedProfile(profile);
    setIsEditing(false);
    setErrors({});
  }, [profile]);

  const handleSaveProfile = useCallback(() => {
    if (validateProfile()) {
      setProfile(editedProfile);
      setIsEditing(false);
      setErrors({});
      playSound('success');
      // In real app: API call to save profile
    }
  }, [editedProfile, validateProfile, playSound]);

  const handleSaveBio = useCallback((newBio: string) => {
    setProfile(prev => ({ ...prev, bio: newBio }));
    setEditingBio(false);
    playSound('success');
  }, [playSound]);

  const handleProfileChange = useCallback((field: keyof UserProfile, value: string) => {
    setEditedProfile((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  const handlePrivacyChange = useCallback((field: keyof PrivacySettings, value: any) => {
    setPrivacySettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAvatarUpload = useCallback((avatarUrl: string) => {
    // Update profile with new avatar
    setProfile((prev) => ({ ...prev, avatar: avatarUrl }));
    setEditedProfile((prev) => ({ ...prev, avatar: avatarUrl }));
  }, []);

  // Computed values
  const sortedBadges = useMemo(() => {
    const rarityOrder: Record<Badge['rarity'], number> = {
      legendary: 0,
      epic: 1,
      rare: 2,
      common: 3,
    };
    return [...badges].sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
  }, [badges]);

  // Render functions
  const renderOverviewTab = () => (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Profile Header - Enhanced */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-[#1A1A1F] to-[#0F0F14] rounded-2xl p-6 border border-[#2A2A2F] relative overflow-hidden"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="absolute inset-0" 
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6 relative z-10">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            {isEditing ? (
              <AvatarUploadCompact
                currentAvatar={profile.avatar}
                onUploadComplete={handleAvatarUpload}
              />
            ) : (
              <motion.div 
                className="relative group"
                whileHover={{ scale: 1.05 }}
              >
                <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#FFA500] flex items-center justify-center text-6xl shadow-lg shadow-yellow-500/20">
                  {profile.avatar ? (
                    typeof profile.avatar === 'string' && profile.avatar.startsWith('http') ? (
                      <img src={profile.avatar} alt="Avatar" className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      profile.avatar
                    )
                  ) : '👤'}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-4 border-[#1A1A1F] rounded-full" />
              </motion.div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#A0A0A5] mb-1">
                    Username *
                  </label>
                  <MobileInput
                    type="text"
                    value={editedProfile.username}
                    onChange={(e) => handleProfileChange('username', e.target.value)}
                    error={errors.username}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A0A0A5] mb-1">
                    Display Name *
                  </label>
                  <MobileInput
                    type="text"
                    value={editedProfile.displayName}
                    onChange={(e) => handleProfileChange('displayName', e.target.value)}
                    error={errors.displayName}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#A0A0A5] mb-1">
                    Email *
                  </label>
                  <MobileInput
                    type="email"
                    value={editedProfile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    error={errors.email}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-1">
                      {profile.displayName}
                    </h1>
                    <p className="text-lg text-[#A0A0A5] mb-3">@{profile.username}</p>
                  </div>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="p-2 bg-[#2A2A3F] hover:bg-[#3A3A4F] rounded-xl transition-colors group"
                    title="Share Profile"
                  >
                    <Share2 className="w-5 h-5 text-[#A0A0A5] group-hover:text-[#FFD700] transition-colors" />
                  </button>
                </div>
                
                {/* Inline Bio Editing */}
                <div className="relative group mb-4">
                  {editingBio ? (
                    <div className="space-y-2">
                      <textarea
                        ref={bioInputRef}
                        defaultValue={profile.bio}
                        className="w-full px-3 py-2 bg-[#0F0F14] border border-[#2A2A2F] rounded-lg text-white resize-none focus:border-[#FFD700] outline-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => bioInputRef.current && handleSaveBio(bioInputRef.current.value)}
                          className="px-3 py-1.5 bg-[#FFD700] text-black rounded-lg text-sm font-medium hover:bg-[#FFA500] transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingBio(false)}
                          className="px-3 py-1.5 bg-[#2A2A3F] text-white rounded-lg text-sm hover:bg-[#3A3A4F] transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="cursor-pointer"
                      onClick={() => setEditingBio(true)}
                    >
                      <p className="text-[#C0C0C5] group-hover:text-white transition-colors">{profile.bio}</p>
                      <Edit2 className="absolute top-0 right-0 w-4 h-4 text-[#606065] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-[#A0A0A5]">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" /> Joined {formatJoinDate(profile.joinedDate)}
                  </span>
                  {profile.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" /> {profile.location}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Edit Actions */}
        <div className="mt-6 flex gap-2 relative z-10">
          {isEditing ? (
            <>
              <MobileButton variant="primary" onClick={handleSaveProfile}>
                Save Profile
              </MobileButton>
              <MobileButton variant="secondary" onClick={handleCancelEdit}>
                Cancel
              </MobileButton>
            </>
          ) : (
            <MobileButton variant="primary" onClick={handleEditClick}>
              Edit Profile
            </MobileButton>
          )}
        </div>
      </motion.div>

      {/* Additional Profile Fields (Edit Mode) */}
      {isEditing && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#2A2A2F]"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Additional Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#A0A0A5] mb-1">Bio</label>
              <textarea
                value={editedProfile.bio}
                onChange={(e) => handleProfileChange('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-[#2A2A2F] rounded-lg bg-[#0F0F14] text-white focus:border-[#FFD700] outline-none"
                placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0A0A5] mb-1">Location</label>
              <MobileInput
                type="text"
                value={editedProfile.location || ''}
                onChange={(e) => handleProfileChange('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0A0A5] mb-1">Website</label>
              <MobileInput
                type="url"
                value={editedProfile.website || ''}
                onChange={(e) => handleProfileChange('website', e.target.value)}
                placeholder="https://example.com"
                error={errors.website}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0A0A5] mb-1">Twitter</label>
              <MobileInput
                type="text"
                value={editedProfile.twitter || ''}
                onChange={(e) => handleProfileChange('twitter', e.target.value)}
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0A0A5] mb-1">GitHub</label>
              <MobileInput
                type="text"
                value={editedProfile.github || ''}
                onChange={(e) => handleProfileChange('github', e.target.value)}
                placeholder="username"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Social Links (View Mode) - Enhanced */}
      {!isEditing && (profile.website || profile.twitter || profile.github) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#2A2A2F]"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Links</h2>
          <div className="flex flex-wrap gap-3">
            {profile.website && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#2A2A3F] hover:bg-[#3A3A4F] text-white rounded-xl text-sm transition-colors"
              >
                <Globe className="w-4 h-4 text-blue-400" />
                Website
                <ExternalLink className="w-3 h-3 text-[#606065]" />
              </motion.a>
            )}
            {profile.twitter && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`https://twitter.com/${profile.twitter.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-[#1DA1F2]/20 hover:bg-[#1DA1F2]/30 text-[#1DA1F2] rounded-xl text-sm transition-colors"
              >
                <Twitter className="w-4 h-4" />
                {profile.twitter}
              </motion.a>
            )}
            {profile.github && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={`https://github.com/${profile.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-700/30 hover:bg-gray-700/50 text-white rounded-xl text-sm transition-colors"
              >
                <Github className="w-4 h-4" />
                {profile.github}
              </motion.a>
            )}
          </div>
        </motion.div>
      )}

      {/* Social Connections - Animated */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#2A2A2F]"
      >
        <h2 className="text-xl font-semibold text-white mb-4">Connections</h2>
        <div className="grid grid-cols-3 gap-4">
          <motion.div 
            className="text-center p-4 bg-[#0F0F14] rounded-xl"
            whileHover={{ scale: 1.05 }}
          >
            <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              <AnimatedCounter value={socialConnections.followers} />
            </p>
            <p className="text-sm text-[#A0A0A5]">Followers</p>
          </motion.div>
          <motion.div 
            className="text-center p-4 bg-[#0F0F14] rounded-xl"
            whileHover={{ scale: 1.05 }}
          >
            <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              <AnimatedCounter value={socialConnections.following} />
            </p>
            <p className="text-sm text-[#A0A0A5]">Following</p>
          </motion.div>
          <motion.div 
            className="text-center p-4 bg-[#0F0F14] rounded-xl"
            whileHover={{ scale: 1.05 }}
          >
            <MessageSquare className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-white">
              <AnimatedCounter value={socialConnections.friends} />
            </p>
            <p className="text-sm text-[#A0A0A5]">Friends</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <ActivityHeatmap data={activityHeatmap} />
      </motion.div>

      {/* Badge Showcase Carousel */}
      {privacySettings.showBadges && sortedBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#2A2A2F]"
        >
          <BadgeCarousel badges={sortedBadges} />
        </motion.div>
      )}

      {/* Statistics - Enhanced */}
      {privacySettings.showStats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#FFD700]" />
            Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Activities" value={stats.totalActivities} icon="📊" color="blue" />
            <StatCard label="Badges" value={stats.badgesEarned} icon="🏆" color="purple" />
            <StatCard label="Votes Cast" value={stats.votescast} icon="🗳️" color="green" />
            <StatCard label="Transactions" value={stats.transactionsCount} icon="💰" color="orange" />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <StatCard label="Governance Score" value={stats.governanceScore} icon="📈" color="blue" />
            <StatCard label="Proof Score" value={stats.proofScore} icon="⭐" color="gold" />
          </div>
        </motion.div>
      )}

      {/* Recent Activity Preview - Enhanced */}
      {privacySettings.showActivities && recentActivities.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#2A2A2F]"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              Recent Activity
            </h2>
            <button
              onClick={() => setActiveTab('activity')}
              className="text-sm text-[#FFD700] hover:underline flex items-center gap-1"
            >
              View All
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <ActivityItem key={activity.id} activity={activity} index={index} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <ShareProfileModal profile={profile} onClose={() => setShowShareModal(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderBadgesTab = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Award className="w-6 h-6 text-[#FFD700]" />
          Achievements
        </h2>
        <p className="text-[#A0A0A5]">
          {badges.length} {badges.length === 1 ? 'badge' : 'badges'} earned
        </p>
      </div>

      {badges.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedBadges.map((badge, index) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <BadgeCard badge={badge} />
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1A1A1F] rounded-2xl p-12 border border-[#2A2A2F] text-center"
        >
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-white text-lg mb-2">No badges earned yet</p>
          <p className="text-[#A0A0A5] text-sm">
            Start participating to earn your first badge!
          </p>
        </motion.div>
      )}
    </motion.div>
  );

  const renderActivityTab = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          Activity History
        </h2>
        <p className="text-[#A0A0A5]">Your recent activities on the platform</p>
      </div>

      {recentActivities.length > 0 ? (
        <div className="space-y-3">
          {recentActivities.map((activity, index) => (
            <ActivityItem key={activity.id} activity={activity} index={index} />
          ))}
          <motion.div 
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <MobileButton variant="secondary">Load More Activities</MobileButton>
          </motion.div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1A1A1F] rounded-2xl p-12 border border-[#2A2A2F] text-center"
        >
          <div className="text-6xl mb-4">📊</div>
          <p className="text-white text-lg mb-2">No activities yet</p>
          <p className="text-[#A0A0A5] text-sm">
            Your activities will appear here as you interact with the platform
          </p>
        </motion.div>
      )}
    </motion.div>
  );

  const renderSettingsTab = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Privacy Settings</h2>
        <p className="text-[#A0A0A5]">Control who can see your profile information</p>
      </div>

      <div className="space-y-6">
        {/* Profile Visibility */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#2A2A2F]"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Profile Visibility</h3>
          <select
            value={privacySettings.profileVisibility}
            onChange={(e) =>
              handlePrivacyChange('profileVisibility', e.target.value as PrivacySettings['profileVisibility'])
            }
            className="w-full px-3 py-3 border border-[#2A2A2F] rounded-xl bg-[#0F0F14] text-white focus:border-[#FFD700] outline-none"
          >
            <option value="public">🌍 Public - Anyone can view</option>
            <option value="friends">👥 Friends Only</option>
            <option value="private">🔒 Private - Only you</option>
          </select>
        </motion.div>

        {/* Information Visibility */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1A1A1F] rounded-2xl p-6 border border-[#2A2A2F]"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Information Visibility</h3>
          <div className="space-y-4">
            {[
              { key: 'showEmail', label: 'Show Email', icon: '📧' },
              { key: 'showActivities', label: 'Show Activities', icon: '📊' },
              { key: 'showBadges', label: 'Show Badges', icon: '🏆' },
              { key: 'showStats', label: 'Show Statistics', icon: '📈' },
              { key: 'allowMessages', label: 'Allow Messages', icon: '💬' },
            ].map((setting) => (
              <label 
                key={setting.key}
                className="flex items-center justify-between p-3 bg-[#0F0F14] rounded-xl cursor-pointer hover:bg-[#151520] transition-colors"
              >
                <span className="text-white flex items-center gap-2">
                  <span>{setting.icon}</span>
                  {setting.label}
                </span>
                <div className={`relative w-12 h-6 rounded-full transition-colors ${
                  privacySettings[setting.key as keyof PrivacySettings] ? 'bg-[#FFD700]' : 'bg-[#2A2A3F]'
                }`}>
                  <motion.div
                    className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
                    animate={{ left: privacySettings[setting.key as keyof PrivacySettings] ? 28 : 4 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                  <input
                    type="checkbox"
                    checked={privacySettings[setting.key as keyof PrivacySettings] as boolean}
                    onChange={(e) => handlePrivacyChange(setting.key as keyof PrivacySettings, e.target.checked)}
                    className="opacity-0 absolute inset-0 cursor-pointer"
                  />
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Save Settings */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3"
        >
          <MobileButton variant="primary" onClick={() => { playSound('success'); alert('Privacy settings saved!'); }}>
            💾 Save Settings
          </MobileButton>
        </motion.div>
      </div>
    </motion.div>
  );

  return (
    <ResponsiveContainer>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold text-white mb-2">User Profile</h1>
          <p className="text-[#A0A0A5]">Manage your profile and settings</p>
        </motion.div>

        {/* Tabs - Enhanced */}
        <div className="mb-6 border-b border-[#2A2A2F]">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'overview' as const, label: 'Overview', icon: '👤', count: null },
              { id: 'badges' as const, label: 'Badges', icon: '🏆', count: badges.length },
              { id: 'activity' as const, label: 'Activity', icon: '📊', count: null },
              { id: 'settings' as const, label: 'Settings', icon: '⚙️', count: null },
            ].map((tab) => (
              <motion.button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); playSound('click'); }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className={`relative px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#FFD700]'
                    : 'text-[#A0A0A5] hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2">
                  {tab.icon} {tab.label}
                  {tab.count !== null && (
                    <span className="text-xs bg-[#2A2A3F] px-2 py-0.5 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="profileTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500]"
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'badges' && renderBadgesTab()}
          {activeTab === 'activity' && renderActivityTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </AnimatePresence>
      </div>
    </ResponsiveContainer>
  );
}
