import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

const REWARD_VERIFICATION_MODE = process.env.REWARD_VERIFICATION_ENABLED;
const REWARD_VERIFICATION_ABI = [
  {
    name: 'isRewardClaimable',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'rewardId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

const rewardClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.REWARD_RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'https://sepolia.base.org'),
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

    const parsedRewardIds = rewardIds
      .map((id: unknown) => Number(id))
      .filter((id: number) => Number.isInteger(id) && id > 0);

    if (parsedRewardIds.length !== rewardIds.length) {
      return NextResponse.json({ error: 'Invalid rewardIds' }, { status: 400 });
    }

    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [userId.toLowerCase()]
    );

    const internalUserId = userResult.rows[0]?.id;
    if (!internalUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const verificationEnabled = REWARD_VERIFICATION_MODE === 'true' || REWARD_VERIFICATION_MODE === undefined;

    // Atomically select and lock the pending rewards in a single query.
    // The WHERE status = 'pending' clause combined with RETURNING ensures
    // that concurrent requests cannot double-claim: only the first UPDATE wins.
    const result = await query(
      `UPDATE user_rewards
       SET status = 'claimed', claimed_at = NOW()
       WHERE user_id = $1 AND id = ANY($2::int[]) AND status = 'pending'
       RETURNING id, user_id, amount, reason, status, earned_at, claimed_at, source_contract, onchain_reward_id`,
      [internalUserId, parsedRewardIds]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'No claimable rewards found (already claimed or not found)' }, { status: 404 });
    }

    // Verify on-chain eligibility AFTER locking, and revert ALL if any ineligible
    // API-21 Fix: Revert entire batch on any verification failure (not just the failed one)
    if (verificationEnabled) {
      const failedRewardIds: number[] = [];
      let failureReason = '';

      for (const reward of result.rows) {
        if (reward.source_contract && reward.onchain_reward_id) {
          try {
            const isEligible = await rewardClient.readContract({
              address: reward.source_contract as `0x${string}`,
              abi: REWARD_VERIFICATION_ABI,
              functionName: 'isRewardClaimable',
              args: [authResult.user.address, BigInt(reward.onchain_reward_id)],
            });

            if (!isEligible) {
              failedRewardIds.push(reward.id);
              failureReason = `Reward ${reward.id} is not claimable on-chain`;
              break;
            }
          } catch {
            failedRewardIds.push(reward.id);
            failureReason = `On-chain verification failed for reward ${reward.id}`;
            break;
          }
        }
      }

      if (failedRewardIds.length > 0) {
        // Revert ALL claimed rewards in this batch, not just the failed one
        const allClaimedIds = result.rows.map((r) => r.id);
        await query(
          `UPDATE user_rewards SET status = 'pending', claimed_at = NULL WHERE id = ANY($1::int[])`,
          [allClaimedIds]
        );
        return NextResponse.json(
          { error: failureReason },
          { status: 403 }
        );
      }
    }

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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
