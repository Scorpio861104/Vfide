/**
 * Core TypeScript type definitions for the Vfide application
 * Replaces generic 'any' types with specific interfaces for better type safety
 */

// ============================================================================
// User & Authentication Types
// ============================================================================

export interface User {
  id: string;
  address: string;
  username?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  bio?: string;
  avatar?: string;
  badges: Badge[];
  level: number;
  experience: number;
}

export interface JWTPayload {
  userId: string;
  address: string;
  iat: number;
  exp: number;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
  expiresIn: number;
}

// ============================================================================
// Generic API Types
// ============================================================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ErrorResponse;
  metadata?: ResponseMetadata;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  stack?: string;
}

export interface ResponseMetadata {
  requestId: string;
  timestamp: number;
  duration: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface RequestContext {
  requestId: string;
  userId?: string;
  userAddress?: string;
  timestamp: number;
  userAgent?: string;
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: string;
  senderAddress: string;
  recipientAddress: string;
  content: string;
  encrypted: boolean;
  timestamp: Date;
  read: boolean;
  reactions: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userAddress: string;
  emoji: string;
  timestamp: Date;
}

export interface MessageThread {
  id: string;
  participants: string[];
  lastMessage: Message;
  unreadCount: number;
  updatedAt: Date;
}

// ============================================================================
// Group Types
// ============================================================================

export interface Group {
  id: string;
  name: string;
  description?: string;
  creatorAddress: string;
  members: GroupMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupMember {
  userAddress: string;
  role: GroupRole;
  joinedAt: Date;
}

export type GroupRole = 'owner' | 'admin' | 'member';

export interface GroupInvite {
  id: string;
  groupId: string;
  inviterAddress: string;
  inviteeAddress: string;
  status: InviteStatus;
  createdAt: Date;
  expiresAt: Date;
}

export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'expired';

// ============================================================================
// Badge & Gamification Types
// ============================================================================

export interface Badge {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rarity: BadgeRarity;
  criteria: BadgeCriteria;
}

export type BadgeRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface BadgeCriteria {
  type: string;
  threshold: number;
  description: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  total: number;
  completed: boolean;
  expiresAt?: Date;
}

export interface LeaderboardEntry {
  rank: number;
  userAddress: string;
  username?: string;
  score: number;
  badges: number;
}

// ============================================================================
// System Types
// ============================================================================

export interface LogContext {
  component?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
export type DeepReadonly<T> = { readonly [P in keyof T]: DeepReadonly<T[P]> };

// Branded types for additional type safety
export type UserId = string & { readonly __brand: 'UserId' };
export type Address = string & { readonly __brand: 'Address' };
export type TransactionHash = string & { readonly __brand: 'TransactionHash' };

// ============================================================================
// Type Guards
// ============================================================================

export function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'address' in value &&
    typeof (value as User).id === 'string' &&
    typeof (value as User).address === 'string'
  );
}

export function isAPIError(value: unknown): value is ErrorResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value &&
    typeof (value as ErrorResponse).code === 'string' &&
    typeof (value as ErrorResponse).message === 'string'
  );
}

export function isPaginatedResponse<T>(value: unknown): value is PaginatedResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'items' in value &&
    'pagination' in value &&
    Array.isArray((value as PaginatedResponse<T>).items)
  );
}
