/**
 * Startup validation for critical environment variables
 * This ensures the application fails fast if required configuration is missing
 */

const REQUIRED_ENV_VARS = {
  // JWT Secret - critical for authentication security
  JWT_SECRET: process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET,
  // Database connection
  DATABASE_URL: process.env.DATABASE_URL,
} as const;

/**
 * Validate environment variables on startup
 * Throws error if critical configuration is missing
 */
export function validateEnvironment(): void {
  // Skip validation during build phase
  // During build, pages are statically generated and env vars will be set in production
  if (typeof window === 'undefined' && process.env.NEXT_PHASE === 'phase-production-build') {
    console.log('⏭️  Skipping environment validation during build phase');
    return;
  }

  const errors: string[] = [];

  // Check required environment variables
  Object.entries(REQUIRED_ENV_VARS).forEach(([name, value]) => {
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${name}`);
    }
  });

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
    const defaultSecrets = [
      'vfide-dev-secret-change-in-production',
      'your-secret-here',
      'change-me',
      'secret',
      'default',
    ];

    if (jwtSecret && defaultSecrets.some(def => jwtSecret.toLowerCase().includes(def))) {
      errors.push(
        'CRITICAL: JWT_SECRET is using a default value in production! ' +
        'This is a security risk. Please set a secure random secret.'
      );
    }

    if (jwtSecret && jwtSecret.length < 32) {
      errors.push(
        'WARNING: JWT_SECRET should be at least 32 characters long for security'
      );
    }
  }

  // If there are errors, fail fast
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    
    // Only crash in production runtime, not during build
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
      // In production runtime, crash the app
      throw new Error(
        'Environment validation failed. Please check your environment variables. ' +
        'See console output for details.'
      );
    } else {
      // In development or build phase, just warn
      console.warn('⚠️  The application will continue, but these issues should be fixed for production.');
    }
  } else {
    console.log('✅ Environment validation passed');
  }

  // Warn when Redis is absent in production — rate limiting and token revocation
  // fall back to in-memory stores, which are NOT shared across multiple instances.
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) {
      console.warn(
        '⚠️  UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. ' +
        'Rate limiting and JWT token revocation are using in-memory stores. ' +
        'This is unsafe in multi-instance (horizontally-scaled) deployments because ' +
        'each instance maintains its own independent state. ' +
        'Set both variables to use the shared Redis backend.'
      );
    }
  }
}

/**
 * Get validated environment variable
 * Throws if variable is not set
 */
export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
export function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}
