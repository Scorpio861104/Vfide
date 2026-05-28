import process from 'node:process';

const ADDRESS_VARS = [
  // Frontend NEXT_PUBLIC_* — read by the user-facing app at runtime.
  // Every entry that has `production: true` in lib/validateProduction.ts MUST
  // also be listed here, otherwise we have two divergent definitions of "ready".
  'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS',
  // StablecoinRegistry is DEFERRED for V1 mainnet (see contracts/PRODUCTION_SET.md
  // 2026-05-16 entry: "V1 is VFIDE-only by architectural decision"). Validator
  // therefore must NOT require it; the API routes already gracefully degrade
  // when CONTRACT_ADDRESSES.StablecoinRegistry is unconfigured.
  // 'NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS',
  'NEXT_PUBLIC_VAULT_HUB_ADDRESS',
  'NEXT_PUBLIC_DAO_ADDRESS',
  'NEXT_PUBLIC_DAO_TIMELOCK_ADDRESS',
  'NEXT_PUBLIC_SEER_ADDRESS',
  'NEXT_PUBLIC_VFIDE_COMMERCE_ADDRESS',
  'NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS',
  'NEXT_PUBLIC_MERCHANT_REGISTRY_ADDRESS',
  'NEXT_PUBLIC_COMMERCE_ESCROW_ADDRESS',
  'NEXT_PUBLIC_BURN_ROUTER_ADDRESS',
  'NEXT_PUBLIC_PROOF_LEDGER_ADDRESS',
  'NEXT_PUBLIC_OWNER_CONTROL_PANEL_ADDRESS',
  'NEXT_PUBLIC_PAYROLL_MANAGER_ADDRESS',
  'NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS',
  'NEXT_PUBLIC_FRAUD_REGISTRY_ADDRESS',
  'NEXT_PUBLIC_GOVERNANCE_HOOKS_ADDRESS',
  'NEXT_PUBLIC_FLASH_LOAN_ADDRESS',
  'NEXT_PUBLIC_TERM_LOAN_ADDRESS',
  'NEXT_PUBLIC_LIQUIDITY_INCENTIVES_ADDRESS',
  'NEXT_PUBLIC_VAULT_RECOVERY_CLAIM_ADDRESS',
  'NEXT_PUBLIC_VAULT_REGISTRY_ADDRESS',
  'NEXT_PUBLIC_SANCTUM_VAULT_ADDRESS',
  'NEXT_PUBLIC_DEV_VAULT_ADDRESS',
  'NEXT_PUBLIC_ECOSYSTEM_VAULT_ADDRESS',
  'NEXT_PUBLIC_ECOSYSTEM_VAULT_VIEW_ADDRESS',
  'NEXT_PUBLIC_ECO_TREASURY_VAULT_ADDRESS',
  'NEXT_PUBLIC_CARD_BOUND_VAULT_DEPLOYER_ADDRESS',
  // Satellite/viewer contracts — optional on testnet, required in production
  'NEXT_PUBLIC_MERCHANT_PORTAL_VIEWER_ADDRESS',
  'NEXT_PUBLIC_VFIDE_ACCESS_CONTROL_ADDRESS',
  // Server-side bootstrap addresses (multisigs / sinks). These are checked
  // independently from the public ones because the deploy script binds them
  // to constructor args before any NEXT_PUBLIC_* is even known.
  'DAO_ADDRESS',
  'TREASURY_ADDRESS',
  'BENEFICIARY_ADDRESS',
  'TREASURY_SINK_ADDRESS',
  'SANCTUM_SINK_ADDRESS',
  'ECOSYSTEM_SINK_ADDRESS',
  'BURN_SINK_ADDRESS',
  'DAO_PAYROLL_SINK_ADDRESS',
  'MERCHANT_POOL_SINK_ADDRESS',
  'HEADHUNTER_POOL_SINK_ADDRESS',
  'FEE_SINK_ADDRESS',
] as const;

const REQUIRED_STRINGS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_WEBSOCKET_URL',
  'BASE_MAINNET_RPC_URL',
] as const;

const OPTIONAL_STRINGS = [
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_AUTH_TOKEN',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
] as const;

const ZERO_ADDRESS = /^0x0{40}$/i;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const NON_MAINNET_HINT = /(sepolia|testnet|localhost|127\.0\.0\.1)/i;

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function warn(message: string) {
  console.warn(`⚠️  ${message}`);
}

function checkRequiredString(name: string) {
  const value = process.env[name]?.trim();
  if (!value) fail(`Missing required env var: ${name}`);
  if (name.includes('RPC_URL') || name.includes('APP_URL') || name.includes('API_URL') || name.includes('WEBSOCKET_URL')) {
    if (NON_MAINNET_HINT.test(value)) {
      fail(`${name} still points to a non-mainnet/local endpoint: ${value}`);
    }
  }
}

function checkAddress(name: string) {
  const value = process.env[name]?.trim();
  if (!value) fail(`Missing required address env var: ${name}`);
  if (!ADDRESS_RE.test(value)) fail(`${name} is not a valid EVM address: ${value}`);
  if (ZERO_ADDRESS.test(value)) fail(`${name} must not be the zero address`);
}

function main() {
  console.log('🔍 Validating VFIDE mainnet environment...');

  for (const name of REQUIRED_STRINGS) {
    checkRequiredString(name);
  }

  for (const name of ADDRESS_VARS) {
    checkAddress(name);
  }

  for (const name of OPTIONAL_STRINGS) {
    if (!process.env[name]?.trim()) {
      warn(`${name} is not set`);
    }
  }

  const chainId = process.env.NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID?.trim();
  if (!chainId) {
    fail('NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID is required');
  }

  const allowedChainIds = new Set(['8453', '137', '324']);
  if (!allowedChainIds.has(chainId)) {
    fail(`Unexpected NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID for mainnet deploy: ${chainId}`);
  }

  // T-CHAIN-3-VARS FIX: cross-validate the three chain ID env vars used across the
  // codebase. NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID alone is not enough — the API and
  // frontend read NEXT_PUBLIC_CHAIN_ID and NEXT_PUBLIC_DEFAULT_CHAIN_ID
  // independently. A mismatch causes silent testnet-vs-mainnet divergence
  // between auth challenges, fee computation, and frontend signing.
  const apiChainId = process.env.NEXT_PUBLIC_CHAIN_ID?.trim();
  const frontendChainId = process.env.NEXT_PUBLIC_DEFAULT_CHAIN_ID?.trim();

  if (!apiChainId) {
    fail('NEXT_PUBLIC_CHAIN_ID is required (used by /api/auth/challenge, /api/crypto/fees, /api/crypto/price)');
  }
  if (!frontendChainId) {
    fail('NEXT_PUBLIC_DEFAULT_CHAIN_ID is required (used by lib/testnet.ts and frontend chain default)');
  }
  if (apiChainId !== chainId) {
    fail(`Chain ID mismatch: NEXT_PUBLIC_CHAIN_ID=${apiChainId} but NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID=${chainId}. All three chain ID env vars must match.`);
  }
  if (frontendChainId !== chainId) {
    fail(`Chain ID mismatch: NEXT_PUBLIC_DEFAULT_CHAIN_ID=${frontendChainId} but NEXT_PUBLIC_DEPLOYMENT_CHAIN_ID=${chainId}. All three chain ID env vars must match.`);
  }

  console.log('✅ Mainnet environment validation passed.');
}

main();
