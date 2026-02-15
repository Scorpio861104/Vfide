/**
 * CSP Report API Route
 * 
 * Receives and logs Content Security Policy violation reports.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { query } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/middleware';

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

    const record = {
      ...violation,
      timestamp: Date.now(),
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    if (process.env.NODE_ENV !== 'test') {
      await query(
        `INSERT INTO error_logs (user_id, severity, message, stack, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          null,
          'warning',
          'CSP violation',
          null,
          JSON.stringify({ type: 'csp', violation: record }),
        ]
      );
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[CSP Violation]', {
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
    console.error('Error processing CSP report:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitGet = await withRateLimit(request, 'api');
  if (rateLimitGet) return rateLimitGet;

  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
  
  // Validate parsed number
  if (isNaN(limit) || limit < 0) {
    return NextResponse.json(
      { error: 'Invalid limit parameter' },
      { status: 400 }
    );
  }
  
  const result = await query(
    `SELECT metadata, timestamp FROM error_logs
     WHERE message = 'CSP violation'
     ORDER BY timestamp DESC
     LIMIT $1`,
    [limit]
  );

  const recentViolations = result.rows.map((row) => {
    const meta = row.metadata || {};
    return {
      ...meta.violation,
      timestamp: row.timestamp,
    };
  });

  const grouped = recentViolations.reduce((acc, v) => {
    const directive = v['violated-directive'] || 'unknown';
    if (!acc[directive]) {
      acc[directive] = [];
    }
    acc[directive].push(v);
    return acc;
  }, {} as Record<string, typeof recentViolations>);

  return NextResponse.json({
    total: recentViolations.length,
    recent: recentViolations,
    grouped,
  });
}
