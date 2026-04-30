import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';
import { GET as activitiesGET } from '../route';

const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/**
 * GET /api/activities/0x...?type=vote&limit=50&offset=0
 * Get activity feed for a specific address (path-based wrapper)
 * Forwards to the query-based endpoint
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ address: string }>;
  }
) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const { address } = await params;

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Missing address parameter' },
        { status: 400 }
      );
    }

    const normalizedAddress = address.trim().toLowerCase();
    if (!ETH_ADDRESS_REGEX.test(normalizedAddress)) {
      return NextResponse.json(
        { error: 'Invalid address format' },
        { status: 400 }
      );
    }

    // Build new URL with userAddress query param
    const searchParams = request.nextUrl.searchParams;
    const newUrl = new URL(request.nextUrl);
    newUrl.pathname = '/api/activities';
    newUrl.searchParams.set('userAddress', normalizedAddress);

    // Forward all other query params
    for (const [key, value] of searchParams) {
      if (key !== 'address') {
        newUrl.searchParams.set(key, value);
      }
    }

    const synthRequest = new NextRequest(newUrl, {
      method: 'GET',
      headers: request.headers,
    });

    return activitiesGET(synthRequest);
  } catch (error) {
    logger.error('Error fetching activities by address:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
