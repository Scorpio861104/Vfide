/**
 * Type definitions for API Client
 * Improves type safety across API interactions
 */

export interface Message {
  id: string;
  conversationId: string;
  from: string;
  to: string;
  encryptedContent: string;
  signature?: string;
  timestamp: number;
  read: boolean;
  edited?: boolean;
  deleted?: boolean;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  type: 'emoji' | 'custom_image';
  emoji?: string;
  imageUrl?: string;
  imageName?: string;
  userAddress: string;
  timestamp: number;
}

export interface User {
  address: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  proofScore?: number;
  createdAt: number;
  lastActive?: number;
}

export interface FriendRequest {
  id: string;
  from: string;
  to: string;
  status: 'pending' | 'accepted' | 'rejected';
  timestamp: number;
}

export interface GamificationProgress {
  address: string;
  xp: number;
  level: number;
  achievements: Achievement[];
  badges: Badge[];
  streaks: Streak[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  xpReward: number;
  unlockedAt?: number;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: number;
}

export interface Streak {
  type: string;
  count: number;
  lastUpdate: number;
}

export interface LeaderboardEntry {
  address: string;
  username?: string;
  value: number;
  rank: number;
}
