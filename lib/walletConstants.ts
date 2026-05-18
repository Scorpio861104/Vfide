/**
 * Wallet Connection Constants
 * 
 * Centralized configuration for all wallet-related timeouts, limits, and durations
 */

// ==================== TIMEOUTS ====================

/**
 * Connection timeout in milliseconds
 * Maximum time to wait for wallet connection before showing timeout error
 * Reduced from 30s to 15s for faster feedback
 */
export const CONNECTION_TIMEOUT_MS = 15000; // 15 seconds

/**
 * RPC request timeout in milliseconds
 * Maximum time to wait for RPC endpoint response
 */
export const RPC_TIMEOUT_MS = 5000; // 5 seconds

// ==================== CACHE DURATIONS ====================

/**
 * Cache TTL for various data types
 */
export const CACHE_TTL = {
  /** Icon cache duration (24 hours) */
  ICONS: 24 * 60 * 60 * 1000,
  
  /** Balance cache duration (30 seconds) */
  BALANCE: 30000,
  
  /** Latency cache duration (30 seconds) */
  LATENCY: 30000,
  
  /** Gas price cache duration (30 seconds) */
  GAS_PRICE: 30000,
  
  /** ENS name cache duration (1 hour) */
  ENS: 60 * 60 * 1000,
} as const;

/**
 * Polling intervals for real-time updates
 */
export const POLLING_INTERVALS = {
  /** Network latency check interval (60 seconds) - reduced frequency */
  LATENCY: 60000,
  
  /** Balance refresh interval (60 seconds) - reduced frequency */
  BALANCE: 60000,
  
  /** Cooldown countdown update interval (1 second) */
  COOLDOWN: 1000,
} as const;

// ==================== LIMITS ====================

/**
 * Maximum number of items in various caches
 */
export const CACHE_LIMITS = {
  /** Maximum wallet icons cached */
  ICONS: 50,
  
  /** Maximum balance entries cached */
  BALANCE: 100,
  
  /** Maximum connection history items */
  HISTORY: 10,
} as const;

/**
 * Connection attempt limits
 */
export const CONNECTION_LIMITS = {
  /** Maximum failed attempts before cooldown */
  MAX_ATTEMPTS: 10,
  
  /** Cooldown duration after max attempts (15 seconds) */
  COOLDOWN_DURATION: 15000,
} as const;

// ==================== ANIMATIONS ====================

/**
 * Animation durations in milliseconds
 */
export const ANIMATION_DURATION = {
  /** Fast animations (150ms) */
  FAST: 150,
  
  /** Standard animations (300ms) */
  STANDARD: 300,
  
  /** Slow animations (500ms) */
  SLOW: 500,
  
  /** Scroll-to-top delay after connection (500ms) */
  SCROLL_DELAY: 500,
} as const;

// ==================== QUERY CONFIG ====================

/**
 * React Query configuration
 */
export const QUERY_CONFIG = {
  /** Query stale time (2 minutes) */
  STALE_TIME: 2 * 60 * 1000,
  
  /** Number of retry attempts */
  RETRY_COUNT: 2,
  
  /** Maximum retry delay (5 seconds) */
  MAX_RETRY_DELAY: 5000,
} as const;
