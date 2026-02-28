import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireOwnership } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { createPublicClient, http, isAddress } from 'viem';
import { baseSepolia } from 'viem/chains';
import rewardABI from '@/lib/abis/UserRewards.json';

// Initialize viem client for on-chain verification
const client = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'),
});

/**
 * Convert an arbitrary string ID (e.g. a UUID) to a bytes32 hex string
 * by computing its SHA-256 hash. Used to map database reward IDs to the
 * on-chain bytes32 parameter expected by the reward contract.
 */
async function idToBytes32(id: string): Promise<`0x${string}`> {
  const encoded = new TextEncoder().encode(id);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return ('0x' + Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')) as `0x${string}`;
}

/**
 * Verify on-chain that a reward is claimable for a given user.
 * Returns true when the contract confirms eligibility.
 * Returns false when the contract says it is NOT claimable.
 * Throws when the contract call itself fails (network error, revert, etc.) —
 * callers should BLOCK the claim in that case (fail-safe).
 */
async function verifyRewardOnChain(
  contractAddress: string,
  userAddress: string,
  rewardId: string
): Promise<boolean> {
  if (!isAddress(contractAddress) || !isAddress(userAddress)) {
    throw new Error('Invalid address for on-chain verification');
  }

  const rewardIdBytes32 = await idToBytes32(rewardId);

  const eligible = await client.readContract({
    address: contractAddress as `0x${string}`,
    abi: rewardABI,
    functionName: 'isRewardClaimable',
    args: [userAddress as `0x${string}`, rewardIdBytes32],
  });

  return Boolean(eligible);
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

    // Verify rewards on-chain if they have a source contract.
    // Fail-safe: block the claim if on-chain verification returns false OR throws.
    for (const reward of rewardsCheck.rows) {
      if (reward.source_contract) {
        try {
          const eligible = await verifyRewardOnChain(
            reward.source_contract,
            authResult.user.address,
            reward.id
          );
          if (!eligible) {
            return NextResponse.json(
              { error: `Reward ${reward.id} is not claimable on-chain` },
              { status: 403 }
            );
          }
        } catch (error) {
          console.error(`[Reward Claim] On-chain verification failed for reward ${reward.id}:`, error);
          // Fail-safe: block claim when on-chain check throws to prevent unauthorised claims
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
