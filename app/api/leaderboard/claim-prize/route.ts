/**
 * Monthly competition prizes are not available.
 * VFIDE is a governance utility token — distributing tokens based on
 * leaderboard ranking creates an expectation of profit and conflicts
 * with Howey Test compliance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';

export const POST = withAuth(async (_request: NextRequest) => {
  return NextResponse.json(
    {
      error:
        'Monthly competition prizes are not available. VFIDE is a governance utility token; token distributions based on competition ranking conflict with Howey Test compliance.',
    },
    { status: 403 }
  );
});
