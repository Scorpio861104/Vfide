import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/api-validation';

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

  // Rate limiting
  const rateLimit = checkRateLimit(`health:${clientId}`, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }


  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      checks: {
        server: 'ok',
        // Add more health checks as needed
        // database: await checkDatabase(),
        // rpc: await checkRPCEndpoints(),
      }
    }
    
    const isHealthy = Object.values(health.checks).every(v => v === 'ok')
    
    return NextResponse.json(health, {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    )
  }
}
