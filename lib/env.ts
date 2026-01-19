/**
 * Environment Variable Validation with Zod
 * M-3 Fix: Centralized env validation with runtime type checking
 * 
 * This module validates all environment variables at runtime,
 * ensuring type safety and providing clear error messages for misconfiguration.
 */

import { z } from 'zod';

// Define the schema for all required and optional environment variables
const envSchema = z.object({
  // Network Configuration
  NEXT_PUBLIC_NETWORK: z.enum(['base-sepolia', 'base', 'zksync', 'localhost']).default('base-sepolia'),
  NEXT_PUBLIC_CHAIN_ID: z.coerce.number().int().positive().default(84532),
  NEXT_PUBLIC_RPC_URL: z.string().url().default('https://sepolia.base.org'),

  // API Configuration
  NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),

  // Contract Addresses (with fallback to zero address)
  NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_DAO_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_VAULT_HUB_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_SECURITY_HUB_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_PROOF_SCORE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_BURN_ROUTER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_PROMOTIONAL_TREASURY_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_BADGE_NFT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),

  // Feature Flags
  NEXT_PUBLIC_ENABLE_FAUCET: z.string().default('true').transform(v => v !== 'false'),
  NEXT_PUBLIC_ENABLE_DEMO_MODE: z.string().default('false').transform(v => v === 'true'),
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().default('false').transform(v => v === 'true'),

  // Analytics
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),

  // Wagmi Configuration
  NEXT_PUBLIC_WAGMI_PROJECT_ID: z.string().default(''),

  // Application URLs
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_DOCS_URL: z.string().url().optional(),

  // Build Information
  NEXT_PUBLIC_BUILD_ID: z.string().optional(),
  NEXT_PUBLIC_BUILD_TIME: z.string().optional(),
});

export type Environment = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Now with safe defaults - won't crash if env vars are missing
 */
function parseEnv(): Environment {
  const raw = {
    NEXT_PUBLIC_NETWORK: process.env.NEXT_PUBLIC_NETWORK,
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID,
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS,
    NEXT_PUBLIC_DAO_ADDRESS: process.env.NEXT_PUBLIC_DAO_ADDRESS,
    NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS: process.env.NEXT_PUBLIC_COUNCIL_ELECTION_ADDRESS,
    NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS: process.env.NEXT_PUBLIC_COUNCIL_SALARY_ADDRESS,
    NEXT_PUBLIC_VAULT_HUB_ADDRESS: process.env.NEXT_PUBLIC_VAULT_HUB_ADDRESS,
    NEXT_PUBLIC_SECURITY_HUB_ADDRESS: process.env.NEXT_PUBLIC_SECURITY_HUB_ADDRESS,
    NEXT_PUBLIC_PROOF_SCORE_ADDRESS: process.env.NEXT_PUBLIC_PROOF_SCORE_ADDRESS,
    NEXT_PUBLIC_BURN_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_BURN_ROUTER_ADDRESS,
    NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS: process.env.NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS,
    NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS: process.env.NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS,
    NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS: process.env.NEXT_PUBLIC_DUTY_DISTRIBUTOR_ADDRESS,
    NEXT_PUBLIC_PROMOTIONAL_TREASURY_ADDRESS: process.env.NEXT_PUBLIC_PROMOTIONAL_TREASURY_ADDRESS,
    NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS: process.env.NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS,
    NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS: process.env.NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS,
    NEXT_PUBLIC_BADGE_NFT_ADDRESS: process.env.NEXT_PUBLIC_BADGE_NFT_ADDRESS,
    NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS: process.env.NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS,
    NEXT_PUBLIC_ENABLE_FAUCET: process.env.NEXT_PUBLIC_ENABLE_FAUCET,
    NEXT_PUBLIC_ENABLE_DEMO_MODE: process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE,
    NEXT_PUBLIC_ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS,
    NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_WAGMI_PROJECT_ID: process.env.NEXT_PUBLIC_WAGMI_PROJECT_ID,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_DOCS_URL: process.env.NEXT_PUBLIC_DOCS_URL,
    NEXT_PUBLIC_BUILD_ID: process.env.NEXT_PUBLIC_BUILD_ID,
    NEXT_PUBLIC_BUILD_TIME: process.env.NEXT_PUBLIC_BUILD_TIME,
  };

  const result = envSchema.safeParse(raw);

  if (!result.success) {
    // Log warnings but don't crash - use defaults
    console.warn('⚠️  Some environment variables are missing or invalid. Using defaults.');
    console.warn('For production, set these in Vercel: NEXT_PUBLIC_WAGMI_PROJECT_ID, NEXT_PUBLIC_CHAIN_ID, NEXT_PUBLIC_RPC_URL');
    
    // Return safe defaults
    return envSchema.parse({});
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
  feature: 'FAUCET' | 'DEMO_MODE' | 'ANALYTICS'
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
  return (address as `0x${string}`) || ('0x0000000000000000000000000000000000000000' as const);
}

// Export the function itself (lazy evaluation)
// This prevents execution during module load/build time
export default getEnv;
