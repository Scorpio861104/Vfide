/**
 * Monthly competition prizes are not available.
 * VFIDE is a governance utility token — distributing tokens based on
 * leaderboard ranking creates an expectation of profit and conflicts
 * with Howey Test compliance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

export const POST = withAuth(async (request: NextRequest) => {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  return NextResponse.json(
    {
      error:
        'Monthly competition prizes are not available. VFIDE is a governance utility token; token distributions based on competition ranking conflict with Howey Test compliance.',
    },
    { status: 403 }
  );
});
