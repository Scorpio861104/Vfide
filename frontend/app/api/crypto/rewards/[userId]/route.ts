/**
 * Crypto API Routes - Rewards Endpoint
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock rewards storage
const rewardsStore = new Map<string, any[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    const rewards = rewardsStore.get(userId.toLowerCase()) || [];

    return NextResponse.json({
      success: true,
      rewards: rewards.sort((a, b) => b.timestamp - a.timestamp),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const reward = await request.json();
    const userId = reward.userId.toLowerCase();
    
    const rewards = rewardsStore.get(userId) || [];
    rewards.push(reward);
    rewardsStore.set(userId, rewards);

    return NextResponse.json({
      success: true,
      reward,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to save reward' },
      { status: 500 }
    );
  }
}
