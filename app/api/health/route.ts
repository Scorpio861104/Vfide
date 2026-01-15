import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';

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
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 100, windowMs: 60000 });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const healthData = {
    status: 'ok',
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
      env: checkEnvironmentVariables(),
      nextjs: true, // If this runs, Next.js is working
    }
  };

  const statusCode = healthData.checks.env ? 200 : 503;

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

  return required.every(key => {
    const value = process.env[key];
    return value !== undefined && value !== '';
  });
}
