/**
 * Auth Module Exports
 * Centralized exports for authentication, authorization, rate limiting, and validation
 */

// JWT Authentication
export {
  generateToken,
  verifyToken,
  extractToken,
  isTokenExpired,
  shouldRefreshToken,
  type JWTPayload,
  type TokenResponse,
} from './jwt';

// Middleware
export {
  verifyAuth,
  requireAuth,
  checkOwnership,
  requireOwnership,
  isAdmin,
  requireAdmin,
  optionalAuth,
  type AuthResult,
} from './middleware';

// Rate Limiting
export {
  rateLimit,
  withRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
} from './rateLimit';

// Validation Schemas
export {
  // Common validators
  ethereumAddress,
  txHash,
  username,
  safeText,
  shortText,
  urlString,
  paginationParams,
  
  // Auth
  authSchema,
  
  // User
  createUserSchema,
  updateUserSchema,
  
  // Messages
  sendMessageSchema,
  editMessageSchema,
  reactionSchema,
  
  // Friends
  friendRequestSchema,
  friendActionSchema,
  
  // Groups
  createGroupSchema,
  groupInviteSchema,
  joinGroupSchema,
  
  // Badges
  awardBadgeSchema,
  
  // Gamification
  awardXpSchema,
  
  // Proposals
  createProposalSchema,
  
  // Notifications
  createNotificationSchema,
  notificationPrefsSchema,
  
  // Payments
  paymentRequestSchema,
  claimRewardSchema,
  
  // Activity
  activitySchema,
  
  // Endorsements
  endorsementSchema,
  
  // Analytics
  analyticsEventSchema,
  
  // Helpers
  validateBody,
  validateQuery,
} from './validation';
