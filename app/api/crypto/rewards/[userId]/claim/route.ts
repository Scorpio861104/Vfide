import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Initialize viem client for on-chain verification
const _client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  // Rate limiting - strict for claims
  const rateLimitResponse = await withRateLimit(request, 'claim');
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const resolvedParams = await params;
    const userId = resolvedParams?.userId;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid userId parameter' },
        { status: 400 }
      );
    }

    // Require ownership - only the user can claim their own rewards
    const authResult = await requireOwnership(request, userId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const body = await request.json();
    const { rewardIds } = body;

    if (!rewardIds || !Array.isArray(rewardIds)) {
      return NextResponse.json({ error: 'rewardIds array required' }, { status: 400 });
    }

    // Validate array length to prevent abuse
    if (rewardIds.length === 0) {
      return NextResponse.json({ error: 'At least one reward must be selected' }, { status: 400 });
    }
    
    if (rewardIds.length > 100) {
      return NextResponse.json({ error: 'Cannot claim more than 100 rewards at once' }, { status: 400 });
    }

    // First, fetch the rewards to verify they exist and belong to the user
    const rewardsCheck = await query(
      `SELECT id, amount, reward_type, source_contract FROM user_rewards
       WHERE user_id = $1 AND id = ANY($2::uuid[]) AND status = 'pending'`,
      [userId, rewardIds]
    );

    if (rewardsCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No claimable rewards found' }, { status: 404 });
    }

    // Verify rewards on-chain if they have a source contract
    // This prevents users from claiming rewards they didn't earn
    for (const reward of rewardsCheck.rows) {
      if (reward.source_contract) {
        try {
          // TODO: Implement actual on-chain verification when reward contracts are deployed
          // For now, we log the verification attempt for audit purposes
          console.log(`[Reward Claim] Would verify reward ${reward.id} from contract ${reward.source_contract}`);
          
          // Example verification (would call actual contract):
          // const isEligible = await client.readContract({
          //   address: reward.source_contract as `0x${string}`,
          //   abi: rewardABI,
          //   functionName: 'isRewardClaimable',
          //   args: [authResult.user.address, reward.id],
          // });
          //
          // if (!isEligible) {
          //   return NextResponse.json(
          //     { error: `Reward ${reward.id} is not claimable on-chain` },
          //     { status: 403 }
          //   );
          // }
        } catch (error) {
          console.error(`[Reward Claim] On-chain verification failed for reward ${reward.id}:`, error);
          // In production, you might want to fail the entire claim if verification fails
          // For now, we continue but log the error
        }
      }
    }

    // Update rewards to claimed status
    const result = await query(
      `UPDATE user_rewards
       SET status = 'claimed', claimed_at = NOW()
       WHERE user_id = $1 AND id = ANY($2::uuid[]) AND status = 'pending'
       RETURNING *`,
      [userId, rewardIds]
    );

    const totalClaimed = result.rows.reduce((sum, r) => {
      const amount = parseFloat(r.amount || '0');
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    return NextResponse.json({
      success: true,
      claimed: result.rows.length,
      totalAmount: totalClaimed,
      rewards: result.rows
    });
  } catch (error) {
    console.error('[Rewards Claim] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to claim rewards';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
