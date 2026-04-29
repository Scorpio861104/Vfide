import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET() {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const result = await query(
      `SELECT * FROM market_stories WHERE expires_at > NOW() ORDER BY posted_at DESC LIMIT 20`
    );
    return NextResponse.json({ stories: result.rows });
  } catch {
    return NextResponse.json({ stories: [] });
  }
}
