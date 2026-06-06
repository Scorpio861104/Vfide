import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Health check endpoint for the frontend application
 * 
 * Used by:
 * - Docker health checks
 * - Load balancers
 * - Monitoring systems
 * - CI/CD pipelines
 * 
 * Returns basic application status and version information
 */
export async function GET(_request: NextRequest) {
  const envHealthy = checkEnvironmentVariables();
  const statusCode = envHealthy ? 200 : 503;
  const status = envHealthy ? 'ok' : 'degraded';

  // Ops-safety hardening: avoid exposing process internals in production.
  // Keep payload minimal for public liveness checks while preserving rich
  // diagnostics in non-production environments.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        ok: envHealthy,
        status,
      },
      { status: statusCode }
    );
  }

  const appVersion = process.env.npm_package_version || '1.2.0';

  const healthData = {
    ok: envHealthy,
    status,
    timestamp: new Date().toISOString(),
    version: appVersion,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
    },
    checks: {
      env: envHealthy,
      nextjs: true, // If this runs, Next.js is working
    }
  };

  return NextResponse.json(healthData, { status: statusCode });
}

/**
 * Check if required environment variables are set
 */
function checkEnvironmentVariables(): boolean {
  const required = [
    'NEXT_PUBLIC_CHAIN_ID',
    'NEXT_PUBLIC_VFIDE_TOKEN_ADDRESS',
    'NEXT_PUBLIC_VAULT_HUB_ADDRESS',
  ];

  const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    process.env.NEXT_PUBLIC_WAGMI_PROJECT_ID;

  if (walletConnectProjectId === undefined || walletConnectProjectId.trim() === '') {
    required.push('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID');
  }

  const missing = required.filter(key => {
    const value = process.env[key];
    return value === undefined || value === '';
  });

  if (missing.length > 0) {
    logger.warn('⚠️ Missing environment variables:', missing);
    logger.warn('💡 For local dev, copy .env.local.example. For vault-capable deployments, configure WalletConnect and canonical contract env vars.');
  }

  return missing.length === 0;
}
