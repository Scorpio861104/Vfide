/**
 * Crypto API Routes - Rewards Endpoint with Rate Limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, recordRewardGrant, REWARD_AMOUNTS } from '@/lib/cryptoRateLimiting';
import { validateEthereumAddress } from '@/lib/cryptoValidation';

// Mock rewards storage
const rewardsStore = new Map<string, any[]>();

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    // Validate user ID
    if (!validateEthereumAddress(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user address' },
        { status: 400 }
      );
    }
    
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
    const userId = reward.userId?.toLowerCase();
    const actionType = reward.actionType;
    
    // Validate inputs
    if (!userId || !validateEthereumAddress(userId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid user address' },
        { status: 400 }
      );
    }
    
    if (!actionType || !(actionType in REWARD_AMOUNTS)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action type' },
        { status: 400 }
      );
    }
    
    // Check rate limit
    const rateLimitResult = checkRateLimit(userId, actionType);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          message: rateLimitResult.reason,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
            'Retry-After': Math.ceil(
              (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
            ).toString(),
          },
        }
      );
    }
    
    // Use standardized reward amount
    const rewardWithAmount = {
      ...reward,
      amount: REWARD_AMOUNTS[actionType as keyof typeof REWARD_AMOUNTS],
      timestamp: Date.now(),
      claimed: false,
    };
    
    const rewards = rewardsStore.get(userId) || [];
    rewards.push(rewardWithAmount);
    rewardsStore.set(userId, rewards);
    
    // Record the grant for rate limiting
    recordRewardGrant(userId, actionType);

    return NextResponse.json({
      success: true,
      reward: rewardWithAmount,
      remaining: rateLimitResult.remaining,
      resetAt: rateLimitResult.resetAt,
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to save reward:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save reward' },
      { status: 500 }
    );
  }
}
