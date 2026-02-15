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

  const envOk = checkEnvironmentVariables();

  const healthData = {
    status: envOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.2.0',
  };

  const statusCode = envOk ? 200 : 503;

  return NextResponse.json(healthData, { status: statusCode });
}

/**
 * Check if required environment variables are set
 */
function checkEnvironmentVariables(): boolean {
  const required = [
    'NEXT_PUBLIC_CHAIN_ID',
    'NEXT_PUBLIC_CONTRACT_ADDRESS',
    'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID'
  ];

  // Server-only vars (not exposed to client, only checked existence)
  const requiredServer = [
    'JWT_SECRET',
  ];

  const missingPublic = required.filter(key => {
    const value = process.env[key];
    return value === undefined || value === '';
  });

  const missingServer = requiredServer.filter(key => {
    const value = process.env[key];
    return value === undefined || value === '';
  });

  const allMissing = [...missingPublic, ...missingServer];

  if (allMissing.length > 0 && process.env.NODE_ENV !== 'production') {
    console.warn('Missing environment variables:', allMissing);
  }

  return allMissing.length === 0;
}
