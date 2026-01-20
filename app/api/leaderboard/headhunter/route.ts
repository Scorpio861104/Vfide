import { NextRequest, NextResponse } from 'next/server';

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
  estimatedReward: string;
  isCurrentUser: boolean;
}

// Reward pool per quarter (from tokenomics: 15M tokens over 5 years = 750K/quarter)
const QUARTERLY_REWARD_POOL = 750_000;

// Calculate estimated reward based on rank
function calculateReward(rank: number, points: number, totalPoints: number): string {
  if (totalPoints === 0) return '$0';
  
  // Top 20 split the pool proportionally
  const share = points / totalPoints;
  const reward = QUARTERLY_REWARD_POOL * share * 0.10; // Assuming $0.10 per token
  
  return `$${reward.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export async function GET(request: NextRequest) {
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

    // For now, return empty array when no subgraph is configured
    // This is more honest than returning fake mock data
    const subgraphUrl = process.env.NEXT_PUBLIC_SUBGRAPH_URL;
    
    if (!subgraphUrl) {
      // Validate year and quarter
      const yearNum = parseInt(year, 10);
      const quarterNum = parseInt(quarter, 10);
      
      if (isNaN(yearNum) || isNaN(quarterNum) || !isFinite(yearNum) || !isFinite(quarterNum)) {
        return NextResponse.json(
          { error: 'Invalid year or quarter parameter' },
          { status: 400 }
        );
      }
      
      // Return empty leaderboard with a message
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Leaderboard data will be available once the subgraph is deployed',
        meta: {
          year: yearNum,
          quarter: quarterNum,
          totalParticipants: 0,
          rewardPool: QUARTERLY_REWARD_POOL,
        }
      });
    }

    // Validate year and quarter before using
    const yearNum = parseInt(year, 10);
    const quarterNum = parseInt(quarter, 10);
    
    if (isNaN(yearNum) || isNaN(quarterNum) || !isFinite(yearNum) || !isFinite(quarterNum)) {
      return NextResponse.json(
        { error: 'Invalid year or quarter parameter' },
        { status: 400 }
      );
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

    const result = await response.json();
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
      estimatedReward: calculateReward(index + 1, stat.points, totalPoints),
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
        rewardPool: QUARTERLY_REWARD_POOL,
      }
    });

  } catch (error) {
    console.error('[Leaderboard API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard data' },
      { status: 500 }
    );
  }
}
