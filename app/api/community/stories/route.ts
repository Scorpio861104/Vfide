import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

import type { NextRequest } from 'next/server';

export const GET = withAuth(async (request: NextRequest, user: JWTPayload) => {
  try {
    const result = await query(
      `SELECT * FROM market_stories WHERE expires_at > NOW() ORDER BY posted_at DESC LIMIT 20`
    );
    return NextResponse.json({ stories: result.rows });
  } catch {
    return NextResponse.json({ stories: [] });
  }
});
