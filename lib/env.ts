/**
 * Environment Variable Validation with Zod
 * Centralized env validation with runtime type checking
 * 
 * This module validates all environment variables at runtime,
 * ensuring type safety and providing clear error messages for misconfiguration.
 */

import { z } from 'zod4';
import { ZERO_ADDRESS } from '@/lib/constants';
import { logger } from '@/lib/logger';

// Ethereum address regex validator
const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
const optionalEthAddress = z.string().regex(ethAddressRegex).optional();

// Define the schema for all required and optional environment variables
const envSchema = z.object({
  // Network Configuration
  NEXT_PUBLIC_NETWORK: z.enum(['base-sepolia', 'base', 'zksync', 'localhost']).default('base-sepolia'),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().int().positive().default(84532),
  NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID: z.coerce.number().int().positive().optional(),
  NEXT_PUBLIC_RPC_URL: z.string().url().default('https://sepolia.base.org'),
  NEXT_PUBLIC_IS_TESTNET: z.string().default('true').transform(v => v !== 'false'),
  NEXT_PUBLIC_DEFAULT_CHAIN: z.string().default('base-sepolia'),
  NEXT_PUBLIC_BASE_SEPOLIA_RPC: z.string().url().default('https://sepolia.base.org'),

  // API & Application URLs
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),
  NEXT_PUBLIC_EXPLORER_URL: z.string().url().default('https://sepolia.basescan.org'),

  // WebSocket
  NEXT_PUBLIC_WS_URL: z.string().optional(),

  // Core Token Contracts
  NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS: optionalEthAddress,

  // Governance Contracts
  NEXT_PUBLIC_DAO_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS: optionalEthAddress,

  // Vault Contracts
  NEXT_PUBLIC_VAULT_HUB_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_VAULT_IMPLEMENTATION: z.enum(['cardbound', 'uservault']).default('cardbound'),
  NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_DEV_VAULT_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS: optionalEthAddress,


  // ProofScore & Seer
  NEXT_PUBLIC_SEER_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_PROOF_SCORE_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_PROOF_LEDGER_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS: optionalEthAddress,

  // Security Contracts
  NEXT_PUBLIC_SECURITY_HUB_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_GUARDIAN_LOCK_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_PANIC_GUARD_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_EMERGENCY_BREAKER_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS: optionalEthAddress,

  // Rewards & Staking
  NEXT_PUBLIC_BURN_ROUTER_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS: optionalEthAddress,

  // Liquidity Pools
  NEXT_PUBLIC_VFIDE_ETH_LP: optionalEthAddress,
  NEXT_PUBLIC_VFIDE_USDC_LP: optionalEthAddress,
  NEXT_PUBLIC_VFIDE_WETH_POOL_ADDRESS: optionalEthAddress,

  // Commerce Contracts
  NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS: optionalEthAddress,
  NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS: optionalEthAddress,

  // Badge Contracts
  NEXT_PUBLIC_BADGE_NFT_ADDRESS: optionalEthAddress,

  // Feature Flags
  NEXT_PUBLIC_ENABLE_FAUCET: z.string().default('true').transform(v => v !== 'false'),
  NEXT_PUBLIC_ENABLE_DEMO_MODE: z.string().default('false').transform(v => v === 'true'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().default('false').transform(v => v === 'true'),
  NEXT_PUBLIC_ENABLE_CHAT: z.string().default('false').transform(v => v === 'true'),
  NEXT_PUBLIC_ENABLE_GOVERNANCE: z.string().default('false').transform(v => v === 'true'),
  NEXT_PUBLIC_ENABLE_SANCTUM: z.string().default('false').transform(v => v === 'true'),
  NEXT_PUBLIC_ENABLE_BETA_FEATURES: z.string().default('false').transform(v => v === 'true'),
  NEXT_PUBLIC_ENABLE_SW: z.string().default('false').transform(v => v === 'true'),
  NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS: z.string().default('false').transform(v => v === 'true'),
  SESSION_KEY_MAX_DURATION_SECONDS: z.coerce.number().int().positive().default(14400),

  // Analytics
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // External APIs
  NEXT_PUBLIC_COINGECKO_API_URL: z.string().url().default('https://api.coingecko.com/api/v3/simple/price'),
  NEXT_PUBLIC_SUBGRAPH_URL: z.string().url().optional(),
  NEXT_PUBLIC_IPFS_GATEWAY: z.string().url().default('https://ipfs.io/ipfs/'),

  // Push Notifications
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),

  // Wagmi / WalletConnect Configuration
  // Canonical key: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
  // NEXT_PUBLIC_WAGMI_PROJECT_ID is accepted as a legacy fallback in lib/wagmi.ts
  // but should not be set in new deployments.
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().default(''),

  // Build Information
  NEXT_PUBLIC_BUILD_ID: z.string().optional(),
  NEXT_PUBLIC_BUILD_TIME: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().default('1.0.0'),
});

export type Environment = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Now with safe defaults - won't crash if env vars are missing
 */
function parseEnv(): Environment {
  const raw = {
    // Network Configuration
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID: process.env.NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_IS_TESTNET: process.env.NEXT_PUBLIC_IS_TESTNET,
    NEXT_PUBLIC_DEFAULT_CHAIN: process.env.NEXT_PUBLIC_DEFAULT_CHAIN,
    NEXT_PUBLIC_BASE_SEPOLIA_RPC: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC,
    
    // API & Application URLs
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_EXPLORER_URL: process.env.NEXT_PUBLIC_EXPLORER_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    
    // Core Token Contracts
    NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS,
    
    // Governance Contracts
    NEXT_PUBLIC_DAO_ADDRESS: process.env.NEXT_PUBLIC_DAO_ADDRESS,
    NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS: process.env.NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS,
    NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS: process.env.NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS,
    NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS: process.env.NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS,
    
    // Vault Contracts
    NEXT_PUBLIC_VAULT_HUB_ADDRESS: process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS,
    NEXT_PUBLIC_VAULT_IMPLEMENTATION: process.env.NEXT_PUBLIC_VAULT_IMPLEMENTATION,
    NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS: process.env.NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS,
    NEXT_PUBLIC_DEV_VAULT_ADDRESS: process.env.NEXT_PUBLIC_DEV_VAULT_ADDRESS,
    NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS: process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS,
    NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS: process.env.NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS,
    NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS,
    NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS: process.env.NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS,
    
    // ProofScore & Seer
    NEXT_PUBLIC_SEER_ADDRESS: process.env.NEXT_PUBLIC_SEER_ADDRESS,
    NEXT_PUBLIC_PROOF_SCORE_ADDRESS: process.env.NEXT_PUBLIC_PROOF_SCORE_ADDRESS,
    NEXT_PUBLIC_PROOF_LEDGER_ADDRESS: process.env.NEXT_PUBLIC_PROOF_LEDGER_ADDRESS,
    NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS: process.env.NEXT_PUBLIC_TRUST_GATEWAY_ADDRESS,
    
    // Security Contracts
    NEXT_PUBLIC_SECURITY_HUB_ADDRESS: process.env.NEXT_PUBLIC_SECURITY_HUB_ADDRESS,
    NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_GUARDIAN_REGISTRY_ADDRESS,
    NEXT_PUBLIC_GUARDIAN_LOCK_ADDRESS: process.env.NEXT_PUBLIC_GUARDIAN_LOCK_ADDRESS,
    NEXT_PUBLIC_PANIC_GUARD_ADDRESS: process.env.NEXT_PUBLIC_PANIC_GUARD_ADDRESS,
    NEXT_PUBLIC_EMERGENCY_BREAKER_ADDRESS: process.env.NEXT_PUBLIC_EMERGENCY_BREAKER_ADDRESS,
    NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS: process.env.NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS,
    
    // Rewards & Staking
    NEXT_PUBLIC_BURN_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS,
    NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS: process.env.NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS,
    NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS: process.env.NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS,
    NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS: process.env.NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS,
    NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS: process.env.NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS,
    
    // Liquidity Pools
    NEXT_PUBLIC_VFIDE_ETH_LP: process.env.NEXT_PUBLIC_VFIDE_ETH_LP,
    NEXT_PUBLIC_VFIDE_USDC_LP: process.env.NEXT_PUBLIC_VFIDE_USDC_LP,
    NEXT_PUBLIC_VFIDE_WETH_POOL_ADDRESS: process.env.NEXT_PUBLIC_VFIDE_WETH_POOL_ADDRESS,
    
    // Commerce Contracts
    NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS: process.env.NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS,
    NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS: process.env.NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS,
    NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS,
    NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS: process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS,
    NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS: process.env.NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS,
    NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS,
    
    // Badge Contracts
    NEXT_PUBLIC_BADGE_NFT_ADDRESS: process.env.NEXT_PUBLIC_BADGE_NFT_ADDRESS,
    
    // Feature Flags
    NEXT_PUBLIC_ENABLE_FAUCET: process.env.NEXT_PUBLIC_ENABLE_FAUCET,
    NEXT_PUBLIC_ENABLE_DEMO_MODE: process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_ENABLE_CHAT: process.env.NEXT_PUBLIC_ENABLE_CHAT,
    NEXT_PUBLIC_ENABLE_GOVERNANCE: process.env.NEXT_PUBLIC_ENABLE_GOVERNANCE,
    NEXT_PUBLIC_ENABLE_SANCTUM: process.env.NEXT_PUBLIC_ENABLE_SANCTUM,
    NEXT_PUBLIC_ENABLE_BETA_FEATURES: process.env.NEXT_PUBLIC_ENABLE_BETA_FEATURES,
    NEXT_PUBLIC_ENABLE_SW: process.env.NEXT_PUBLIC_ENABLE_SW,
    NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS: process.env.NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS,
    SESSION_KEY_MAX_DURATION_SECONDS: process.env.SESSION_KEY_MAX_DURATION_SECONDS,
    
    // Analytics
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    
    // External APIs
    NEXT_PUBLIC_COINGECKO_API_URL: process.env.NEXT_PUBLIC_COINGECKO_API_URL,
    NEXT_PUBLIC_SUBGRAPH_URL: process.env.NEXT_PUBLIC_SUBGRAPH_URL,
    NEXT_PUBLIC_IPFS_GATEWAY: process.env.NEXT_PUBLIC_IPFS_GATEWAY,
    
    // Push Notifications
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    
    // Wagmi / WalletConnect Configuration
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
      ?? process.env.NEXT_PUBLIC_WAGMI_PROJECT_ID,
    
    // Build Information
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
    NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME,
    NEXT_PUBLIC_APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    if (process.env.NODE_ENV === 'production') {
      // In production, missing/invalid vars are a deployment error — surface them loudly.
      logger.error('❌ Environment variable validation failed in production. Check your deployment configuration.');
      logger.error('Missing/invalid vars:', result.error.flatten().fieldErrors);
      throw new Error('Environment validation failed in production');
    } else {
      logger.warn('⚠️  Some environment variables are missing or invalid. Using defaults.');
      logger.warn('For production, set these in Vercel: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID, NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_RPC_URL');
      // Return safe defaults in non-production so local development can continue.
      return envSchema.parse({});
    }
  }

  if (process.env.NODE_ENV === 'production') {
    const requiredExplicit = [
      'NEXT_PUBLIC_NETWORK',
      'NEXT_PUBLIC_CHAIN_ID',
      'NEXT_PUBLIC_RPC_URL',
      'NEXT_PUBLIC_IS_TESTNET',
      'NEXT_PUBLIC_EXPLORER_URL',
      'NEXT_PUBLIC_ENABLE_FAUCET',
    ] as const;

    const missingExplicit = requiredExplicit.filter((key) => {
      const raw = process.env[key];
      return raw === undefined || raw.trim() === '';
    });

    if (missingExplicit.length > 0) {
      logger.error('❌ Production requires explicit env values; refusing to use runtime defaults.');
      logger.error('Missing explicit vars:', missingExplicit);
      throw new Error('Production environment variables must be explicitly configured');
    }

    const chainId = result.data.NEXT_PUBLIC_CHAIN_ID;
    const isTestnet = result.data.NEXT_PUBLIC_IS_TESTNET;
    const faucetEnabled = result.data.NEXT_PUBLIC_ENABLE_FAUCET;
    const knownTestnetChainIds = new Set([11155111, 84532, 421614, 80002, 300]);

    if (!isTestnet && faucetEnabled) {
      throw new Error('NEXT_PUBLIC_ENABLE_FAUCET must be false when NEXT_PUBLIC_IS_TESTNET is false in production');
    }

    if (!isTestnet && knownTestnetChainIds.has(chainId)) {
      throw new Error('NEXT_PUBLIC_CHAIN_ID is testnet while NEXT_PUBLIC_IS_TESTNET is false in production');
    }
  }

  return result.data;
}

// Parse environment once at module load
let env: Environment | null = null;

/**
 * Get validated environment variables
 * @returns Validated environment object with type safety
 * @throws Error if environment variables are invalid
 */
export function getEnv(): Environment {
  if (!env) {
    env = parseEnv();
  }
  return env;
}

/**
 * Get a specific environment variable with type safety
 * @param key - Environment variable key
 * @param fallback - Optional fallback value
 * @returns Environment variable value or fallback
 */
export function getEnvVar<K extends keyof Environment>(
  key: K,
  fallback?: Environment[K]
): Environment[K] {
  const environment = getEnv();
  const value = environment[key];
  
  if (value === undefined || value === null) {
    if (fallback !== undefined) return fallback;
    throw new Error(`Environment variable ${String(key)} is not defined`);
  }
  
  return value;
}

/**
 * Check if a feature is enabled
 * @param feature - Feature flag key (without NEXT_PUBLIC_ENABLE_ prefix)
 * @returns Boolean indicating if feature is enabled
 */
export function isFeatureEnabled(
  feature: 'FAUCET' | 'DEMO_MODE' | 'ANALYTICS' | 'CHAT' | 'GOVERNANCE' | 'SANCTUM' | 'BETA_FEATURES' | 'SW' | 'PERSISTENT_SESSION_KEYS'
): boolean {
  const env = getEnv();
  const key = `NEXT_PUBLIC_ENABLE_${feature}` as const;
  return env[key] as boolean;
}

/**
 * Get contract address with validation
 * Returns zero address if not configured
 */
export function getContractAddress(contractName: string): `0x${string}` {
  const env = getEnv();
  const key = `NEXT_PUBLIC_${contractName.toUpperCase()}_ADDRESS` as keyof Environment;
  const address = env[key] as string | undefined;
  
  // Return zero address if not configured (allows graceful fallback)
  return (address as `0x${string}`) || ZERO_ADDRESS;
}

// Export the function itself (lazy evaluation)
// This prevents execution during module load/build time
export default getEnv;
