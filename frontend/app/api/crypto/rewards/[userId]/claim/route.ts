/**
 * Crypto API Routes - Claim Rewards Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock rewards storage (shared with rewards route)
const rewardsStore = new Map<string, any[]>();
const tokenBalances = new Map<string, string>();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const userIdLower = userId.toLowerCase();
    
    const rewards = rewardsStore.get(userIdLower) || [];
    const unclaimedRewards = rewards.filter((r: any) => !r.claimed);

    if (unclaimedRewards.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No rewards to claim',
        rewards: [],
      });
    }

    // Calculate total
    const total = unclaimedRewards.reduce(
      (sum: number, r: any) => sum + parseFloat(r.amount),
      0
    );

    // Update balance
    const currentBalance = parseFloat(tokenBalances.get(userIdLower) || '1000');
    tokenBalances.set(userIdLower, (currentBalance + total).toString());

    // Mark as claimed
    const updatedRewards = rewards.map((r: any) => ({
      ...r,
      claimed: true,
    }));
    rewardsStore.set(userIdLower, updatedRewards);

    return NextResponse.json({
      success: true,
      rewards: unclaimedRewards,
      totalClaimed: total.toFixed(2),
      newBalance: (currentBalance + total).toFixed(2),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to claim rewards' },
      { status: 500 }
    );
  }
}
