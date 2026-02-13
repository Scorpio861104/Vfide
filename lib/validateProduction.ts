/**
 * Production Environment Validation
 * 
 * Validates that all required environment variables are set for production deployment.
 * Run this before deploying to production to catch configuration issues early.
 */

interface EnvironmentConfig {
  name: string;
  required: boolean;
  category: 'blockchain' | 'api' | 'security' | 'monitoring' | 'feature';
  production?: boolean; // Only required in production
}

const REQUIRED_ENV_VARS: EnvironmentConfig[] = [
  // Blockchain Configuration
  { name: 'NEXT_PUBLIC_CHAIN_ID', required: true, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_RPC_URL', required: true, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_EXPLORER_URL', required: true, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_IS_TESTNET', required: true, category: 'blockchain' },
  
  // WalletConnect (optional but recommended)
  { name: 'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID', required: false, category: 'blockchain' },
  { name: 'NEXT_PUBLIC_WAGMI_PROJECT_ID', required: false, category: 'blockchain' },
  
  // Application URLs
  { name: 'NEXT_PUBLIC_APP_URL', required: true, category: 'api', production: true },
  { name: 'NEXT_PUBLIC_API_URL', required: false, category: 'api' },
  { name: 'NEXT_PUBLIC_WEBSOCKET_URL', required: false, category: 'api' },
  
  // Database (Server-side)
  { name: 'DATABASE_URL', required: true, category: 'api', production: true },
  
  // Security & Rate Limiting
  { name: 'UPSTASH_REDIS_REST_URL', required: false, category: 'security' },
  { name: 'UPSTASH_REDIS_REST_TOKEN', required: false, category: 'security' },
  { name: 'JWT_SECRET', required: true, category: 'security', production: true },
  
  // Monitoring & Error Tracking
  { name: 'NEXT_PUBLIC_SENTRY_DSN', required: false, category: 'monitoring' },
  { name: 'SENTRY_AUTH_TOKEN', required: false, category: 'monitoring', production: true },
  { name: 'NEXT_PUBLIC_GA_MEASUREMENT_ID', required: false, category: 'monitoring' },
  
  // Feature Flags
  { name: 'NEXT_PUBLIC_ENABLE_ANALYTICS', required: false, category: 'feature' },
  { name: 'NEXT_PUBLIC_ENABLE_CHAT', required: false, category: 'feature' },
  { name: 'NEXT_PUBLIC_ENABLE_GOVERNANCE', required: false, category: 'feature' },
];

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missing: string[];
  info: string[];
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
  const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET !== 'false';

  // Check each required environment variable
  const legacyExplorer = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL;

  for (const config of REQUIRED_ENV_VARS) {
    const value = process.env[config.name];
    const isEmpty = !value || value.trim() === '';

    if (config.name === 'NEXT_PUBLIC_EXPLORER_URL' && isEmpty && legacyExplorer) {
      result.warnings.push('⚠️  NEXT_PUBLIC_BLOCK_EXPLORER_URL is set; migrate to NEXT_PUBLIC_EXPLORER_URL');
      result.info.push('✅ NEXT_PUBLIC_EXPLORER_URL satisfied by legacy NEXT_PUBLIC_BLOCK_EXPLORER_URL');
      continue;
    }

    // Check if required
    if (config.required && isEmpty) {
      result.errors.push(`❌ ${config.name} is required but not set`);
      result.missing.push(config.name);
      result.valid = false;
    } else if (config.production && isProduction && isEmpty) {
      result.errors.push(`❌ ${config.name} is required for production but not set`);
      result.missing.push(config.name);
      result.valid = false;
    } else if (!config.required && isEmpty) {
      result.warnings.push(`⚠️  ${config.name} is not set (optional for ${config.category})`);
    } else if (value) {
      result.info.push(`✅ ${config.name} is configured`);
    }
  }

  // Additional validations
  if (isProduction) {
    // Production-specific checks
    if (isTestnet) {
      result.warnings.push('⚠️  NEXT_PUBLIC_IS_TESTNET is true in production mode');
    }

    // Check URL formats
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.startsWith('https://')) {
      result.errors.push('❌ NEXT_PUBLIC_APP_URL must use HTTPS in production');
      result.valid = false;
    }

    // Check for development values
    if (appUrl && appUrl.includes('localhost')) {
      result.errors.push('❌ NEXT_PUBLIC_APP_URL cannot be localhost in production');
      result.valid = false;
    }

    // Verify Sentry is configured for production error tracking
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) {
      result.warnings.push('⚠️  Sentry is not configured - error tracking disabled');
    }

    // Verify rate limiting is configured
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      result.warnings.push('⚠️  Redis/Upstash is not configured - rate limiting may not work properly');
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
    result.warnings.forEach(warn => console.log(`  ${warn}`));
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

// Run validation if executed directly
// ESM equivalent of: if (require.main === module)
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const result = validateProductionEnvironment();
  printValidationResults(result);

  // In CI/Vercel environments, still fail if validation fails
  const isCI = process.env.CI === 'true' || process.env.VERCEL === '1';

  if (isCI && !result.valid) {
    console.log('❌ Running in CI/Deployment environment - validation errors must be fixed');
    console.log('❌ Configure all required environment variables in your deployment platform');
    process.exit(1); // Fail the build to prevent deployment with missing config
  }

  process.exit(result.valid ? 0 : 1);
}
