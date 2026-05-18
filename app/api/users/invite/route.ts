import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

/**
 * GET /api/users/invite?code=abc123
 * Validate an invite code
 */
export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json({ valid: false });
    }

    const inviteCode = code.trim().toLowerCase();

    // Query group_invites table to validate
    const result = await query(
      `SELECT id, is_revoked, expires_at, current_uses, max_uses 
       FROM group_invites 
       WHERE LOWER(code) = $1 
       LIMIT 1`,
      [inviteCode]
    );

    if (!result || result.rows.length === 0) {
      return NextResponse.json({ valid: false });
    }

    const invite = result.rows[0] as {
      id: number;
      is_revoked: boolean;
      expires_at: string | null;
      current_uses: number;
      max_uses: number | null;
    };

    // Check if revoked
    if (invite.is_revoked) {
      return NextResponse.json({ valid: false });
    }

    // Check if expired
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ valid: false });
    }

    // Check usage limit
    if (invite.max_uses !== null && invite.current_uses >= invite.max_uses) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    logger.error('Error validating invite code:', error);
    return NextResponse.json({ valid: false });
  }
}
