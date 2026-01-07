/**
 * Security Violations API Route
 * 
 * General security monitoring endpoint for client-side violations.
 */

import { NextRequest, NextResponse } from 'next/server';

interface SecurityViolation {
  type: string;
  details: any;
  timestamp: number;
  url: string;
  userAgent: string;
}

// In-memory store (use database in production)
const violations: SecurityViolation[] = [];
const MAX_VIOLATIONS = 1000;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const violation: SecurityViolation = {
      type: body.type || 'unknown',
      details: body.details || {},
      timestamp: body.timestamp || Date.now(),
      url: body.url || request.url,
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    violations.push(violation);

    // Keep only recent violations
    if (violations.length > MAX_VIOLATIONS) {
      violations.shift();
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Security Violation]', violation.type, violation.details);
    }

    // In production, send to monitoring service
    // await sendToMonitoring(violation);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error recording security violation:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Development only: view recent violations
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const type = request.nextUrl.searchParams.get('type');

  let filtered = violations;
  if (type) {
    filtered = violations.filter(v => v.type === type);
  }

  const recent = filtered.slice(-limit).reverse();

  return NextResponse.json({
    total: filtered.length,
    recent,
    types: Array.from(new Set(violations.map(v => v.type))),
  });
}
