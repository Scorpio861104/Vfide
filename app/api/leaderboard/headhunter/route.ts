import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { logger } from '@/lib/logger';

/**
 * GET /api/leaderboard/headhunter
 * Fetch headhunter leaderboard data
 * 
 * In production, this would query:
 * 1. The Graph Protocol subgraph for indexed referral events
 * 2. Or aggregate from EcosystemVault contract events
 * 
 * Query params:
 * - year: Competition year (required)
 * - quarter: Competition quarter 1-4 (required)
 * - userAddress: Current user's address for highlighting (optional)
 */

interface LeaderboardEntry {
  rank: number;
  address: string;
  points: number;
  userReferrals: number;
  merchantReferrals: number;
  isCurrentUser: boolean;
}

function parseStrictIntegerParam(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function parseLeaderboardPeriod(year: string, quarter: string): { year: number; quarter: number } | null {
  const yearNum = parseStrictIntegerParam(year);
  const quarterNum = parseStrictIntegerParam(quarter);
  if (yearNum === null || quarterNum === null) {
    return null;
  }

  if (yearNum < 2020 || yearNum > 2100) {
    return null;
  }

  if (quarterNum < 1 || quarterNum > 4) {
    return null;
  }

  return { year: yearNum, quarter: quarterNum };
}

export async function GET(request: NextRequest) {
  // Rate limiting for read operations
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const quarter = searchParams.get('quarter');
    const userAddress = searchParams.get('userAddress')?.toLowerCase();

    if (!year || !quarter) {
      return NextResponse.json(
        { error: 'Year and quarter are required' },
        { status: 400 }
      );
    }

    const parsedPeriod = parseLeaderboardPeriod(year, quarter);
    if (!parsedPeriod) {
      return NextResponse.json(
        { error: 'Invalid year or quarter parameter' },
        { status: 400 }
      );
    }
    const yearNum = parsedPeriod.year;
    const quarterNum = parsedPeriod.quarter;

    // In production: Query subgraph or aggregate contract events
    // Example subgraph query would be:
    // query {
    //   headhunterStats(
    //     where: { year: $year, quarter: $quarter }
    //     orderBy: points
    //     orderDirection: desc
    //     first: 20
    //   ) {
    //     referrer
    //     points
    //     userReferrals
    //     merchantReferrals
    //   }
    // }

    // Return an empty array when no subgraph is configured.
    // This avoids fabricating leaderboard entries.
    const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
    
    if (!subgraphUrl) {
      // Return empty leaderboard with a message
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Leaderboard data will be available once the subgraph is deployed',
        meta: {
          year: yearNum,
          quarter: quarterNum,
          totalParticipants: 0,
        }
      });
    }

    // Validate subgraph URL against known hosts to prevent SSRF
    const ALLOWED_SUBGRAPH_HOSTS = [
      'api.thegraph.com',
      'gateway.thegraph.com',
      'api.studio.thegraph.com',
      'subgraph.satsuma-prod.com',
    ];
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(subgraphUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid subgraph URL configured' }, { status: 500 });
    }
    if (parsedUrl.protocol !== 'https:' || !ALLOWED_SUBGRAPH_HOSTS.includes(parsedUrl.hostname)) {
      return NextResponse.json({ error: 'Subgraph URL not in allowed hosts' }, { status: 500 });
    }

    // When subgraph is available, fetch real data
    const response = await fetch(subgraphUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          query GetLeaderboard($year: Int!, $quarter: Int!) {
            headhunterStats(
              where: { year: $year, quarter: $quarter }
              orderBy: points
              orderDirection: desc
              first: 20
            ) {
              referrer
              points
              userReferrals
              merchantReferrals
            }
          }
        `,
        variables: { year: yearNum, quarter: quarterNum }
      }),
    });

    // Check if fetch was successful
    if (!response.ok) {
      logger.error('Failed to fetch from subgraph:', response.status);
      // Return an empty leaderboard on fetch failure
      return NextResponse.json({
        success: true,
        data: [],
        year: yearNum,
        quarter: quarterNum,
        source: 'fallback',
      });
    }

    const result = await response.json();
    
    // Validate response structure
    if (!result.data) {
      logger.error('Invalid subgraph response structure');
      return NextResponse.json({
        success: true,
        data: [],
        year: yearNum,
        quarter: quarterNum,
        source: 'fallback',
      });
    }
    
    const stats = result.data?.headhunterStats || [];
    
    // Calculate total points for reward distribution
    const totalPoints = stats.reduce((sum: number, s: { points: number }) => sum + s.points, 0);
    
    // Map to leaderboard entries
    const leaderboard: LeaderboardEntry[] = stats.map((stat: {
      referrer: string;
      points: number;
      userReferrals: number;
      merchantReferrals: number;
    }, index: number) => ({
      rank: index + 1,
      address: stat.referrer,
      points: stat.points,
      userReferrals: stat.userReferrals,
      merchantReferrals: stat.merchantReferrals,
      isCurrentUser: stat.referrer.toLowerCase() === userAddress,
    }));

    return NextResponse.json({
      success: true,
      data: leaderboard,
      meta: {
        year: yearNum,
        quarter: quarterNum,
        totalParticipants: stats.length,
        totalPoints,
      }
    });

  } catch (error) {
    logger.error('[Leaderboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}
