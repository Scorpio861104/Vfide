/**
 * Input Validation Schemas using Zod
 * Centralized validation for all API endpoints
 */

import { z } from 'zod';

// ==================== Common Validators ====================

// Ethereum address validator
export const ethereumAddress = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address')
  .transform((val) => val.toLowerCase());

// Transaction hash validator
export const txHash = z
  .string()
  .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash');

// Username validator
export const username = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// Safe text (prevents XSS)
export const safeText = z
  .string()
  .max(10000, 'Text is too long')
  .transform((val) => val.replace(/<script[^>]*>.*?<\/script>/gi, '').trim());

// Short text (for titles, names)
export const shortText = z
  .string()
  .max(200, 'Text is too long')
  .transform((val) => val.trim());

// URL validator
export const urlString = z
  .string()
  .url('Invalid URL')
  .max(2000, 'URL is too long');

// Pagination
export const paginationParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ==================== Auth Schemas ====================

export const authSchema = z.object({
  address: ethereumAddress,
  message: z.string().min(1, 'Message is required').max(1000),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/, 'Invalid signature'),
});

// ==================== User Schemas ====================

export const createUserSchema = z.object({
  wallet_address: ethereumAddress,
  username: username.optional(),
  display_name: shortText.optional(),
  bio: safeText.max(500).optional(),
  avatar_url: urlString.optional(),
});

export const updateUserSchema = z.object({
  username: username.optional(),
  display_name: shortText.optional(),
  bio: safeText.max(500).optional(),
  avatar_url: urlString.optional(),
});

// ==================== Message Schemas ====================

export const sendMessageSchema = z.object({
  from: ethereumAddress,
  to: ethereumAddress,
  content: safeText.min(1, 'Message cannot be empty').max(5000, 'Message is too long'),
  conversationId: z.string().optional(),
});

export const editMessageSchema = z.object({
  messageId: z.coerce.number().int().positive(),
  content: safeText.min(1, 'Message cannot be empty').max(5000, 'Message is too long'),
});

export const reactionSchema = z.object({
  messageId: z.coerce.number().int().positive(),
  emoji: z.string().emoji('Invalid emoji').max(10),
  action: z.enum(['add', 'remove']).default('add'),
});

// ==================== Friend Schemas ====================

export const friendRequestSchema = z.object({
  from: ethereumAddress,
  to: ethereumAddress,
});

export const friendActionSchema = z.object({
  friendshipId: z.coerce.number().int().positive(),
  action: z.enum(['accept', 'reject', 'block']),
});

// ==================== Group Schemas ====================

export const createGroupSchema = z.object({
  name: shortText.min(2, 'Group name is too short').max(100),
  description: safeText.max(1000).optional(),
  isPrivate: z.boolean().default(false),
});

export const groupInviteSchema = z.object({
  groupId: z.coerce.number().int().positive(),
  maxUses: z.coerce.number().int().min(1).max(1000).optional(),
  expiresIn: z.coerce.number().int().min(3600).max(2592000).optional(), // 1 hour to 30 days
  description: shortText.optional(),
  requireApproval: z.boolean().default(false),
});

export const joinGroupSchema = z.object({
  code: z.string().length(12, 'Invalid invite code'),
});

// ==================== Badge Schemas ====================

export const awardBadgeSchema = z.object({
  userAddress: ethereumAddress,
  badgeType: z.string().min(1).max(50),
  badgeName: shortText.optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ==================== Gamification Schemas ====================

export const awardXpSchema = z.object({
  userAddress: ethereumAddress,
  xpAmount: z.coerce.number().int().min(1).max(10000),
  reason: shortText.optional(),
});

// ==================== Proposal Schemas ====================

export const createProposalSchema = z.object({
  title: shortText.min(5, 'Title is too short').max(200),
  description: safeText.min(20, 'Description is too short').max(10000),
  proposerAddress: ethereumAddress,
  options: z.array(shortText).min(2).max(10).optional(),
  endsAt: z.coerce.date().optional(),
});

// ==================== Notification Schemas ====================

export const createNotificationSchema = z.object({
  userId: z.coerce.number().int().positive(),
  type: z.enum(['info', 'success', 'warning', 'error', 'transaction', 'social', 'system']),
  title: shortText,
  message: safeText.max(500),
  metadata: z.record(z.unknown()).optional(),
});

export const notificationPrefsSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

// ==================== Payment Schemas ====================

export const paymentRequestSchema = z.object({
  fromAddress: ethereumAddress,
  toAddress: ethereumAddress,
  amount: z.coerce.number().positive('Amount must be positive'),
  token: z.string().optional(),
  memo: shortText.optional(),
});

export const claimRewardSchema = z.object({
  rewardId: z.coerce.number().int().positive(),
});

// ==================== Activity Schemas ====================

export const activitySchema = z.object({
  userAddress: ethereumAddress,
  type: z.string().min(1).max(50),
  description: safeText.max(500).optional(),
  metadata: z.record(z.unknown()).optional(),
});

// ==================== Endorsement Schemas ====================

export const endorsementSchema = z.object({
  fromAddress: ethereumAddress,
  toAddress: ethereumAddress,
  skill: shortText.min(1).max(100),
  message: safeText.max(500).optional(),
});

// ==================== Analytics Schemas ====================

export const analyticsEventSchema = z.object({
  event: z.string().min(1).max(100),
  properties: z.record(z.unknown()).optional(),
  timestamp: z.coerce.date().optional(),
});

// ==================== Helper Functions ====================

/**
 * Validate request body against a schema
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; error: string; details?: z.ZodError['errors'] }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return {
        success: false,
        error: 'Validation failed',
        details: result.error.errors,
      };
    }
    
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: 'Invalid JSON body' };
  }
}

/**
 * Validate query parameters against a schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; error: string; details?: z.ZodError['errors'] } {
  const params = Object.fromEntries(searchParams.entries());
  const result = schema.safeParse(params);
  
  if (!result.success) {
    return {
      success: false,
      error: 'Invalid query parameters',
      details: result.error.errors,
    };
  }
  
  return { success: true, data: result.data };
}
