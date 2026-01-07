/**
 * Error Reporting API Route
 * 
 * Receives error reports from the client and stores them for analysis.
 */

import { NextRequest, NextResponse } from 'next/server';

interface ErrorReport {
  id: string;
  timestamp: number;
  type: 'error' | 'warning' | 'info';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  userId?: string;
  context?: Record<string, any>;
  fingerprint?: string;
}

// In-memory storage (use database in production)
const errorsStore: ErrorReport[] = [];
const MAX_ERRORS = 10000;

export async function POST(request: NextRequest) {
  try {
    const report: ErrorReport = await request.json();

    // Validate required fields
    if (!report.message || !report.timestamp) {
      return NextResponse.json(
        { error: 'Invalid error report' },
        { status: 400 }
      );
    }

    // Store error
    errorsStore.push(report);

    // Keep only recent errors
    if (errorsStore.length > MAX_ERRORS) {
      errorsStore.shift();
    }

    // In production: Send to external monitoring service
    // await sendToSentry(report);
    // await sendToDatadog(report);
    // await sendToLogRocket(report);

    // Log critical errors
    if (report.severity === 'critical') {
      console.error('[CRITICAL ERROR]', report);
      // Send alert to team (email, Slack, PagerDuty, etc.)
    }

    return NextResponse.json({ success: true, id: report.id });
  } catch (error) {
    console.error('Error storing error report:', error);
    return NextResponse.json(
      { error: 'Failed to store error report' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Development only: view errors
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '100');
  const severity = request.nextUrl.searchParams.get('severity');
  const type = request.nextUrl.searchParams.get('type');

  let filtered = errorsStore;

  if (severity) {
    filtered = filtered.filter((e) => e.severity === severity);
  }

  if (type) {
    filtered = filtered.filter((e) => e.type === type);
  }

  const recent = filtered.slice(-limit).reverse();

  // Calculate statistics
  const stats = {
    total: errorsStore.length,
    byType: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    byFingerprint: {} as Record<string, { count: number; lastSeen: number }>,
  };

  errorsStore.forEach((error) => {
    stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
    stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;

    if (error.fingerprint) {
      if (!stats.byFingerprint[error.fingerprint]) {
        stats.byFingerprint[error.fingerprint] = { count: 0, lastSeen: 0 };
      }
      stats.byFingerprint[error.fingerprint].count++;
      stats.byFingerprint[error.fingerprint].lastSeen = Math.max(
        stats.byFingerprint[error.fingerprint].lastSeen,
        error.timestamp
      );
    }
  });

  // Get top errors by frequency
  const topErrors = Object.entries(stats.byFingerprint)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([fingerprint, data]) => ({
      fingerprint,
      count: data.count,
      lastSeen: data.lastSeen,
      example: errorsStore.find((e) => e.fingerprint === fingerprint),
    }));

  return NextResponse.json({
    total: errorsStore.length,
    filtered: recent.length,
    errors: recent,
    statistics: stats,
    topErrors,
  });
}

export async function DELETE(request: NextRequest) {
  // Development only: clear errors
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const count = errorsStore.length;
  errorsStore.length = 0;

  return NextResponse.json({
    success: true,
    message: `Cleared ${count} errors`,
  });
}
