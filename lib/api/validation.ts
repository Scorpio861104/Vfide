/**
 * Centralized Zod validation schemas for API endpoints
 * Addresses Critical Issue #2: Add Zod validation to 32 API endpoints
 */

import { z } from 'zod4';
import { isAddress } from 'viem';

// Custom Ethereum address validator
export const ethereumAddressSchema = z
  .string()
  .refine((addr) => isAddress(addr), {
    message: 'Invalid Ethereum address format'
  });

// User ID validation (UUID format or address)
export const userIdSchema = z
  .string()
  .min(1, 'User ID is required')
  .refine(
    (id) => {
      // Check if UUID format or Ethereum address
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id) || isAddress(id);
    },
    { message: 'Invalid user ID format' }
  );

// Pagination schemas
export const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 30))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0))
});

// Amount validation (for crypto transactions)
export const amountSchema = z
  .string()
  .refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && isFinite(num) && num > 0;
  }, { message: 'Invalid amount: must be a positive number' });

// Timestamp validation
export const timestampSchema = z
  .string()
  .or(z.number())
  .transform((val) => {
    const num = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid timestamp');
    }
    return num;
  });

// Message content validation
export const messageContentSchema = z.object({
  content: z.string().min(1).max(5000, 'Message too long'),
  recipientAddress: ethereumAddressSchema,
  encrypted: z.boolean().optional()
});

// Message edit validation
export const messageEditSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
  content: z.string().min(1).max(5000, 'Message too long'),
  userAddress: ethereumAddressSchema
});

// Message deletion validation
export const messageDeleteSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
  userAddress: ethereumAddressSchema
});

// Reaction validation
export const reactionSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
  reaction: z.string().min(1).max(50),
  userAddress: ethereumAddressSchema
});

// Group/Community validation
export const groupIdSchema = z.string().uuid('Invalid group ID');

export const groupMemberSchema = z.object({
  groupId: groupIdSchema,
  userAddress: ethereumAddressSchema,
  role: z.enum(['admin', 'moderator', 'member']).optional()
});

// Badge/Achievement validation
export const badgeIdSchema = z.string().min(1).max(100);

export const questIdSchema = z.string().min(1).max(100);

// Notification validation
export const notificationPreferencesSchema = z.object({
  email: z.boolean().optional(),
  push: z.boolean().optional(),
  inApp: z.boolean().optional(),
  sms: z.boolean().optional()
});

// Attachment validation
export const attachmentIdSchema = z.string().uuid('Invalid attachment ID');

// Transaction validation
export const transactionQuerySchema = z.object({
  userId: userIdSchema,
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0)),
  status: z.enum(['pending', 'confirmed', 'failed']).optional()
});

// Crypto fee validation
export const feeQuerySchema = z.object({
  from: ethereumAddressSchema.optional(),
  to: ethereumAddressSchema.optional(),
  amount: amountSchema.optional(),
  tokenAddress: ethereumAddressSchema.optional()
});

// Payment request validation
export const paymentRequestSchema = z.object({
  amount: amountSchema,
  recipientAddress: ethereumAddressSchema,
  description: z.string().max(500).optional(),
  expiresAt: timestampSchema.optional()
});

// Analytics query validation
export const analyticsQuerySchema = z.object({
  startDate: timestampSchema.optional(),
  endDate: timestampSchema.optional(),
  userId: userIdSchema.optional(),
  eventType: z.string().max(100).optional()
});

// Security violation report validation
export const securityViolationSchema = z.object({
  type: z.enum(['csp', 'xss', 'injection', 'ratelimit', 'auth', 'other']),
  details: z.string().max(2000),
  userAgent: z.string().max(500).optional(),
  url: z.string().url().optional()
});

// Helper function to validate request body
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    
    return {
      success: true,
      data: result.data
    };
  } catch (_error) {
    return {
      success: false,
      error: 'Invalid JSON body'
    };
  }
}

// Helper function to validate query parameters
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const result = schema.safeParse(params);
    
    if (!result.success) {
      return {
        success: false,
        error: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    
    return {
      success: true,
      data: result.data
    };
  } catch (_error) {
    return {
      success: false,
      error: 'Invalid query parameters'
    };
  }
}
