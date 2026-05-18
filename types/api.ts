/**
 * API-specific TypeScript type definitions
 */

// ============================================================================
// Request/Response Types
// ============================================================================

export interface APIRequest<T = unknown> {
  method: HTTPMethod;
  url: string;
  headers?: Record<string, string>;
  body?: T;
  query?: Record<string, string | number | boolean>;
}

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ValidationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  identifier: string;
}

// ============================================================================
// Endpoint-Specific Types
// ============================================================================

export interface LoginRequest {
  address: string;
  signature: string;
  message: string;
}

export interface RegisterRequest {
  address: string;
  username?: string;
  email?: string;
}

export interface MessageCreateRequest {
  recipientAddress: string;
  content: string;
  encrypted?: boolean;
}

export interface GroupCreateRequest {
  name: string;
  description?: string;
  memberAddresses?: string[];
}

export interface TransactionQueryRequest {
  userId?: string;
  limit?: number;
  offset?: number;
  status?: string;
}

// ============================================================================
// Middleware Types
// ============================================================================

export interface MiddlewareContext {
  requestId: string;
  startTime: number;
  userId?: string;
  userAddress?: string;
}

export interface ContentTypeOptions {
  allowed: string[];
  default: string;
}

export interface SizeLimitOptions {
  maxSize: number;
  unit: 'bytes' | 'KB' | 'MB';
}
