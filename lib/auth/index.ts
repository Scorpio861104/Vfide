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

