/**
 * Comprehensive Social Features Component
 * Includes following, friend system, user discovery, and social interactions
 * 1,100+ lines with multiple features and sub-components
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';

// ==================== TYPE DEFINITIONS ====================

interface User {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  proofScore: number;
  followers: number;
  following: number;
  badges: number;
  isVerified?: boolean;
  joinedAt: Date;
}

interface UserRelationship {
  userId: string;
  status: 'following' | 'follower' | 'friend' | 'friend_requested' | 'pending' | 'blocked' | 'none';
  followedAt?: Date;
  friendRequestedAt?: Date;
  blockedAt?: Date;
}

interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUser: User;
  toUserId: string;
  createdAt: Date;
  status: 'pending' | 'accepted' | 'rejected';
}

interface SocialSuggestion {
  userId: string;
  user: User;
  reason: 'mutual_follow' | 'shared_interests' | 'active_user' | 'frequent_interactor';
  score: number;
}

interface FeedPost {
  id: string;
  userId: string;
  user: User;
  content: string;
  type: 'status' | 'achievement' | 'activity' | 'proposal';
  timestamp: Date;
  likes: number;
  liked: boolean;
  comments: number;
  shares: number;
}

interface BlockedUser {
  id: string;
  userId: string;
  user: User;
  blockedAt: Date;
  reason?: string;
}

interface SocialStats {
  followers: number;
  following: number;
  friends: number;
  friendRequests: number;
  blockedUsers: number;
  suggestions: number;
}

// ==================== MOCK DATA GENERATORS ====================

const generateMockUser = (id: string, index: number): User => ({
  id,
  username: `user_${index}`,
  displayName: `User ${index}`,
  avatar: '👤',
  bio: `Blockchain enthusiast and DeFi explorer #${index}`,
  proofScore: Math.floor(Math.random() * 2000) + 500,
  followers: Math.floor(Math.random() * 500) + 20,
  following: Math.floor(Math.random() * 300) + 10,
  badges: Math.floor(Math.random() * 15),
  isVerified: Math.random() > 0.7,
  joinedAt: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
});

const mockFollowingUsers = (): User[] => [
  generateMockUser('u1', 1),
  generateMockUser('u2', 2),
  generateMockUser('u3', 3),
  generateMockUser('u4', 4),
  generateMockUser('u5', 5),
];

const mockFollowers = (): User[] => [
  generateMockUser('u6', 6),
  generateMockUser('u7', 7),
  generateMockUser('u8', 8),
  generateMockUser('u9', 9),
];

const mockFriends = (): User[] => [
  generateMockUser('u10', 10),
  generateMockUser('u11', 11),
  generateMockUser('u12', 12),
];

const mockFriendRequests = (): FriendRequest[] => [
  {
    id: 'fr1',
    fromUserId: 'u20',
    fromUser: generateMockUser('u20', 20),
    toUserId: 'current',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    status: 'pending',
  },
  {
    id: 'fr2',
    fromUserId: 'u21',
    fromUser: generateMockUser('u21', 21),
    toUserId: 'current',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    status: 'pending',
  },
];

const mockSuggestions = (): SocialSuggestion[] => [
  {
    userId: 'u30',
    user: generateMockUser('u30', 30),
    reason: 'mutual_follow',
    score: 95,
  },
  {
    userId: 'u31',
    user: generateMockUser('u31', 31),
    reason: 'active_user',
    score: 88,
  },
  {
    userId: 'u32',
    user: generateMockUser('u32', 32),
    reason: 'shared_interests',
    score: 82,
  },
  {
    userId: 'u33',
    user: generateMockUser('u33', 33),
    reason: 'frequent_interactor',
    score: 75,
  },
  {
    userId: 'u34',
    user: generateMockUser('u34', 34),
    reason: 'mutual_follow',
    score: 72,
  },
];

const mockFeedPosts = (): FeedPost[] => [
  {
    id: 'p1',
    userId: 'u1',
    user: generateMockUser('u1', 1),
    content: 'Just participated in the latest governance proposal! 🗳️',
    type: 'activity',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    likes: 42,
    liked: false,
    comments: 8,
    shares: 3,
  },
  {
    id: 'p2',
    userId: 'u2',
    user: generateMockUser('u2', 2),
    content: 'Earned the "Governance Pro" badge! 🏆',
    type: 'achievement',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    likes: 156,
    liked: true,
    comments: 24,
    shares: 12,
  },
  {
    id: 'p3',
    userId: 'u3',
    user: generateMockUser('u3', 3),
    content: 'Exploring new DeFi opportunities with strategic staking. 💰',
    type: 'status',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
    likes: 89,
    liked: false,
    comments: 15,
    shares: 7,
  },
];

const mockBlockedUsers = (): BlockedUser[] => [
  {
    id: 'b1',
    userId: 'u50',
    user: generateMockUser('u50', 50),
    blockedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    reason: 'Spam behavior',
  },
];

// ==================== HELPER FUNCTIONS ====================

const _formatJoinDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatTimeAgo = (timestamp: Date): string => {
  const seconds = Math.floor((Date.now() - timestamp.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
};

const getReasonLabel = (reason: SocialSuggestion['reason']): string => {
  switch (reason) {
    case 'mutual_follow':
      return 'You have mutual followers';
    case 'shared_interests':
      return 'Shared interests';
    case 'active_user':
      return 'Active in community';
    case 'frequent_interactor':
      return 'Frequent participant';
  }
};

const getReasonIcon = (reason: SocialSuggestion['reason']): string => {
  switch (reason) {
    case 'mutual_follow':
      return '🔗';
    case 'shared_interests':
      return '⭐';
    case 'active_user':
      return '🔥';
    case 'frequent_interactor':
      return '💬';
  }
};

const getPostTypeIcon = (type: FeedPost['type']): string => {
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

// ==================== SUB-COMPONENTS ====================

interface UserCardProps {
  user: User;
  relationship: UserRelationship;
  onFollow: (userId: string) => void;
  onUnfollow: (userId: string) => void;
  onAddFriend: (userId: string) => void;
  onRemoveFriend: (userId: string) => void;
  onBlock: (userId: string) => void;
}

function UserCard({
  user,
  relationship,
  onFollow,
  onUnfollow,
  onAddFriend,
  onRemoveFriend,
  onBlock,
}: UserCardProps) {
  return (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-3xl">{user.avatar}</span>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-semibold">{user.displayName}</h3>
              {user.isVerified && <span>✅</span>}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
          </div>
        </div>
        {user.bio && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{user.bio}</p>}
      </div>
      <button
        onClick={() => onBlock(user.id)}
        className="text-gray-400 hover:text-red-600 transition-colors"
        title="Block user"
      >
        ⊗
      </button>
    </div>

    <div className="grid grid-cols-3 gap-2 mb-3 text-center text-sm">
      <div>
        <div className="font-semibold">{user.proofScore}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Proof Score</div>
      </div>
      <div>
        <div className="font-semibold">{user.badges}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Badges</div>
      </div>
      <div>
        <div className="font-semibold">{user.followers}</div>
        <div className="text-xs text-gray-600 dark:text-gray-400">Followers</div>
      </div>
    </div>

    <div className="flex gap-2">
      {relationship.status === 'following' ? (
        <button
          onClick={() => onUnfollow(user.id)}
          className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Following
        </button>
      ) : (
        <button
          onClick={() => onFollow(user.id)}
          className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          Follow
        </button>
      )}

      {relationship.status === 'friend' ? (
        <button
          onClick={() => onRemoveFriend(user.id)}
          className="flex-1 px-3 py-2 bg-purple-600 text-white rounded font-medium text-sm hover:bg-purple-700 transition-colors"
        >
          Friend
        </button>
      ) : relationship.status === 'friend_requested' ? (
        <button
          disabled
          className="flex-1 px-3 py-2 bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded font-medium text-sm cursor-not-allowed"
        >
          Requested
        </button>
      ) : (
        <button
          onClick={() => onAddFriend(user.id)}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded font-medium text-sm hover:bg-green-700 transition-colors"
        >
          Add Friend
        </button>
      )}
    </div>
  </div>
  );
}

interface FriendRequestCardProps {
  request: FriendRequest;
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

function FriendRequestCard({ request, onAccept, onReject }: FriendRequestCardProps) {
  return (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
    <div className="flex items-center gap-3 flex-1">
      <span className="text-3xl">{request.fromUser.avatar}</span>
      <div>
        <h3 className="font-semibold">{request.fromUser.displayName}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">@{request.fromUser.username}</p>
        <p className="text-xs text-gray-500 mt-1">{formatTimeAgo(request.createdAt)}</p>
      </div>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => onAccept(request.id)}
        className="px-4 py-2 bg-green-600 text-white rounded font-medium text-sm hover:bg-green-700 transition-colors"
      >
        Accept
      </button>
      <button
        onClick={() => onReject(request.id)}
        className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-medium text-sm hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
      >
        Reject
      </button>
    </div>
  </div>
  );
}

interface SuggestionCardProps {
  suggestion: SocialSuggestion;
  onFollow: (userId: string) => void;
  onDismiss: (userId: string) => void;
}

function SuggestionCard({ suggestion, onFollow, onDismiss }: SuggestionCardProps) {
  return (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
    <div className="flex items-start gap-3 mb-3">
      <span className="text-3xl">{suggestion.user.avatar}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{suggestion.user.displayName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">@{suggestion.user.username}</p>
          </div>
          <div className="text-right text-xs font-semibold bg-linear-to-r from-blue-500 to-purple-500 text-white px-2 py-1 rounded">
            {suggestion.score}%
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {getReasonIcon(suggestion.reason)} {getReasonLabel(suggestion.reason)}
        </p>
      </div>
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => onFollow(suggestion.userId)}
        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded font-medium text-sm hover:bg-blue-700 transition-colors"
      >
        Follow
      </button>
      <button
        onClick={() => onDismiss(suggestion.userId)}
        className="flex-1 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-medium text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
      >
        Dismiss
      </button>
    </div>
  </div>
  );
}

interface FeedPostCardProps {
  post: FeedPost;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onShare: (postId: string) => void;
}

function FeedPostCard({ post, onLike, onComment, onShare }: FeedPostCardProps) {
  return (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center gap-3 mb-3">
      <span className="text-2xl">{post.user.avatar}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{post.user.displayName}</h3>
          {post.user.isVerified && <span className="text-xs">✅</span>}
        </div>
        <p className="text-xs text-gray-500">{formatTimeAgo(post.timestamp)}</p>
      </div>
      <span className="text-lg">{getPostTypeIcon(post.type)}</span>
    </div>

    <p className="text-sm mb-3">{post.content}</p>

    <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mb-3">
      <span>{post.likes} likes</span>
      <span>{post.comments} comments</span>
      <span>{post.shares} shares</span>
    </div>

    <div className="flex gap-2">
      <button
        onClick={() => onLike(post.id)}
        className={`flex-1 px-3 py-2 rounded font-medium text-sm transition-colors ${
          post.liked
            ? 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        {post.liked ? '❤️ Liked' : '🤍 Like'}
      </button>
      <button
        onClick={() => onComment(post.id)}
        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        💬 Comment
      </button>
      <button
        onClick={() => onShare(post.id)}
        className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      >
        📤 Share
      </button>
    </div>
  </div>
  );
}

// ==================== MAIN COMPONENT ====================

interface SocialFeaturesProps {
  className?: string;
}

function SocialFeatures({ className = '' }: SocialFeaturesProps) {
  // State Management
  const [activeTab, setActiveTab] = useState<
    'feed' | 'following' | 'followers' | 'friends' | 'suggestions' | 'requests' | 'blocked'
  >('feed');
  const [searchQuery, setSearchQuery] = useState('');
  const [relationships, setRelationships] = useState<Record<string, UserRelationship>>({});
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  // Mock Data
  const [followingUsers] = useState(mockFollowingUsers());
  const [followers] = useState(mockFollowers());
  const [friends] = useState(mockFriends());
  const [friendRequests, setFriendRequests] = useState(mockFriendRequests());
  const [suggestions, setSuggestions] = useState(mockSuggestions());
  const [feedPosts, _setFeedPosts] = useState(mockFeedPosts());
  const [blockedUsers, setBlockedUsers] = useState(mockBlockedUsers());

  // Initialize relationships
  React.useEffect(() => {
    const initialRelationships: Record<string, UserRelationship> = {};
    followingUsers.forEach((user) => {
      initialRelationships[user.id] = { userId: user.id, status: 'following' };
    });
    followers.forEach((user) => {
      initialRelationships[user.id] = { userId: user.id, status: 'follower' };
    });
    friends.forEach((user) => {
      initialRelationships[user.id] = { userId: user.id, status: 'friend' };
    });
    setRelationships(initialRelationships);
  }, []);

  // Event Handlers
  const handleFollow = useCallback((userId: string) => {
    setRelationships((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], status: 'following' } as UserRelationship,
    }));
  }, []);

  const handleUnfollow = useCallback((userId: string) => {
    setRelationships((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], status: 'none' } as UserRelationship,
    }));
  }, []);

  const handleAddFriend = useCallback((userId: string) => {
    setRelationships((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], status: 'friend_requested' } as UserRelationship,
    }));
  }, []);

  const handleRemoveFriend = useCallback((userId: string) => {
    setRelationships((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], status: 'none' } as UserRelationship,
    }));
  }, []);

  const handleBlock = useCallback((userId: string) => {
    setRelationships((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], status: 'blocked' } as UserRelationship,
    }));
  }, []);

  const handleAcceptRequest = useCallback((requestId: string) => {
    const request = friendRequests.find((r) => r.id === requestId);
    if (request) {
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      handleAddFriend(request.fromUserId);
    }
  }, [friendRequests]);

  const handleRejectRequest = useCallback((requestId: string) => {
    setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
  }, []);

  const handleDismissSuggestion = useCallback((userId: string) => {
    setSuggestions((prev) => prev.filter((s) => s.userId !== userId));
  }, []);

  const handleLikePost = useCallback((postId: string) => {
    setLikedPosts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  }, []);

  const handleCommentPost = useCallback((postId: string) => {
    // Comment action triggered
  }, []);

  const handleSharePost = useCallback((postId: string) => {
    // Share action triggered
  }, []);

  // Filtered Data
  const filteredFollowing = useMemo(() => {
    if (!searchQuery) return followingUsers;
    return followingUsers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, followingUsers]);

  const filteredFollowers = useMemo(() => {
    if (!searchQuery) return followers;
    return followers.filter(
      (u) =>
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, followers]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends;
    return friends.filter(
      (u) =>
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, friends]);

  const socialStats: SocialStats = useMemo(() => ({
    followers: followers.length,
    following: followingUsers.length,
    friends: friends.length,
    friendRequests: friendRequests.length,
    blockedUsers: blockedUsers.length,
    suggestions: suggestions.length,
  }), [followers, followingUsers, friends, friendRequests, blockedUsers, suggestions]);

  const updatedFeedPosts = useMemo(() => {
    return feedPosts.map((post) => ({
      ...post,
      liked: likedPosts.has(post.id),
    }));
  }, [feedPosts, likedPosts]);

  // Render
  return (
    <div className={`max-w-6xl mx-auto px-4 py-8 ${className}`}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Social Features</h1>
        <p className="text-gray-600 dark:text-gray-400">Connect with users, build your network, and stay engaged</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600">{socialStats.followers}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Followers</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-blue-600">{socialStats.following}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Following</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-purple-600">{socialStats.friends}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Friends</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600">{socialStats.friendRequests}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Requests</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-orange-600">{socialStats.suggestions}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Suggestions</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600">{socialStats.blockedUsers}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Blocked</div>
        </div>
      </div>

      {/* Search Bar */}
      {['following', 'followers', 'friends'].includes(activeTab) && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setActiveTab('feed');
            setSearchQuery('');
          }}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'feed'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          📰 Feed
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'following'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          👤 Following ({followingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'followers'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          ⭐ Followers ({followers.length})
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'friends'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          🤝 Friends ({friends.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('suggestions');
            setSearchQuery('');
          }}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'suggestions'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          ⭐ Suggestions ({suggestions.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('requests');
            setSearchQuery('');
          }}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'requests'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          📬 Requests ({friendRequests.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('blocked');
            setSearchQuery('');
          }}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'blocked'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          🚫 Blocked ({blockedUsers.length})
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {/* Feed Tab */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            {updatedFeedPosts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📰</div>
                <p className="text-gray-600 dark:text-gray-400">No posts in your feed yet. Follow more users to see their activity!</p>
              </div>
            ) : (
              updatedFeedPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  onLike={handleLikePost}
                  onComment={handleCommentPost}
                  onShare={handleSharePost}
                />
              ))
            )}
          </div>
        )}

        {/* Following Tab */}
        {activeTab === 'following' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFollowing.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">👤</div>
                <p className="text-gray-600 dark:text-gray-400">No users found. Start following users to expand your network!</p>
              </div>
            ) : (
              filteredFollowing.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  relationship={relationships[user.id] || { userId: user.id, status: 'none' }}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  onAddFriend={handleAddFriend}
                  onRemoveFriend={handleRemoveFriend}
                  onBlock={handleBlock}
                />
              ))
            )}
          </div>
        )}

        {/* Followers Tab */}
        {activeTab === 'followers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFollowers.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">⭐</div>
                <p className="text-gray-600 dark:text-gray-400">No followers yet. Share your activity to attract followers!</p>
              </div>
            ) : (
              filteredFollowers.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  relationship={relationships[user.id] || { userId: user.id, status: 'none' }}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  onAddFriend={handleAddFriend}
                  onRemoveFriend={handleRemoveFriend}
                  onBlock={handleBlock}
                />
              ))
            )}
          </div>
        )}

        {/* Friends Tab */}
        {activeTab === 'friends' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFriends.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">🤝</div>
                <p className="text-gray-600 dark:text-gray-400">No friends yet. Send friend requests to connect with others!</p>
              </div>
            ) : (
              filteredFriends.map((user) => (
                <UserCard
                  key={user.id}
                  user={user}
                  relationship={relationships[user.id] || { userId: user.id, status: 'none' }}
                  onFollow={handleFollow}
                  onUnfollow={handleUnfollow}
                  onAddFriend={handleAddFriend}
                  onRemoveFriend={handleRemoveFriend}
                  onBlock={handleBlock}
                />
              ))
            )}
          </div>
        )}

        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suggestions.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-6xl mb-4">⭐</div>
                <p className="text-gray-600 dark:text-gray-400">No suggestions available. Check back later!</p>
              </div>
            ) : (
              suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.userId}
                  suggestion={suggestion}
                  onFollow={handleFollow}
                  onDismiss={handleDismissSuggestion}
                />
              ))
            )}
          </div>
        )}

        {/* Friend Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-3">
            {friendRequests.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📬</div>
                <p className="text-gray-600 dark:text-gray-400">No pending friend requests. Wait for friends to request!</p>
              </div>
            ) : (
              friendRequests.map((request) => (
                <FriendRequestCard
                  key={request.id}
                  request={request}
                  onAccept={handleAcceptRequest}
                  onReject={handleRejectRequest}
                />
              ))
            )}
          </div>
        )}

        {/* Blocked Users Tab */}
        {activeTab === 'blocked' && (
          <div className="space-y-3">
            {blockedUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🚫</div>
                <p className="text-gray-600 dark:text-gray-400">No blocked users. You can block users to stop seeing their content.</p>
              </div>
            ) : (
              blockedUsers.map((blocked) => (
                <div
                  key={blocked.id}
                  className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-3xl">{blocked.user.avatar}</span>
                    <div>
                      <h3 className="font-semibold">{blocked.user.displayName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">@{blocked.user.username}</p>
                      <p className="text-xs text-gray-500 mt-1">Blocked {formatTimeAgo(blocked.blockedAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setBlockedUsers((prev) => prev.filter((b) => b.id !== blocked.id))}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded font-medium text-sm hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                  >
                    Unblock
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SocialFeatures;
