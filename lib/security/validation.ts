/**
 * Input Validation with Zod
 * 
 * Provides schema validation for all API endpoints to prevent
 * invalid data, injection attacks, and ensure type safety.
 */

import { z } from 'zod';

// Ethereum address validation
export const ethereumAddressSchema = z.string().regex(
  /^0x[a-fA-F0-9]{40}$/,
  'Invalid Ethereum address'
);

// Transaction hash validation
export const txHashSchema = z.string().regex(
  /^0x[a-fA-F0-9]{64}$/,
  'Invalid transaction hash'
);

// Badge ID validation (keccak256 hash)
export const badgeIdSchema = z.string().regex(
  /^0x[a-fA-F0-9]{64}$/,
  'Invalid badge ID'
);

/**
 * User Authentication Schemas
 */
export const loginSchema = z.object({
  walletAddress: ethereumAddressSchema,
  signature: z.string().min(1, 'Signature required'),
  nonce: z.string().min(1, 'Nonce required'),
});

export const registerSchema = z.object({
  walletAddress: ethereumAddressSchema,
  signature: z.string().min(1, 'Signature required'),
});

/**
 * Badge Event Schemas
 */
export const badgeEventSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  eventType: z.enum([
    'transaction',
    'vote',
    'proposal',
    'endorsement_given',
    'endorsement_received',
    'merchant_registration',
    'mentor_registration',
    'mentee_added',
    'bug_report',
    'security_report',
    'documentation_contribution',
    'tutorial_created',
  ]),
  metadata: z.record(z.any()).optional(),
});

export const autoMintBadgeSchema = z.object({
  userId: z.string().cuid('Invalid user ID'),
  badgeId: badgeIdSchema,
});

/**
 * Review Schemas
 */
export const createReviewSchema = z.object({
  merchantId: z.string().cuid('Invalid merchant ID'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  title: z.string().min(5, 'Title too short').max(100, 'Title too long'),
  comment: z.string().min(10, 'Comment too short').max(1000, 'Comment too long'),
});

export const respondToReviewSchema = z.object({
  reviewId: z.string().cuid('Invalid review ID'),
  response: z.string().min(10, 'Response too short').max(500, 'Response too long'),
});

/**
 * Endorsement Schemas
 */
export const createEndorsementSchema = z.object({
  endorsedAddress: ethereumAddressSchema,
  comment: z.string().max(500, 'Comment too long').optional(),
});

/**
 * Mentorship Schemas
 */
export const createMentorshipSchema = z.object({
  menteeAddress: ethereumAddressSchema,
});

export const completeMentorshipSchema = z.object({
  mentorshipId: z.string().cuid('Invalid mentorship ID'),
});

/**
 * Transaction Schemas
 */
export const createTransactionSchema = z.object({
  type: z.enum(['payment', 'escrow', 'conversion']),
  amount: z.string().regex(/^\d+\.?\d*$/, 'Invalid amount format'),
  token: z.string().min(1, 'Token required'),
  toAddress: ethereumAddressSchema.optional(),
});

/**
 * STABLE-PAY Conversion Schemas
 */
export const conversionConfigSchema = z.object({
  enabled: z.boolean(),
  targetStablecoin: z.enum(['USDC', 'USDT', 'DAI']),
  conversionThreshold: z.number().positive('Threshold must be positive'),
  slippageTolerance: z.number().min(0).max(5, 'Slippage must be 0-5%'),
  autoWithdraw: z.boolean(),
});

/**
 * Validation helper function
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return {
        success: false,
        error: `${firstError.path.join('.')}: ${firstError.message}`,
      };
    }
    return {
      success: false,
      error: 'Validation failed',
    };
  }
}

/**
 * Sanitization helper (for text inputs)
 */
export function sanitizeHtml(input: string): string {
  // Basic HTML sanitization - in production use DOMPurify
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * SQL injection prevention (Prisma handles this, but extra safety)
 */
export function sanitizeSqlInput(input: string): string {
  // Remove potentially dangerous SQL characters
  return input.replace(/[;'"\\]/g, '');
}

/**
 * File upload validation
 */
export const fileUploadSchema = z.object({
  filename: z.string().regex(/^[a-zA-Z0-9-_.]+$/, 'Invalid filename'),
  mimetype: z.enum([
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ], { errorMap: () => ({ message: 'Invalid file type' }) }),
  size: z.number().max(5 * 1024 * 1024, 'File too large (max 5MB)'),
});
