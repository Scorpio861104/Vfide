// Friend request and privacy system types

export interface FriendRequest {
  id: string;
  from: string;
  fromAlias?: string;
  fromProofScore?: number;
  to: string;
  message?: string; // Optional message with request
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  expiresAt?: number; // Optional expiration (7 days default)
}

export interface BlockedUser {
  address: string;
  blockedAt: number;
  reason?: string;
}

export interface PrivacySettings {
  allowMessagesFrom: 'everyone' | 'friends' | 'trusted'; // trusted = ProofScore >= 54%
  allowFriendRequestsFrom: 'everyone' | 'trusted' | 'none';
  showOnlineStatus: 'everyone' | 'friends' | 'none';
  requireProofScoreForRequests: boolean;
  minimumProofScoreForRequests: number; // Default 4000 (40%)
  autoRejectLowTrust: boolean; // Auto-reject if ProofScore < threshold
}

export interface MessageRequest {
  id: string;
  from: string;
  fromAlias?: string;
  fromProofScore?: number;
  preview: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  allowMessagesFrom: 'friends',
  allowFriendRequestsFrom: 'trusted',
  showOnlineStatus: 'friends',
  requireProofScoreForRequests: true,
  minimumProofScoreForRequests: 4000, // 40%
  autoRejectLowTrust: false,
};
