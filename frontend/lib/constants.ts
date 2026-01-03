/**
 * Global constants for the VFIDE frontend
 */

// ========================================
// ETHEREUM CONSTANTS
// ========================================

/**
 * Zero address constant (0x0000...)
 * Used for unset addresses, burn destination, etc.
 */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

/**
 * Maximum uint256 value (2^256 - 1)
 * Used for infinite approvals
 */
export const MAX_UINT256 = 2n ** 256n - 1n;

/**
 * Ethereum address format validation
 */
export const ETH_ADDRESS_LENGTH = 42; // Including '0x' prefix
export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// ========================================
// TIME CONSTANTS
// ========================================

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;
export const MILLISECONDS_PER_SECOND = 1000;
export const MILLISECONDS_PER_MINUTE = 60000;
export const MILLISECONDS_PER_HOUR = 3600000;
export const MILLISECONDS_PER_DAY = 86400000;

// Common time periods (in seconds)
export const HOURS_2 = 2 * SECONDS_PER_HOUR;      // 7,200 seconds
export const HOURS_24 = 24 * SECONDS_PER_HOUR;    // 86,400 seconds (1 day)
export const HOURS_48 = 48 * SECONDS_PER_HOUR;    // 172,800 seconds (2 days)
export const DAYS_7 = 7 * SECONDS_PER_DAY;        // 604,800 seconds (1 week)
export const DAYS_30 = 30 * SECONDS_PER_DAY;      // 2,592,000 seconds (~1 month)
export const DAYS_90 = 90 * SECONDS_PER_DAY;      // Oath presale lock period
export const DAYS_180 = 180 * SECONDS_PER_DAY;    // Founding presale lock period

// Time periods in milliseconds (for Date.now() calculations)
export const HOURS_5_MS = 5 * MILLISECONDS_PER_HOUR;
export const HOURS_24_MS = 24 * MILLISECONDS_PER_HOUR;
export const HOURS_48_MS = 48 * MILLISECONDS_PER_HOUR;
export const DAYS_60_MS = 60 * MILLISECONDS_PER_DAY;

// ========================================
// NUMERIC CONSTANTS
// ========================================

// Token decimals (VFIDE uses 18 decimals like ETH)
export const VFIDE_DECIMALS = 18;
export const DEFAULT_TOKEN_DECIMALS = 18;
export const USDC_DECIMALS = 6;

// Scaling factors
export const WEI_PER_ETHER = 10n ** 18n;
export const GWEI_PER_ETHER = 10n ** 9n;

// Max values for type safety
export const MAX_INT = 2147483647;           // 2^31 - 1
export const MAX_PERCENTAGE = 100;           // 100%
export const MIN_PERCENTAGE = 0;             // 0%

// Basis points (1 basis point = 0.01% = 1/10000)
export const PERCENTAGE_TO_BPS = 100;        // Convert percentage to basis points
export const BPS_UNIT = 10000;               // 100% = 10000 basis points
export const MIN_BPS = 1;                    // Minimum 0.01%
export const MAX_BPS = 10000;                // Maximum 100%
export const MAX_TOTAL_FEE_BPS = 1000;       // Max total fees: 10%

// ========================================
// UI/UX CONSTANTS
// ========================================

// Timeouts (in milliseconds)
export const TOAST_DURATION_MS = 3000;       // Standard toast/notification duration
export const LOADING_TIMEOUT_MS = 30000;     // 30 seconds max for loading states
export const CONFETTI_DURATION_MS = 3000;    // Confetti animation duration
export const STEP_TRANSITION_MS = 1000;      // Demo step transition delay
export const AUTO_REFRESH_INTERVAL_MS = 5000;  // Auto-refresh interval (e.g., faucet status)
export const MINUTE_UPDATE_INTERVAL_MS = 60000; // Update every minute (e.g., countdown timers)

// ProofScore ranges
export const MIN_PROOF_SCORE = 0;
export const MAX_PROOF_SCORE = 10000;
export const GOVERNANCE_MIN_SCORE = 5400;    // 54% minimum for governance voting
export const GOVERNANCE_QUORUM_VOTES = 5000; // Minimum votes required for DAO proposal quorum
export const MERCHANT_MIN_SCORE = 5600;      // 56% minimum for merchant listing
export const HIGH_TRUST_THRESHOLD = 8000;    // 80% - reduced fee tier
export const LOW_TRUST_THRESHOLD = 4000;     // 40% - higher fee tier

// UI preset values
export const PRESET_AMOUNTS = {
  SMALL: [100, 500, 1000, 5000],             // Small denomination presets
  MEDIUM: [1000, 10000, 50000, 100000],      // Medium denomination presets
  LARGE: [10000, 50000, 100000, 500000],     // Large denomination presets
} as const;

// Default values
export const DEFAULT_VAULT_DEPOSIT = 1000;
export const DEFAULT_STAKE_AMOUNT = '1000';
export const DEFAULT_PAYROLL_TOPUP = '5000';

// ========================================
// TOKEN PRICING
// ========================================

/**
 * Presale tier prices in USD (from VFIDEPresale.sol)
 * 
 * Supply breakdown:
 * - Tier 0 (Founding): $0.03 per VFIDE, 10M cap
 * - Tier 1 (Oath): $0.05 per VFIDE, 10M cap
 * - Tier 2 (Public): $0.07 per VFIDE, 15M cap
 * - Total: 35M base tokens, 15M bonus pool = 50M presale allocation
 * 
 * Lock bonuses:
 * - 180-day lock: +30% bonus (10% immediate)
 * - 90-day lock: +15% bonus (20% immediate)
 * - No lock: 0% bonus (100% immediate)
 * 
 * Referral bonuses:
 * - Referrer: +3% of base tokens
 * - Referee: +2% of base tokens
 */
export const PRESALE_PRICES = {
  FOUNDING: 0.03,  // Tier 0: $0.03 per VFIDE
  OATH: 0.05,      // Tier 1: $0.05 per VFIDE
  PUBLIC: 0.07,    // Tier 2: $0.07 per VFIDE
} as const;

export const PRESALE_CAPS = {
  FOUNDING: 10_000_000,  // 10M tokens at $0.03
  OATH: 10_000_000,      // 10M tokens at $0.05
  PUBLIC: 15_000_000,    // 15M tokens at $0.07
} as const;

/**
 * Total presale supply breakdown
 * 35M base allocation + 15M bonus pool = 50M total (25% of max supply)
 */
export const PRESALE_SUPPLY = {
  BASE: 35_000_000,
  BONUS_POOL: 15_000_000,
  TOTAL: 50_000_000,
} as const;

/**
 * Lock period bonuses (from 15M bonus pool)
 */
export const LOCK_BONUSES = {
  LOCK_180_DAYS: { bonus: 0.30, immediate: 0.10, days: 180 },  // +30% bonus, 10% immediate
  LOCK_90_DAYS: { bonus: 0.15, immediate: 0.20, days: 90 },    // +15% bonus, 20% immediate
  NO_LOCK: { bonus: 0, immediate: 1.0, days: 0 },              // 100% immediate
} as const;

/**
 * Referral bonuses (from bonus pool)
 */
export const REFERRAL_BONUSES = {
  REFERRER: 0.03,  // 3% of base tokens
  REFEREE: 0.02,   // 2% of base tokens
} as const;

/**
 * Dynamic listing price range based on presale completion
 */
export const LISTING_PRICE = {
  MIN: 0.10,  // At 25% sold
  MAX: 0.14,  // At 100% sold
} as const;

/**
 * Reference price for VFIDE token in USD
 * Used for displaying estimated USD values in the UI
 * 
 * Using the middle tier (Oath) as a balanced reference point.
 * When tokens are listed on DEX, this should be updated to use
 * a live price oracle (e.g., from Seer or a DEX aggregator).
 */
export const PRESALE_REFERENCE_PRICE = PRESALE_PRICES.OATH;

// ========================================
// FEATURE FLAGS
// ========================================

/**
 * Whether the app is in demo mode
 * When true, shows demo labels on mock data
 */
export const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// ========================================
// TIME CONSTANTS
// ========================================

/**
 * Recovery expiry period in days
 */
export const RECOVERY_EXPIRY_DAYS = 7;

/**
 * Guardian maturity period in days (before they can vote)
 */
export const GUARDIAN_MATURITY_DAYS = 7;

// ========================================
// NUMERIC LIMITS
// ========================================

/**
 * ProofScore permission thresholds (from DAO.sol and MerchantPortal.sol)
 * Governs what actions a user can take based on their score
 */
export const PROOF_SCORE_PERMISSIONS = {
  // Governance eligibility
  MIN_FOR_GOVERNANCE: 5400,  // 54% - Required to vote on proposals
  
  // Merchant eligibility
  MIN_FOR_MERCHANT: 5600,    // 56% - Required to register as merchant
  
  // Council eligibility (from CouncilElection.sol)
  MIN_FOR_COUNCIL: 7000,     // 70% - Required to be elected to council
  
  // Maximum score (elite)
  MAX_SCORE: 10000,
} as const;

/**
 * ProofScore tiers for UI display and calculations
 * Defines trust levels and associated capabilities
 */
export const PROOF_SCORE_TIERS = {
  RISKY: {
    min: 0,
    max: 3500,
    label: 'Risky',
    color: 'red',
    canVote: false,
    canMerchant: false,
  },
  LOW_TRUST: {
    min: 3500,
    max: 5000,
    label: 'Low Trust',
    color: 'orange',
    canVote: false,
    canMerchant: false,
  },
  NEUTRAL: {
    min: 5000,
    max: 5400,
    label: 'Neutral',
    color: 'yellow',
    canVote: false,
    canMerchant: false,
  },
  GOVERNANCE: {
    min: 5400,
    max: 5600,
    label: 'Governance',
    color: 'blue',
    canVote: true,
    canMerchant: false,
  },
  MERCHANT: {
    min: 5600,
    max: 7000,
    label: 'Trusted',
    color: 'green',
    canVote: true,
    canMerchant: true,
  },
  COUNCIL: {
    min: 7000,
    max: 8000,
    label: 'Council',
    color: 'emerald',
    canVote: true,
    canMerchant: true,
  },
  ELITE: {
    min: 8000,
    max: 10000,
    label: 'Elite',
    color: 'emerald',
    canVote: true,
    canMerchant: true,
  },
} as const;

/**
 * Score thresholds for tier colors (legacy - use PROOF_SCORE_TIERS instead)
 */
export const SCORE_THRESHOLDS = {
  EXCELLENT: 9000,  // 9000+ = excellent (emerald)
  GOOD: 7000,       // 7000-8999 = good (green)
  FAIR: 4000,       // 4000-6999 = fair (yellow)
  LOW: 2000,        // 2000-3999 = low (orange)
  // Below 2000 = poor (red)
} as const;
