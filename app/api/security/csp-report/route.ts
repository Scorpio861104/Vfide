/**
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
const MAX_CSP_REPORTS_LIMIT = 200;

// Maximum length for string fields to prevent log-flooding
const MAX_FIELD_LENGTH = 2048;

/**
 * Validate and sanitise a CSP report payload.
 * Returns the sanitised violation, or null when the payload is invalid.
 */
function parseCSPReport(body: unknown): CSPViolation | null {
  if (!body || typeof body !== 'object') return null;

  const raw = body as Record<string, unknown>;
  const report = raw['csp-report'];

  if (!report || typeof report !== 'object') return null;

  const v = report as Record<string, unknown>;

  // Must contain at least one of the two directive fields
  const hasDirective =
    typeof v['violated-directive'] === 'string' ||
    typeof v['effective-directive'] === 'string';
  if (!hasDirective) return null;

  // Helper to safely extract and truncate an optional string field
  const str = (key: string): string | undefined => {
    const val = v[key];
    if (val === undefined || val === null) return undefined;
    return String(val).slice(0, MAX_FIELD_LENGTH);
  };

  // Helper to safely extract an optional non-negative integer field
  const num = (key: string): number | undefined => {
    const val = v[key];
    if (val === undefined || val === null) return undefined;
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
  };

  return {
    'document-uri': str('document-uri'),
    'violated-directive': str('violated-directive'),
    'effective-directive': str('effective-directive'),
    'original-policy': str('original-policy'),
    'blocked-uri': str('blocked-uri'),
    'source-file': str('source-file'),
    'line-number': num('line-number'),
    'column-number': num('column-number'),
    'status-code': num('status-code'),
  };
}

export async function POST(request: NextRequest) {
  // Rate limiting — unauthenticated endpoint; use write-tier (30/min) to
  // prevent log-flood attacks while still accepting legitimate browser reports.
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  try {
    // Validate Content-Type — browsers send application/csp-report or application/json
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('application/csp-report') && !contentType.includes('application/json')) {
      return NextResponse.json({ error: 'Unsupported content type' }, { status: 415 });
    }

    let body: CSPReport;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const violation = parseCSPReport(body);
    
    if (!violation) {
      return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
    }

    // Store violation with metadata
    const record = {
      ...violation,
      timestamp: Date.now(),
      userAgent: (request.headers.get('user-agent') || 'unknown').slice(0, 512),
    };

    violations.push(record);

    // Keep only recent violations
    if (violations.length > MAX_VIOLATIONS) {
      violations.shift();
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

  // Optional: endpoint to view recent violations (development only)
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const rawLimit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

  const limit = Math.min(Math.max(rawLimit, 0), MAX_CSP_REPORTS_LIMIT);
  
  // Validate parsed number
  if (isNaN(rawLimit)) {
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
