/**
import { log } from '@/lib/logging';
 * CSP Report API Route
 * 
 * Receives and logs Content Security Policy violation reports.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';

interface CSPViolation {
  'document-uri'?: string;
  'violated-directive'?: string;
  'effective-directive'?: string;
  'original-policy'?: string;
  'blocked-uri'?: string;
  'source-file'?: string;
  'line-number'?: number;
  'column-number'?: number;
  'status-code'?: number;
}

interface CSPReport {
  'csp-report': CSPViolation;
}

// In-memory store for violations (in production, use database)
const violations: Array<CSPViolation & { timestamp: number; userAgent: string }> = [];
const MAX_VIOLATIONS = 1000;

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const body: CSPReport = await request.json();
    const violation = body['csp-report'];
    
    if (!violation) {
      return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
    }

    // Store violation with metadata
    const record = {
      ...violation,
      timestamp: Date.now(),
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    violations.push(record);

    // Keep only recent violations
    if (violations.length > MAX_VIOLATIONS) {
      violations.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      log.warn('[CSP Violation]', {
        directive: violation['violated-directive'],
        blocked: violation['blocked-uri'],
        source: violation['source-file'],
        line: violation['line-number'],
      });
    }

    // In production, you would send to monitoring service:
    // await sendToSentry(record);
    // await sendToDatadog(record);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    log.error('Error processing CSP report:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitGet = await withRateLimit(request, 'api');
  if (rateLimitGet) return rateLimitGet;

  // Optional: endpoint to view recent violations (development only)
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
  
  // Validate parsed number
  if (isNaN(limit) || limit < 0) {
    return NextResponse.json(
      { error: 'Invalid limit parameter' },
      { status: 400 }
    );
  }
  
  const recentViolations = violations.slice(-limit).reverse();

  // Group by directive
  const grouped = recentViolations.reduce((acc, v) => {
    const directive = v['violated-directive'] || 'unknown';
    if (!acc[directive]) {
      acc[directive] = [];
    }
    acc[directive].push(v);
    return acc;
  }, {} as Record<string, typeof violations>);

  return NextResponse.json({
    total: violations.length,
    recent: recentViolations,
    grouped,
  });
}
