import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';

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
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

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
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.2.0',
      },
      { status: statusCode }
    );
  }

  const healthData = {
    ok: envHealthy,
    status,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.2.0',
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
    'NEXT_PUBLIC_CONTRACT_ADDRESS', // Added to .env.local.example - use 0x0 for dev
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'
  ];

  const missing = required.filter(key => {
    const value = process.env[key];
    return value === undefined || value === '';
  });

  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing);
    console.warn('💡 For local dev, see REALITY_CHECK.md or copy .env.local.example');
  }

  return missing.length === 0;
}
