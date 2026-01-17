/**
 * Centralized Configuration Constants
 * 
 * Consolidates magic numbers and configuration values used throughout the application.
 * Makes it easier to maintain and update configuration in one place.
 */

/**
 * Authentication & Security Configuration
 */
export const AUTH_CONFIG = {
  // Session token expiration time (24 hours in milliseconds)
  SESSION_EXPIRY_MS: 24 * 60 * 60 * 1000,
  
  // Rate limiting for authentication attempts
  RATE_LIMIT: {
    MAX_ATTEMPTS: 5,
    WINDOW_MS: 60000, // 1 minute
  },
  
  // Minimum secret length for HMAC
  MIN_SECRET_LENGTH: 32,
} as const;

/**
 * ProofScore Configuration
 */
export const PROOFSCORE_CONFIG = {
  // Score tiers
  TIERS: {
    ELITE: { MIN: 8000, MAX: 10000, FEE_PERCENT: 0.25 },
    HIGH_TRUST: { MIN: 7000, MAX: 7999, FEE_PERCENT: 1.0 },
    NEUTRAL: { MIN: 5000, MAX: 6999, FEE_PERCENT: 2.0 },
    LOW_TRUST: { MIN: 3500, MAX: 4999, FEE_PERCENT: 3.5 },
    RISKY: { MIN: 0, MAX: 3499, FEE_PERCENT: 5.0 },
  } as const,
  
  // Starting score for new users
  DEFAULT_SCORE: 5000,
  
  // Minimum scores for features
  MIN_SCORES: {
    VOTING: 5400,
    MERCHANT: 5600,
    PROPOSAL_CREATION: 7000,
    MENTORSHIP: 7000,
    ENDORSEMENT: 8000,
  } as const,
} as const;

/**
 * Token Economics Configuration
 */
export const TOKEN_CONFIG = {
  SYMBOL: 'VFIDE',
  DECIMALS: 18,
  TOTAL_SUPPLY: 200000000,
  
  // Fee distribution percentages
  FEE_DISTRIBUTION: {
    BURN: 62.5,
    SANCTUM_VAULT: 31.25,
    ECOSYSTEM_VAULT: 6.25,
  } as const,
  
  // Presale tiers
  PRESALE_TIERS: {
    FOUNDING: { PRICE: 0.03, CAP: 10000000 },
    OATH: { PRICE: 0.05, CAP: 10000000 },
    PUBLIC: { PRICE: 0.07, CAP: 15000000 },
  } as const,
} as const;

/**
 * Gamification Configuration
 */
export const GAMIFICATION_CONFIG = {
  // XP rewards for activities
  XP_REWARDS: {
    VOTE: { MIN: 10, MAX: 25 },
    MESSAGE: { MIN: 5, MAX: 10 },
    ENDORSEMENT: { MIN: 15, MAX: 30 },
    TRANSACTION: { MIN: 5, MAX: 20 },
    BADGE_EARNED: { MIN: 15, MAX: 50 },
    MENTEE_SUCCESS: 50,
    ACTIVITY_STREAK: 15,
  } as const,
  
  // XP penalties
  XP_PENALTIES: {
    FAILED_TRANSACTION: { MIN: 5, MAX: 20 },
    DISPUTE_LOST: { MIN: 50, MAX: 200 },
    INACTIVITY_MONTHLY: 5,
    COMMUNITY_REPORT: { MIN: 25, MAX: 100 },
  } as const,
  
  // Badge rarities and points
  BADGE_RARITIES: {
    COMMON: { POINTS: { MIN: 10, MAX: 15 }, DURATION: 'temporary' },
    RARE: { POINTS: { MIN: 25, MAX: 35 }, DURATION: '1_year' },
    EPIC: { POINTS: { MIN: 40, MAX: 50 }, DURATION: 'permanent' },
    LEGENDARY: { POINTS: { MIN: 75, MAX: 100 }, DURATION: 'permanent' },
  } as const,
} as const;

/**
 * Pagination & Limits Configuration
 */
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 30,
  MAX_PAGE_SIZE: 100,
  
  // Specific limits
  MESSAGES_LIMIT: 50,
  LEADERBOARD_LIMIT: 50,
  ACTIVITY_FEED_LIMIT: 20,
} as const;

/**
 * Time Constants (in milliseconds)
 */
export const TIME_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000,
  
  // Governance voting periods
  VOTING_PERIODS: {
    PARAMETER_CHANGE: 7 * 24 * 60 * 60 * 1000, // 7 days
    TREASURY_SPEND: 14 * 24 * 60 * 60 * 1000, // 14 days
    EMERGENCY: 3 * 24 * 60 * 60 * 1000, // 3 days
    CONSTITUTION: 21 * 24 * 60 * 60 * 1000, // 21 days
  } as const,
} as const;

/**
 * Network Configuration
 */
export const NETWORK_CONFIG = {
  // Chain IDs
  CHAINS: {
    BASE_MAINNET: 8453,
    BASE_SEPOLIA: 84532,
    POLYGON_MAINNET: 137,
    POLYGON_AMOY: 80002,
    ZKSYNC_MAINNET: 324,
    ZKSYNC_SEPOLIA: 300,
  } as const,
  
  // Default RPC URLs (can be overridden by environment variables)
  DEFAULT_RPCS: {
    BASE_MAINNET: 'https://mainnet.base.org',
    BASE_SEPOLIA: 'https://sepolia.base.org',
    POLYGON_MAINNET: 'https://polygon-rpc.com',
    POLYGON_AMOY: 'https://rpc-amoy.polygon.technology',
    ZKSYNC_MAINNET: 'https://mainnet.era.zksync.io',
    ZKSYNC_SEPOLIA: 'https://sepolia.era.zksync.dev',
  } as const,
} as const;

/**
 * Storage Keys (for localStorage/sessionStorage)
 */
export const STORAGE_KEYS = {
  API_TOKEN: 'vfide_api_token',
  THEME: 'vfide_theme',
  LANGUAGE: 'vfide_language',
  WALLET_CONNECTED: 'vfide_wallet_connected',
  USER_PREFERENCES: 'vfide_user_preferences',
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  // Timeout for API requests
  REQUEST_TIMEOUT_MS: 30000, // 30 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  
  // Rate limiting (client-side)
  CLIENT_RATE_LIMIT: {
    MAX_REQUESTS: 100,
    WINDOW_MS: 60000, // 1 minute
  },
} as const;

/**
 * Validation Constants
 */
export const VALIDATION_CONFIG = {
  // Address validation
  ETHEREUM_ADDRESS_REGEX: /^0x[a-fA-F0-9]{40}$/,
  
  // Content length limits
  MAX_LENGTHS: {
    MESSAGE: 5000,
    BIO: 500,
    USERNAME: 50,
    DISPLAY_NAME: 100,
    PROPOSAL_TITLE: 200,
    PROPOSAL_DESCRIPTION: 10000,
  } as const,
  
  // File upload limits
  FILE_LIMITS: {
    MAX_SIZE_MB: 10,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'application/msword'],
  } as const,
} as const;

/**
 * UI Configuration
 */
export const UI_CONFIG = {
  // Responsive breakpoints (matching Tailwind defaults)
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  } as const,
  
  // Animation durations
  ANIMATION_DURATIONS: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  } as const,
  
  // Toast notification duration
  TOAST_DURATION_MS: 5000,
} as const;

/**
 * Feature Flags
 * Can be overridden by environment variables
 */
export const FEATURE_FLAGS = {
  ENABLE_STAKING: process.env.NEXT_PUBLIC_FEATURE_STAKING === 'true',
  ENABLE_GOVERNANCE: true,
  ENABLE_MESSAGING: true,
  ENABLE_MENTORSHIP: true,
  ENABLE_ENDORSEMENTS: true,
} as const;
