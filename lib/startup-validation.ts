import { logger } from '@/lib/logger';
import { readFileSync } from 'node:fs';
/**
 * Startup validation for critical environment variables
 * This ensures the application fails fast if required configuration is missing
 */

function readEnvOrFile(name: string): string | undefined {
  const direct = process.env[name];
  if (direct && direct.trim() !== '') {
    return direct;
  }

  const filePath = process.env[`${name}_FILE`];
  if (!filePath || filePath.trim() === '') {
    return undefined;
  }

  try {
    const fromFile = readFileSync(filePath, 'utf8').trim();
    return fromFile || undefined;
  } catch (error) {
    logger.error(`Failed reading ${name}_FILE (${filePath}):`, error);
    return undefined;
  }
}

const REQUIRED_ENV_VARS = {
  // JWT Secret - critical for authentication security
  JWT_SECRET: readEnvOrFile('JWT_SECRET') || readEnvOrFile('NEXTAUTH_SECRET'),
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
    logger.info('⏭️  Skipping environment validation during build phase');
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
    const jwtSecret = readEnvOrFile('JWT_SECRET') || readEnvOrFile('NEXTAUTH_SECRET');
    const defaultSecrets = [
      'vfide-dev-secret-change-in-production',
      'your-secret-here',
      'change-me',
      'secret',
      'default',
      'test',
      'password',
      'admin',
      '12345678',
      'placeholder',
      'example',
      'dev',
      'local',
      'development',
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

    // Redis is mandatory in production for distributed security controls.
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!redisUrl || !redisToken) {
      errors.push(
        'CRITICAL: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production. ' +
        'In-memory fallbacks are unsafe for multi-instance deployments.'
      );
    }

    const ipHashSalt = process.env.LOG_IP_HASH_SALT?.trim() || '';
    if (!ipHashSalt) {
      errors.push(
        'CRITICAL: LOG_IP_HASH_SALT is required in production to prevent predictable IP hashes in logs.'
      );
    } else if (ipHashSalt.length < 16) {
      errors.push('WARNING: LOG_IP_HASH_SALT should be at least 16 characters long for security');
    }

    // Validate PREV_JWT_SECRET during rotation window — must not equal JWT_SECRET
    const prevSecret = readEnvOrFile('PREV_JWT_SECRET');
    if (prevSecret) {
      if (prevSecret === jwtSecret) {
        errors.push(
          'CRITICAL: PREV_JWT_SECRET must not equal JWT_SECRET. ' +
          'Set PREV_JWT_SECRET to the OLD secret value and JWT_SECRET to the NEW secret.'
        );
      } else if (prevSecret.length < 32) {
        errors.push('WARNING: PREV_JWT_SECRET should be at least 32 characters long for security');
      } else {
        // Rotation window is active — warn so ops team remembers to remove it after 24 h
        logger.warn(
          '⚠️  PREV_JWT_SECRET is set: JWT rotation window is active. ' +
          'Old tokens will be accepted until they expire (max 24 h). ' +
          'Remove PREV_JWT_SECRET after 24 h to complete the rotation.'
        );
      }
    }
  }

  // If there are errors, fail fast
  if (errors.length > 0) {
    logger.error('❌ Environment validation failed:');
    errors.forEach(error => logger.error(`  - ${error}`));
    
    // Only crash in production runtime, not during build
    if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
      // In production runtime, crash the app
      throw new Error(
        'Environment validation failed. Please check your environment variables. ' +
        'See console output for details.'
      );
    } else {
      // In development or build phase, just warn
      logger.warn('⚠️  The application will continue, but these issues should be fixed for production.');
    }
  } else {
    logger.info('✅ Environment validation passed');
  }

}

/**
 * Get validated environment variable
 * Throws if variable is not set
 */
export function getRequiredEnv(name: string): string {
  const value = readEnvOrFile(name) || process.env[name];
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
