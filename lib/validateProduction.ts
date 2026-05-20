/**
 * Production Environment Validation
 * 
 * Validates that all required environment variables are set for production deployment.
 * Run this before deploying to production to catch configuration issues early.
 */

import * as dotenv from 'dotenv';
// Load local env files when running validation via npm scripts.
dotenv.config({ path: '.env.local' });
dotenv.config();

interface EnvironmentConfig {
  name: string;
  required: boolean;
  category: 'blockchain' | 'api' | 'security' | 'monitoring' | 'feature';
  production?: boolean; // Only required in production
}

const REQUIRED_ENV_VARS: EnvironmentConfig[] = [
  // Blockchain Configuration
  { name: 'NEXT_PUBLIC_CHAIN_ID', required: true, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID', required: false, category: 'blockchain', production: true },
  // T-CHAIN-3-VARS FIX: NEXT_PUBLIC_DEFAULT_CHAIN_ID is read by lib/testnet.ts and the
  // frontend chain default. Without an explicit production check, an unset value silently
  // falls back to Base Sepolia (84532), causing the frontend to sign EIP-712 intents
  // against the wrong chain in production.
  { name: 'NEXT_PUBLIC_DEFAULT_CHAIN_ID', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_RPC_URL', required: true, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_EXPLORER_URL', required: true, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_IS_TESTNET', required: true, category: 'blockchain' },

  // Core contract addresses
  { name: 'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS', required: false, category: 'blockchain', production: true },
  // StablecoinRegistry is deferred for V1 mainnet (see contracts/PRODUCTION_SET.md
  // 2026-05-16). API routes gracefully degrade when this is unset; do NOT require
  // it in production. Frontend ABI + env var key retained for forward compatibility.
  { name: 'NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS', required: false, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_VAULT_HUB_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_VAULT_IMPLEMENTATION', required: false, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_DAO_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_SEER_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_PROOF_LEDGER_ADDRESS', required: false, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS', required: false, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS', required: false, category: 'blockchain', production: true },
  // SubscriptionManager is in contracts/future/ — NOT deployed for V1 mainnet.
  // Frontend has graceful-degrade behavior. Do not require in production.
  { name: 'NEXT_PUBLIC_SUBSCRIPTION_MANAGER_ADDRESS', required: false, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_DEV_VAULT_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS', required: false, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_ECO_TREASURY_VAULT_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_ESCROW_MANAGER_ADDRESS', required: false, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS', required: false, category: 'blockchain', production: true },

  // 2026-05-20 mainnet-readiness sweep: every contract referenced by lib/contracts.ts
  // that participates in the V1 production flow MUST be `production: true`.
  // Without this, NODE_ENV=production silently falls back to undefined for these
  // addresses, causing client-side reads to return zero/empty and breaking core flows.
  { name: 'NEXT_PUBLIC_BURN_ROUTER_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_FLASH_LOAN_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_TERM_LOAN_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_PROOF_LEDGER_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS', required: false, category: 'blockchain', production: true },
  { name: 'NEXT_PUBLIC_CARD_BOUND_VAULT_DEPLOYER_ADDRESS', required: false, category: 'blockchain', production: true },


  // WalletConnect (optional but recommended)
  { name: 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', required: false, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_WAGMI_PROJECT_ID', required: false, category: 'blockchain' },

  // Application URLs
  { name: 'APP_ORIGIN', required: true, category: 'api', production: true },
  { name: 'NEXT_PUBLIC_APP_URL', required: true, category: 'api', production: true },
  { name: 'NEXT_PUBLIC_API_URL', required: false, category: 'api' },
  { name: 'NEXT_PUBLIC_WEBSOCKET_URL', required: false, category: 'api' },

  // Database (Server-side)
  { name: 'DATABASE_URL', required: true, category: 'api', production: true },

  // Security & Rate Limiting
  { name: 'UPSTASH_REDIS_REST_URL', required: false, category: 'security', production: true },
  { name: 'UPSTASH_REDIS_REST_TOKEN', required: false, category: 'security', production: true },
  { name: 'JWT_SECRET', required: true, category: 'security', production: true },

  // Monitoring & Error Tracking
  { name: 'NEXT_PUBLIC_SENTRY_DSN', required: false, category: 'monitoring' },
  { name: 'SENTRY_AUTH_TOKEN', required: false, category: 'monitoring' },
  { name: 'NEXT_PUBLIC_GA_MEASUREMENT_ID', required: false, category: 'monitoring' },

  // Avatar Storage (S3-Compatible) - Optional but disables avatar uploads if missing
  { name: 'S3_BUCKET', required: false, category: 'feature' },
  { name: 'S3_ACCESS_KEY_ID', required: false, category: 'feature' },
  { name: 'S3_SECRET_ACCESS_KEY', required: false, category: 'feature' },
  { name: 'S3_REGION', required: false, category: 'feature' },
  { name: 'S3_PUBLIC_BASE_URL', required: false, category: 'feature' },

  // Email Service (SendGrid) - Optional but disables email 2FA if missing
  { name: 'SENDGRID_API_KEY', required: false, category: 'feature' },
  { name: 'SENDGRID_FROM_EMAIL', required: false, category: 'feature' },

  // SMS Service (Twilio) - Optional but disables SMS 2FA if missing
  { name: 'TWILIO_ACCOUNT_SID', required: false, category: 'feature' },
  { name: 'TWILIO_AUTH_TOKEN', required: false, category: 'feature' },
  { name: 'TWILIO_FROM_NUMBER', required: false, category: 'feature' },

  // Feature Flags
  { name: 'NEXT_PUBLIC_ENABLE_ANALYTICS', required: false, category: 'feature' },
  { name: 'NEXT_PUBLIC_ENABLE_CHAT', required: false, category: 'feature' },
  { name: 'NEXT_PUBLIC_ENABLE_GOVERNANCE', required: false, category: 'feature' },
  { name: 'NEXT_PUBLIC_ENABLE_SW', required: false, category: 'feature' },
  { name: 'NEXT_PUBLIC_ENABLE_PERSISTENT_SESSION_KEYS', required: false, category: 'feature' },
  { name: 'SESSION_KEY_MAX_DURATION_SECONDS', required: false, category: 'feature' },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  info: string[];
}

function getEnvValue(name: string): string | undefined {
  const value = process.env[name];
  if (value && value.trim() !== '') return value;

  const fileBacked = process.env[`${name}_FILE`];
  if (fileBacked && fileBacked.trim() !== '') {
    return `[from ${name}_FILE]`;
  }

  const normalizeOrigin = (hostOrUrl: string | undefined): string | undefined => {
    if (!hostOrUrl || hostOrUrl.trim() === '') return undefined;
    const trimmed = hostOrUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        return new URL(trimmed).origin;
      } catch {
        return undefined;
      }
    }
    return `https://${trimmed}`;
  };

  // Vercel can provide either hostnames or full URLs depending on the variable.
  // Prefer canonical production host when available.
  const inferredAppOrigin =
    normalizeOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    normalizeOrigin(process.env.VERCEL_BRANCH_URL) ||
    normalizeOrigin(process.env.VERCEL_URL);
  const isProduction = process.env.NODE_ENV === 'production';

  const fallbacks: Record<string, string | undefined> = {
    NEXT_PUBLIC_IS_TESTNET: isProduction ? undefined : 'true',
    NEXT_PUBLIC_CHAIN_ID: isProduction ? undefined : '84532',
    NEXT_PUBLIC_RPC_URL: isProduction ? undefined : 'https://sepolia.base.org',
    NEXT_PUBLIC_EXPLORER_URL: isProduction ? undefined : 'https://sepolia.basescan.org',
    APP_ORIGIN: inferredAppOrigin,
    NEXT_PUBLIC_APP_URL: inferredAppOrigin || (isProduction ? undefined : 'http://localhost:3000'),
  };

  return fallbacks[name];
}

export function validateProductionEnvironment(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    missing: [],
    info: [],
  };

  const isProduction = process.env.NODE_ENV === 'production';
  const frontendOnlyEnv = process.env.FRONTEND_SELF_CONTAINED ?? process.env.NEXT_PUBLIC_FRONTEND_ONLY;
  const missingServerSecrets = !process.env.DATABASE_URL || !process.env.JWT_SECRET;
  const autoFrontendOnly =
    frontendOnlyEnv !== 'false' &&
    missingServerSecrets;
  const frontendOnly = frontendOnlyEnv === 'true' || autoFrontendOnly;
  // NEXT_PUBLIC_IS_TESTNET defaults to "treat as testnet" (true) unless
  // explicitly set to "false". Mainnet deployments MUST set
  // NEXT_PUBLIC_IS_TESTNET=false in the deploy environment.
  const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET !== 'false';
  // strictProduction triggers the `production: true` env-var checks
  // (contract addresses etc). We skip these on testnet because addresses
  // aren't available until after `deploy-full.ts` runs locally and the
  // operator copies them back into Vercel. Once NEXT_PUBLIC_IS_TESTNET
  // is explicitly set to "false" (mainnet), strictProduction fires
  // and missing addresses fail the build.
  const strictProduction = isProduction && !frontendOnly && !isTestnet;

  if (frontendOnly) {
    result.info.push('✅ FRONTEND_SELF_CONTAINED mode enabled (server-only requirements relaxed)');
    if (autoFrontendOnly) {
      result.warnings.push('⚠️  Auto-enabled frontend-only mode for this environment (DATABASE_URL/JWT_SECRET not set)');
    }
  }

  // Check each required environment variable
  for (const config of REQUIRED_ENV_VARS) {
    const value = getEnvValue(config.name);
    const isEmpty = !value || value.trim() === '';

    // Check if required
    const serverOnlyVar =
      config.name === 'DATABASE_URL' ||
      config.name === 'JWT_SECRET' ||
      config.name === 'UPSTASH_REDIS_REST_URL' ||
      config.name === 'UPSTASH_REDIS_REST_TOKEN';
    const treatAsOptional = frontendOnly && serverOnlyVar;

    if (config.required && isEmpty && !treatAsOptional) {
      result.errors.push(`❌ ${config.name} is required but not set`);
      result.missing.push(config.name);
      result.valid = false;
    } else if (config.production && strictProduction && isEmpty && !treatAsOptional) {
      result.errors.push(`❌ ${config.name} is required for production but not set`);
      result.missing.push(config.name);
      result.valid = false;
    } else if (treatAsOptional && isEmpty) {
      result.warnings.push(`⚠️  ${config.name} is not set (frontend-only mode)`);
    } else if (!config.required && isEmpty) {
      if (config.production) {
        result.warnings.push(`⚠️  ${config.name} is not set (required in production; optional for ${config.category} in local/dev)`);
      } else {
        result.warnings.push(`⚠️  ${config.name} is not set (optional for ${config.category})`);
      }
    } else if (value) {
      if (!process.env[config.name] && config.name.startsWith('NEXT_PUBLIC_')) {
        result.info.push(`✅ ${config.name} using inferred default`);
      } else {
        result.info.push(`✅ ${config.name} is configured`);
      }
    }
  }

  // Additional validations
  if (strictProduction) {
    const runtimeChainRaw = getEnvValue('NEXT_PUBLIC_CHAIN_ID') || '';
    const deploymentChainRaw = getEnvValue('NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID') || '';

    if (runtimeChainRaw && !/^\d+$/.test(runtimeChainRaw)) {
      result.errors.push(`❌ NEXT_PUBLIC_CHAIN_ID must be a positive integer, got "${runtimeChainRaw}"`);
      result.valid = false;
    }

    if (deploymentChainRaw && !/^\d+$/.test(deploymentChainRaw)) {
      result.errors.push(`❌ NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID must be a positive integer, got "${deploymentChainRaw}"`);
      result.valid = false;
    }

    const runtimeChainId = Number.parseInt(runtimeChainRaw, 10);
    const deploymentChainId = Number.parseInt(deploymentChainRaw, 10);
    if (Number.isInteger(runtimeChainId) && Number.isInteger(deploymentChainId) && runtimeChainId !== deploymentChainId) {
      result.errors.push(
        `❌ NEXT_PUBLIC_CHAIN_ID (${runtimeChainId}) does not match NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID (${deploymentChainId})`
      );
      result.valid = false;
    }

    const vaultImplementation = (process.env.NEXT_PUBLIC_VAULT_IMPLEMENTATION || 'cardbound').toLowerCase();
    if (vaultImplementation !== 'cardbound' && vaultImplementation !== 'uservault') {
      result.errors.push('❌ NEXT_PUBLIC_VAULT_IMPLEMENTATION must be either "cardbound" or "uservault"');
      result.valid = false;
    }

    if (vaultImplementation === 'cardbound' && !getEnvValue('NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS')) {
      result.errors.push('❌ NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS is required when NEXT_PUBLIC_VAULT_IMPLEMENTATION=cardbound in production');
      result.valid = false;
    }

    if (getEnvValue('NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS') && !getEnvValue('NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS')) {
      result.warnings.push('⚠️  NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS is not set; extracted EcosystemVault read-only hooks will fail unless the view contract is deployed and configured');
    }

    if (vaultImplementation === 'uservault' && !getEnvValue('NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS')) {
      result.warnings.push('⚠️  NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS is not set for uservault mode; recovery claim flows may be unavailable');
    }

    // Production-specific checks
    if (isTestnet) {
      result.warnings.push('⚠️  NEXT_PUBLIC_IS_TESTNET is true in production mode');
    }

    if (!isTestnet && process.env.FAUCET_OPERATOR_PRIVATE_KEY && process.env.FAUCET_OPERATOR_PRIVATE_KEY.trim() !== '') {
      result.errors.push('❌ FAUCET_OPERATOR_PRIVATE_KEY must not be set when NEXT_PUBLIC_IS_TESTNET=false in production');
      result.valid = false;
    }

    // Check URL formats
    const appUrl = getEnvValue('NEXT_PUBLIC_APP_URL');
    const appOrigin = getEnvValue('APP_ORIGIN');
    if (appUrl && !appUrl.startsWith('https://')) {
      result.errors.push('❌ NEXT_PUBLIC_APP_URL must use HTTPS in production');
      result.valid = false;
    }

    if (appOrigin && !appOrigin.startsWith('https://')) {
      result.errors.push('❌ APP_ORIGIN must use HTTPS in production');
      result.valid = false;
    }

    // Check for development values
    if (appUrl && appUrl.includes('localhost')) {
      result.errors.push('❌ NEXT_PUBLIC_APP_URL cannot be localhost in production');
      result.valid = false;
    }

    if (appOrigin && appOrigin.includes('localhost')) {
      result.errors.push('❌ APP_ORIGIN cannot be localhost in production');
      result.valid = false;
    }

    if (appUrl && appOrigin) {
      try {
        const appUrlOrigin = new URL(appUrl).origin;
        if (appUrlOrigin !== appOrigin) {
          result.errors.push(`❌ APP_ORIGIN (${appOrigin}) does not match NEXT_PUBLIC_APP_URL origin (${appUrlOrigin})`);
          result.valid = false;
        }
      } catch {
        result.errors.push('❌ NEXT_PUBLIC_APP_URL must be a valid absolute URL in production');
        result.valid = false;
      }
    }

    // Verify Sentry is configured for production error tracking
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      result.warnings.push('⚠️  Sentry is not configured - error tracking disabled');
    }

    // Redis presence is enforced above via required production variables.
  }

  // Check for partial service configurations (misconfiguration detection)
  const s3Vars = ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'S3_REGION'];
  const s3Configured = s3Vars.filter(v => process.env[v]);
  if (s3Configured.length > 0 && s3Configured.length < s3Vars.length) {
    result.errors.push(`❌ Partial S3 configuration detected. Required: ${s3Vars.join(', ')}`);
    result.errors.push(`   Missing: ${s3Vars.filter(v => !process.env[v]).join(', ')}`);
    result.valid = false;
  } else if (s3Configured.length === 0) {
    result.warnings.push('⚠️  S3 storage not configured - avatar uploads will be disabled');
  }

  const sendgridVars = ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'];
  const sendgridConfigured = sendgridVars.filter(v => process.env[v]);
  if (sendgridConfigured.length > 0 && sendgridConfigured.length < sendgridVars.length) {
    result.errors.push(`❌ Partial SendGrid configuration. Required: ${sendgridVars.join(', ')}`);
    result.errors.push(`   Missing: ${sendgridVars.filter(v => !process.env[v]).join(', ')}`);
    result.valid = false;
  } else if (sendgridConfigured.length === 0) {
    result.warnings.push('⚠️  SendGrid not configured - email 2FA will be disabled');
  }

  const twilioVars = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'];
  const twilioConfigured = twilioVars.filter(v => process.env[v]);
  if (twilioConfigured.length > 0 && twilioConfigured.length < twilioVars.length) {
    result.errors.push(`❌ Partial Twilio configuration. Required: ${twilioVars.join(', ')}`);
    result.errors.push(`   Missing: ${twilioVars.filter(v => !process.env[v]).join(', ')}`);
    result.valid = false;
  } else if (twilioConfigured.length === 0) {
    result.warnings.push('⚠️  Twilio not configured - SMS 2FA will be disabled');
  }

  const redisVars = ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
  const redisConfigured = redisVars.filter(v => process.env[v]);
  if (redisConfigured.length > 0 && redisConfigured.length < redisVars.length) {
    result.errors.push(`❌ Partial Redis configuration. Required: ${redisVars.join(', ')}`);
    result.errors.push(`   Missing: ${redisVars.filter(v => !process.env[v]).join(', ')}`);
    // In frontend-only mode, Redis is non-blocking.
    if (frontendOnly) {
      result.warnings.push('⚠️  Partial Redis configuration ignored in frontend-only mode');
    } else {
      result.valid = false;
    }
  } else if (redisConfigured.length === 0) {
    // On mainnet (strictProduction = isProduction && !frontendOnly && !isTestnet),
    // Redis must be configured — distributed rate limiting and JWT revocation
    // need it. On testnet we accept degraded-mode in-memory rate limiting so
    // operators don't have to provision Redis just for a preview deploy.
    if (strictProduction) {
      result.errors.push('❌ Redis is required in production - distributed rate limiting and token revocation cannot run safely without it');
      result.valid = false;
    } else {
      result.warnings.push('⚠️  Redis is not configured - rate limiting will run in degraded mode');
    }
  }

  return result;
}

export function printValidationResults(result: ValidationResult): void {
  console.log('\n🔍 Production Environment Validation\n');
  console.log('='.repeat(50));

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS (Must Fix):');
    result.errors.forEach(err => console.log(`  ${err}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Recommended):');
    printGroupedWarnings(result.warnings);
  }

  if (result.info.length > 0 && process.env.VERBOSE) {
    console.log('\n✅ CONFIGURED:');
    result.info.forEach(info => console.log(`  ${info}`));
  }

  console.log('\n' + '='.repeat(50));
  console.log(result.valid ? '✅ Environment validation passed' : '❌ Environment validation failed');
  console.log('='.repeat(50) + '\n');

  if (!result.valid) {
    console.log('Missing required variables:');
    result.missing.forEach(name => console.log(`  - ${name}`));
    console.log('');
  }
}

/**
 * Group warnings into logical buckets so the output is scannable rather than
 * a 38-line wall of individual var names. Pattern-matches on the suffix tags
 * each warning string already carries (see the validator's push-sites).
 */
function printGroupedWarnings(warnings: string[]): void {
  // Strip the leading "⚠️  " from each warning for easier matching.
  const stripped = warnings.map(w => w.replace(/^⚠️\s+/, ''));

  const prodRequired: string[] = [];      // "required in production; optional for X in local/dev"
  const optionalByCategory: Record<string, string[]> = {}; // "optional for <cat>"
  const frontendOnly: string[] = [];      // "frontend-only mode"
  const degraded: string[] = [];          // "will be disabled" / "degraded mode"
  const other: string[] = [];

  for (const w of stripped) {
    const prodMatch = w.match(/^(\S+) is not set \(required in production/);
    if (prodMatch) {
      prodRequired.push(prodMatch[1] ?? w);
      continue;
    }
    const optMatch = w.match(/^(\S+) is not set \(optional for (\w+)\)/);
    if (optMatch) {
      const cat = optMatch[2] ?? 'other';
      (optionalByCategory[cat] ||= []).push(optMatch[1] ?? w);
      continue;
    }
    const feMatch = w.match(/^(\S+) is not set \(frontend-only mode\)/);
    if (feMatch) {
      frontendOnly.push(feMatch[1] ?? w);
      continue;
    }
    if (/will be disabled|degraded mode|frontend-only mode for this environment/i.test(w)) {
      degraded.push(w);
      continue;
    }
    other.push(w);
  }

  // Production-required (highest priority — these become ERRORS in a true mainnet build)
  if (prodRequired.length > 0) {
    console.log(`\n  ── Production-required, currently unset (${prodRequired.length}) ──`);
    console.log('     (These become build errors when NEXT_PUBLIC_IS_TESTNET=false + DATABASE_URL set.)');
    prodRequired.forEach(n => console.log(`     • ${n}`));
  }

  // Optional contract/feature/api/monitoring addresses
  const categoryOrder = ['blockchain', 'api', 'monitoring', 'feature', 'security'];
  for (const cat of categoryOrder) {
    const items = optionalByCategory[cat];
    if (!items?.length) continue;
    console.log(`\n  ── Optional (${cat}), unset (${items.length}) ──`);
    items.forEach(n => console.log(`     • ${n}`));
  }
  // Any uncategorized optional groups (defensive)
  for (const [cat, items] of Object.entries(optionalByCategory)) {
    if (categoryOrder.includes(cat) || !items.length) continue;
    console.log(`\n  ── Optional (${cat}), unset (${items.length}) ──`);
    items.forEach(n => console.log(`     • ${n}`));
  }

  // Frontend-only mode auto-skipped vars
  if (frontendOnly.length > 0) {
    console.log(`\n  ── Skipped in frontend-only mode (${frontendOnly.length}) ──`);
    console.log('     (Server-only vars correctly omitted; not an issue.)');
    frontendOnly.forEach(n => console.log(`     • ${n}`));
  }

  // Degraded-feature notes (one per line; they're already human-readable)
  if (degraded.length > 0) {
    console.log(`\n  ── Mode/feature notes (${degraded.length}) ──`);
    degraded.forEach(d => console.log(`     • ${d}`));
  }

  // Anything else — fall through to per-line display
  if (other.length > 0) {
    console.log(`\n  ── Other (${other.length}) ──`);
    other.forEach(o => console.log(`     • ${o}`));
  }
}

// Run validation if executed directly
// ESM equivalent of: if (require.main === module)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const result = validateProductionEnvironment();
  printValidationResults(result);

  // In CI/Vercel environments, still fail if validation fails
  const isCI = process.env.CI === 'true' || process.env.VERCEL === '1';
  const frontendOnly = process.env.FRONTEND_SELF_CONTAINED === 'true' || process.env.NEXT_PUBLIC_FRONTEND_ONLY === 'true';

  if (isCI && !result.valid) {
    if (frontendOnly) {
      console.log('⚠️  Running in CI/Deployment with frontend-only mode enabled');
      console.log('⚠️  Backend-only integrations may be disabled by missing variables');
      process.exit(0);
    }

    console.log('❌ Running in CI/Deployment environment - validation errors must be fixed');
    console.log('❌ Configure all required environment variables in your deployment platform');
    process.exit(1); // Fail the build to prevent deployment with missing config
  }

  if (!isCI && !result.valid) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && !frontendOnly) {
      console.log('❌ Production environment detected with validation errors — refusing to start');
      console.log('❌ Configure all required environment variables before deploying');
      process.exit(1);
    }
    console.log('⚠️  Local environment has missing/partial config; continuing outside CI/deployment');
    process.exit(0);
  }

  process.exit(0);
}
