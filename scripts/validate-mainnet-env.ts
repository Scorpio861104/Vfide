import process from 'node:process';

const ADDRESS_VARS = [
  'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS',
  'NEXT_PUBLIC_STABLECOIN_REGISTRY_ADDRESS',
  'NEXT_PUBLIC_VAULT_HUB_ADDRESS',
  'NEXT_PUBLIC_DAO_ADDRESS',
  'NEXT_PUBLIC_SEER_ADDRESS',
  'NEXT_PUBLIC_MERCHANT_PORTAL_ADDRESS',
  'NEXT_PUBLIC_BURN_ROUTER_ADDRESS',
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

  console.log('✅ Mainnet environment validation passed.');
}

main();
