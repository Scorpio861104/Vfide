/**
 * Promotional Rewards API - Get promotional reward status for a user
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface PromotionalReward {
  id: string;
  name: string;
  amount: number;
  status: 'claimable' | 'locked' | 'claimed';
  progress?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    // Get user's promotional rewards from database
    const userResult = await query<{
      id: number;
      has_vault: boolean;
      guardian_count: number;
      has_voted: boolean;
      vfide_balance: string;
      is_pioneer: boolean;
      profile_complete: boolean;
    }>(`
      SELECT 
        u.id,
        u.has_vault,
        u.guardian_count,
        u.has_voted,
        COALESCE(u.vfide_balance, '0') as vfide_balance,
        u.is_pioneer,
        u.profile_complete
      FROM users u
      WHERE u.wallet_address = $1
    `, [address.toLowerCase()]);

    const user = userResult.rows[0];

    // Get claimed rewards
    const claimedResult = await query<{ reward_id: string }>(`
      SELECT reward_id 
      FROM promotional_claims pc
      JOIN users u ON pc.user_id = u.id
      WHERE u.wallet_address = $1
    `, [address.toLowerCase()]);

    const claimedIds = new Set(claimedResult.rows.map(r => r.reward_id));

    // Build rewards list based on user status
    const rewards: PromotionalReward[] = [
      {
        id: 'pioneer',
        name: 'Pioneer Badge',
        amount: 500,
        status: claimedIds.has('pioneer') ? 'claimed' : 
                (user?.is_pioneer ? 'claimable' : 'locked'),
      },
      {
        id: 'education1',
        name: 'Complete Profile',
        amount: 100,
        status: claimedIds.has('education1') ? 'claimed' :
                (user?.profile_complete ? 'claimable' : 'locked'),
      },
      {
        id: 'education2',
        name: 'First Vote',
        amount: 100,
        status: claimedIds.has('education2') ? 'claimed' :
                (user?.has_voted ? 'claimable' : 'locked'),
      },
      {
        id: 'education3',
        name: 'Guardian Setup',
        amount: 200,
        status: claimedIds.has('education3') ? 'claimed' :
                ((user?.guardian_count || 0) >= 2 ? 'claimable' : 'locked'),
        progress: Math.min(100, ((user?.guardian_count || 0) / 2) * 100),
      },
      {
        id: 'milestone1',
        name: '1,000 VFIDE Held',
        amount: 300,
        status: claimedIds.has('milestone1') ? 'claimed' :
                (parseFloat(user?.vfide_balance || '0') >= 1000 ? 'claimable' : 'locked'),
      },
    ];

    // Get budget info
    const budgetResult = await query<{ distributed: string }>(`
      SELECT COALESCE(SUM(amount), 0) as distributed
      FROM promotional_claims
    `);

    return NextResponse.json({
      rewards,
      budget: {
        distributed: parseInt(budgetResult.rows[0]?.distributed || '0'),
        total: 2000000,
      },
    });
  } catch (error) {
    console.error('[Promotional Rewards API] Error:', error);
    return NextResponse.json({
      rewards: [],
      budget: { distributed: 0, total: 2000000 },
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    const { rewardId } = await request.json();

    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }

    if (!rewardId) {
      return NextResponse.json({ error: 'Reward ID required' }, { status: 400 });
    }

    // Record the claim (actual token transfer happens on-chain)
    await query(`
      INSERT INTO promotional_claims (user_id, reward_id, amount, claimed_at)
      SELECT u.id, $2, $3, NOW()
      FROM users u
      WHERE u.wallet_address = $1
      ON CONFLICT (user_id, reward_id) DO NOTHING
    `, [address.toLowerCase(), rewardId, 100]); // Default amount, should match reward

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Promotional Rewards API] Claim error:', error);
    return NextResponse.json({ error: 'Failed to record claim' }, { status: 500 });
  }
}
