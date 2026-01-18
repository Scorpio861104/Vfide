/**
 * CSP Report API Route
 * 
 * Receives and logs Content Security Policy violation reports.
 * Stores violations in PostgreSQL database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

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

// Ensure CSP violations table exists (run in init-db.sql ideally)
const ensureTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS csp_violations (
      id SERIAL PRIMARY KEY,
      document_uri TEXT,
      violated_directive TEXT,
      effective_directive TEXT,
      blocked_uri TEXT,
      source_file TEXT,
      line_number INTEGER,
      column_number INTEGER,
      status_code INTEGER,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

let tableEnsured = false;

export async function POST(request: NextRequest) {
  try {
    // Ensure table exists on first request
    if (!tableEnsured) {
      await ensureTable();
      tableEnsured = true;
    }

    const body: CSPReport = await request.json();
    const violation = body['csp-report'];
    
    if (!violation) {
      return NextResponse.json({ error: 'Invalid report' }, { status: 400 });
    }

    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Store violation in database
    await query(
      `INSERT INTO csp_violations (
        document_uri, violated_directive, effective_directive, 
        blocked_uri, source_file, line_number, column_number, 
        status_code, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        violation['document-uri'] || null,
        violation['violated-directive'] || null,
        violation['effective-directive'] || null,
        violation['blocked-uri'] || null,
        violation['source-file'] || null,
        violation['line-number'] || null,
        violation['column-number'] || null,
        violation['status-code'] || null,
        userAgent,
      ]
    );

    // Clean up old violations (keep last 10000)
    await query(`
      DELETE FROM csp_violations 
      WHERE id NOT IN (
        SELECT id FROM csp_violations 
        ORDER BY created_at DESC 
        LIMIT 10000
      )
    `);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[CSP Violation]', {
        directive: violation['violated-directive'],
        blocked: violation['blocked-uri'],
        source: violation['source-file'],
        line: violation['line-number'],
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing CSP report:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Optional: endpoint to view recent violations (development only)
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    if (!tableEnsured) {
      await ensureTable();
      tableEnsured = true;
    }

    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
    
    const result = await query<{
      id: number;
      document_uri: string;
      violated_directive: string;
      blocked_uri: string;
      source_file: string;
      line_number: number;
      user_agent: string;
      created_at: string;
    }>(
      `SELECT * FROM csp_violations ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    const countResult = await query<{ count: string }>(
      'SELECT COUNT(*) FROM csp_violations'
    );

    if (countResult.rows.length === 0) {
      return NextResponse.json({
        total: 0,
        recent: result.rows,
        grouped: {},
      });
    }

    // Group by directive
    const grouped = result.rows.reduce((acc, v) => {
      const directive = v.violated_directive || 'unknown';
      if (!acc[directive]) {
        acc[directive] = [];
      }
      acc[directive].push(v);
      return acc;
    }, {} as Record<string, typeof result.rows>);

    const countRow = countResult.rows[0];
    return NextResponse.json({
      total: countRow ? parseInt(countRow.count) : 0,
      recent: result.rows,
      grouped,
    });
  } catch (error) {
    console.error('Error fetching CSP violations:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Clear old violations (admin only in production)
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30');

    const result = await query(
      `DELETE FROM csp_violations WHERE created_at < NOW() - INTERVAL '${olderThanDays} days' RETURNING id`
    );

    return NextResponse.json({ 
      success: true, 
      deleted: result.rowCount 
    });
  } catch (error) {
    console.error('Error clearing CSP violations:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
