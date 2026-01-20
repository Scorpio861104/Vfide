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

const PRODUCTION_ONLY_CHECKS = {
  // In production, JWT_SECRET must not be the default value
  JWT_SECRET_NOT_DEFAULT: process.env.NODE_ENV === 'production',
} as const;

/**
 * Validate environment variables on startup
 * Throws error if critical configuration is missing
 */
export function validateEnvironment(): void {
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
    
    if (process.env.NODE_ENV === 'production') {
      // In production, crash the app
      throw new Error(
        'Environment validation failed. Please check your environment variables. ' +
        'See console output for details.'
      );
    } else {
      // In development, just warn
      console.warn('⚠️  The application will continue in development mode, but these issues should be fixed.');
    }
  } else {
    console.log('✅ Environment validation passed');
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
