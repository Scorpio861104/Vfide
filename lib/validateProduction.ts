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

  const legacyExplorer = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL;
  const inferredAppUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;

  const fallbacks: Record<string, string | undefined> = {
    NEXT_PUBLIC_IS_TESTNET: 'true',
    NEXT_PUBLIC_CHAIN_ID: '84532',
    NEXT_PUBLIC_RPC_URL: 'https://sepolia.base.org',
    NEXT_PUBLIC_EXPLORER_URL: legacyExplorer || 'https://sepolia.basescan.org',
    NEXT_PUBLIC_APP_URL: inferredAppUrl || 'http://localhost:3000',
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
  const isCI = process.env.CI === 'true' || process.env.VERCEL === '1';
  const frontendOnly = process.env.FRONTEND_SELF_CONTAINED === 'true' || process.env.NEXT_PUBLIC_FRONTEND_ONLY === 'true';
  const strictProduction = isProduction && isCI && !frontendOnly;
  const isTestnet = process.env.NEXT_PUBLIC_IS_TESTNET !== 'false';

  if (frontendOnly) {
    result.info.push('✅ FRONTEND_SELF_CONTAINED mode enabled (server-only requirements relaxed)');
  }

  // Check each required environment variable
  for (const config of REQUIRED_ENV_VARS) {
    const value = getEnvValue(config.name);
    const isEmpty = !value || value.trim() === '';

    if (config.name === 'NEXT_PUBLIC_EXPLORER_URL' && !process.env.NEXT_PUBLIC_EXPLORER_URL && process.env.NEXT_PUBLIC_BLOCK_EXPLORER_URL) {
      result.warnings.push('⚠️  NEXT_PUBLIC_BLOCK_EXPLORER_URL is set; migrate to NEXT_PUBLIC_EXPLORER_URL');
      result.info.push('✅ NEXT_PUBLIC_EXPLORER_URL satisfied by legacy NEXT_PUBLIC_BLOCK_EXPLORER_URL');
    }

    // Check if required
    const serverOnlyVar = config.name === 'DATABASE_URL' || config.name === 'JWT_SECRET';
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
      result.warnings.push(`⚠️  ${config.name} is not set (optional for ${config.category})`);
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
    // Production-specific checks
    if (isTestnet) {
      result.warnings.push('⚠️  NEXT_PUBLIC_IS_TESTNET is true in production mode');
    }

    // Check URL formats
    const appUrl = getEnvValue('NEXT_PUBLIC_APP_URL');
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
    console.log('⚠️  Local environment has missing/partial config; continuing outside CI/deployment');
    process.exit(0);
  }

  process.exit(0);
}
