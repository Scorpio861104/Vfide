import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { isConfiguredContractAddress } from '@/lib/contracts';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const REWARD_ID_REGEX = /^[a-zA-Z0-9:_-]{1,128}$/;

const claimRewardsSchema = z.object({
  rewardIds: z.array(z.string().trim().regex(REWARD_ID_REGEX)).min(1).max(100),
});

type RewardVerificationResult =
  | { status: 'verified', eligible: boolean }
  | { status: 'unsupported' };

/**
 * Verify on-chain that a reward is claimable for a given user when the source
 * contract is one the current codebase actually supports.
 */
async function verifyRewardOnChain(
  contractAddress: string,
  userAddress: string,
  rewardId: string
): Promise<RewardVerificationResult> {
  if (!isConfiguredContractAddress(contractAddress) || !isAddress(userAddress)) {
    throw new Error('Invalid address for on-chain verification');
  }

  // The historical UserRewards verifier contract is not present in this
  // codebase. Until a real verifier contract is added, do not fail claims by
  // probing an unsupported phantom ABI.
  logger.warn(`[Reward Claim] Skipping unsupported on-chain verifier for reward source ${contractAddress}`);
  void rewardId;
  return { status: 'unsupported' };

  // Reserved for future supported verifier contracts.
  // const rewardIdBytes32 = await idToBytes32(rewardId);
  // const eligible = await client.readContract({ ... });
  // return { status: 'verified', eligible: Boolean(eligible) };
}

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

    // Require authentication and verify ownership via database mapping
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const ownerResult = await query<{ wallet_address: string }>(
      'SELECT wallet_address FROM users WHERE id = $1',
      [userId]
    );

    const ownerAddress = ownerResult.rows[0]?.wallet_address;
    if (!ownerAddress) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const authAddress = typeof authResult.user?.address === 'string'
      ? authResult.user.address.trim()
      : '';
    if (!authAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (authAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You do not have permission to access this resource' },
        { status: 403 }
      );
    }

    let body: z.infer<typeof claimRewardsSchema>;
    try {
      const rawBody = await request.json();
      const parsed = claimRewardsSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = parsed.data;
    } catch (error) {
      logger.debug('[Rewards Claim] Invalid JSON body', error);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { rewardIds } = body;

    // Validate reward IDs and deduplicate while preserving supported ID formats
    const normalizedRewardIds = [...new Set(rewardIds)]
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (normalizedRewardIds.length === 0) {
      return NextResponse.json({ error: 'No valid reward IDs provided' }, { status: 400 });
    }

    // First, fetch the rewards to verify they exist and belong to the user
    const rewardsCheck = await query(
      `SELECT id, amount, reward_type, source_contract FROM user_rewards
       WHERE user_id = $1 AND id = ANY($2::uuid[]) AND status = 'pending'`,
      [userId, normalizedRewardIds]
    );

    if (rewardsCheck.rows.length === 0) {
      return NextResponse.json({ error: 'No claimable rewards found' }, { status: 404 });
    }

    // Verify rewards on-chain if they have a source contract.
    // Fail-safe: block the claim when a supported verifier returns false or throws.
    // Unsupported verifier contracts are skipped explicitly because the historical
    // UserRewards ABI is a phantom dependency in this repository.
    for (const reward of rewardsCheck.rows) {
      if (reward.source_contract) {
        try {
          const verification = await verifyRewardOnChain(
            reward.source_contract,
            authAddress,
            reward.id
          );
          if (verification.status === 'verified' && !verification.eligible) {
            return NextResponse.json(
              { error: `Reward ${reward.id} is not claimable on-chain` },
              { status: 403 }
            );
          }
        } catch (error) {
          logger.error(`[Reward Claim] On-chain verification failed for reward ${reward.id}:`, error);
          // Fail-safe: block claim when a supported on-chain check throws to prevent unauthorised claims
          return NextResponse.json(
            { error: 'On-chain verification failed. Please try again later.' },
            { status: 503 }
          );
        }
      }
    }

    // Update rewards to claimed status
    const result = await query(
      `UPDATE user_rewards
       SET status = 'claimed', claimed_at = NOW()
       WHERE user_id = $1 AND id = ANY($2::uuid[]) AND status = 'pending'
       RETURNING *`,
      [userId, normalizedRewardIds]
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
    logger.error('[Rewards Claim] Error:', error);
    return NextResponse.json(
      { error: 'Failed to claim rewards' },
      { status: 500 }
    );
  }
}
