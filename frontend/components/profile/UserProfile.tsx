/**
 * User Profile Component
 * Displays and manages user profile information, achievements, and settings
 * 
 * Features:
 * - Profile display with avatar, name, bio
 * - Profile editing with validation
 * - Achievement showcase with badges
 * - Activity statistics and recent activity
 * - Privacy settings and preferences
 * - Social connections display
 * - Avatar upload and management
 * - Mobile-responsive design
 * - Dark mode support
 * - Accessibility compliance
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { MobileButton, MobileInput } from '@/components/mobile/MobileForm';
import { responsiveGrids, ResponsiveContainer } from '@/lib/mobile';

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

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'blue' }) => {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg ${
            colorClasses[color] || colorClasses.blue
          } flex items-center justify-center text-xl`}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </div>
  );
};

interface BadgeCardProps {
  badge: Badge;
}

const BadgeCard: React.FC<BadgeCardProps> = ({ badge }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="text-center">
        <div className="text-4xl mb-2">{badge.icon}</div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{badge.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{badge.description}</p>
        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(badge.rarity)}`}>
          {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
        </span>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Earned {formatTimeAgo(badge.earnedDate)}
        </p>
      </div>
    </div>
  );
};

interface ActivityItemProps {
  activity: RecentActivity;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
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

  return (
    <div className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
      <div className="text-2xl">{getActivityIcon(activity.type)}</div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.title}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(activity.timestamp)}</p>
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================

const UserProfile: React.FC = () => {
  // State
  const [profile, setProfile] = useState<UserProfile>(generateMockProfile());
  const [stats] = useState<UserStats>(generateMockStats());
  const [badges] = useState<Badge[]>(generateMockBadges());
  const [recentActivities] = useState<RecentActivity[]>(generateMockRecentActivities());
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(generateMockPrivacySettings());
  const [socialConnections] = useState<SocialConnections>(generateMockSocialConnections());
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [activeTab, setActiveTab] = useState<'overview' | 'badges' | 'activity' | 'settings'>('overview');
  
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      // In real app: API call to save profile
    }
  }, [editedProfile, validateProfile]);

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

  const handleAvatarUpload = useCallback(() => {
    // In real app: Open file picker and upload
    alert('Avatar upload would open here');
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
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-6xl mb-4">
              {profile.avatar || '👤'}
            </div>
            {isEditing && (
              <MobileButton variant="secondary" onClick={handleAvatarUpload} className="text-sm">
                Change Avatar
              </MobileButton>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {profile.displayName}
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">@{profile.username}</p>
                {privacySettings.showEmail && (
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">{profile.email}</p>
                )}
                <p className="text-gray-700 dark:text-gray-300 mb-4">{profile.bio}</p>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>📅 Joined {formatJoinDate(profile.joinedDate)}</span>
                  {profile.location && <span>📍 {profile.location}</span>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Edit Actions */}
        <div className="mt-6 flex gap-2">
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
      </div>

      {/* Additional Profile Fields (Edit Mode) */}
      {isEditing && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Additional Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio</label>
              <textarea
                value={editedProfile.bio}
                onChange={(e) => handleProfileChange('bio', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
              <MobileInput
                type="text"
                value={editedProfile.location || ''}
                onChange={(e) => handleProfileChange('location', e.target.value)}
                placeholder="City, Country"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
              <MobileInput
                type="url"
                value={editedProfile.website || ''}
                onChange={(e) => handleProfileChange('website', e.target.value)}
                placeholder="https://example.com"
                error={errors.website}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Twitter</label>
              <MobileInput
                type="text"
                value={editedProfile.twitter || ''}
                onChange={(e) => handleProfileChange('twitter', e.target.value)}
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GitHub</label>
              <MobileInput
                type="text"
                value={editedProfile.github || ''}
                onChange={(e) => handleProfileChange('github', e.target.value)}
                placeholder="username"
              />
            </div>
          </div>
        </div>
      )}

      {/* Social Links (View Mode) */}
      {!isEditing && (profile.website || profile.twitter || profile.github) && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Links</h2>
          <div className="flex flex-wrap gap-2">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                🌐 Website
              </a>
            )}
            {profile.twitter && (
              <a
                href={`https://twitter.com/${profile.twitter.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-800"
              >
                🐦 Twitter
              </a>
            )}
            {profile.github && (
              <a
                href={`https://github.com/${profile.github}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                💻 GitHub
              </a>
            )}
          </div>
        </div>
      )}

      {/* Social Connections */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Connections</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{socialConnections.followers}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{socialConnections.following}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Following</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{socialConnections.friends}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Friends</p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {privacySettings.showStats && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Statistics</h2>
          <div className={`${responsiveGrids.auto} gap-4`}>
            <StatCard label="Activities" value={stats.totalActivities} icon="📊" color="blue" />
            <StatCard label="Badges" value={stats.badgesEarned} icon="🏆" color="purple" />
            <StatCard label="Votes Cast" value={stats.votescast} icon="🗳️" color="green" />
            <StatCard label="Transactions" value={stats.transactionsCount} icon="💰" color="orange" />
          </div>
          <div className={`${responsiveGrids.auto} gap-4 mt-4`}>
            <StatCard label="Governance Score" value={stats.governanceScore} icon="📈" color="blue" />
            <StatCard label="Proof Score" value={stats.proofScore} icon="⭐" color="purple" />
          </div>
        </div>
      )}

      {/* Recent Activity Preview */}
      {privacySettings.showActivities && recentActivities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <button
              onClick={() => setActiveTab('activity')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {recentActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderBadgesTab = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Achievements</h2>
        <p className="text-gray-600 dark:text-gray-400">
          {badges.length} {badges.length === 1 ? 'badge' : 'badges'} earned
        </p>
      </div>

      {badges.length > 0 ? (
        <div className={`${responsiveGrids.auto} gap-4`}>
          {sortedBadges.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No badges earned yet</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            Start participating to earn your first badge!
          </p>
        </div>
      )}
    </div>
  );

  const renderActivityTab = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Activity History</h2>
        <p className="text-gray-600 dark:text-gray-400">Your recent activities on the platform</p>
      </div>

      {recentActivities.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {recentActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
          <div className="p-4 text-center">
            <MobileButton variant="secondary">Load More Activities</MobileButton>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 shadow-sm border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-2">No activities yet</p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">
            Your activities will appear here as you interact with the platform
          </p>
        </div>
      )}
    </div>
  );

  const renderSettingsTab = () => (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacy Settings</h2>
        <p className="text-gray-600 dark:text-gray-400">Control who can see your profile information</p>
      </div>

      <div className="space-y-6">
        {/* Profile Visibility */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Profile Visibility</h3>
          <select
            value={privacySettings.profileVisibility}
            onChange={(e) =>
              handlePrivacyChange('profileVisibility', e.target.value as PrivacySettings['profileVisibility'])
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="public">Public - Anyone can view</option>
            <option value="friends">Friends Only</option>
            <option value="private">Private - Only you</option>
          </select>
        </div>

        {/* Information Visibility */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Information Visibility</h3>
          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-700 dark:text-gray-300">Show Email</span>
              <input
                type="checkbox"
                checked={privacySettings.showEmail}
                onChange={(e) => handlePrivacyChange('showEmail', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-700 dark:text-gray-300">Show Activities</span>
              <input
                type="checkbox"
                checked={privacySettings.showActivities}
                onChange={(e) => handlePrivacyChange('showActivities', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-700 dark:text-gray-300">Show Badges</span>
              <input
                type="checkbox"
                checked={privacySettings.showBadges}
                onChange={(e) => handlePrivacyChange('showBadges', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-700 dark:text-gray-300">Show Statistics</span>
              <input
                type="checkbox"
                checked={privacySettings.showStats}
                onChange={(e) => handlePrivacyChange('showStats', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-gray-700 dark:text-gray-300">Allow Messages</span>
              <input
                type="checkbox"
                checked={privacySettings.allowMessages}
                onChange={(e) => handlePrivacyChange('allowMessages', e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Save Settings */}
        <div className="flex gap-2">
          <MobileButton variant="primary" onClick={() => alert('Privacy settings saved!')}>
            Save Settings
          </MobileButton>
        </div>
      </div>
    </div>
  );

  return (
    <ResponsiveContainer>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">User Profile</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your profile and settings</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              👤 Overview
            </button>
            <button
              onClick={() => setActiveTab('badges')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'badges'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              🏆 Badges ({badges.length})
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'activity'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              📊 Activity
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              ⚙️ Settings
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'badges' && renderBadgesTab()}
        {activeTab === 'activity' && renderActivityTab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </ResponsiveContainer>
  );
};

export default UserProfile;
