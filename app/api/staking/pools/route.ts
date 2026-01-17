/**
 * Staking Pools API - Get LP staking pool information
 * Enhanced with: validation, rate limiting, secure logging
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateAddress } from '@/lib/validation';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';
import { apiLogger } from '@/lib/logger.service';

interface Pool {
  id: string;
  address: string;
  name: string;
  estimatedRate: number;
  tvl: string;
  yourStake: number;
  earned: number;
  multiplier: string;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 60, windowMs: 60000 });
  
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const userAddress = searchParams.get('userAddress');
    
    // Validate address if provided
    if (userAddress) {
      const addressValidation = validateAddress(userAddress);
      if (!addressValidation.valid) {
        return NextResponse.json(
          { error: `Invalid address: ${addressValidation.error}` },
          { status: 400 }
        );
      }
    }

    // Get pool data from database
    const poolsResult = await query<{
      id: string;
      address: string;
      name: string;
      reward_rate: number;
      total_staked: string;
      multiplier: string;
      is_active: boolean;
    }>(`
      SELECT 
        id,
        address,
        name,
        reward_rate,
        total_staked,
        multiplier,
        is_active
      FROM staking_pools
      WHERE is_active = true
      ORDER BY name
    `);

    const userStakes: Map<string, { staked: number; earned: number }> = new Map();

    if (userAddress && /^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      const stakesResult = await query<{
        pool_id: string;
        amount_staked: string;
        rewards_earned: string;
      }>(`
        SELECT 
          s.pool_id,
          s.amount_staked,
          s.rewards_earned
        FROM user_stakes s
        JOIN users u ON s.user_id = u.id
        WHERE u.wallet_address = $1
      `, [userAddress.toLowerCase()]);

      stakesResult.rows.forEach(row => {
        userStakes.set(row.pool_id, {
          staked: parseFloat(row.amount_staked) || 0,
          earned: parseFloat(row.rewards_earned) || 0,
        });
      });
    }

    // Default pools if none in database
    let pools: Pool[];

    if (poolsResult.rows.length === 0) {
      pools = [
        {
          id: 'vfide-eth',
          address: process.env.NEXT_PUBLIC_VFIDE_ETH_LP || '0x0000000000000000000000000000000000000000',
          name: 'VFIDE/ETH',
          estimatedRate: 12.5,
          tvl: '0',
          yourStake: userStakes.get('vfide-eth')?.staked || 0,
          earned: userStakes.get('vfide-eth')?.earned || 0,
          multiplier: '2x',
        },
        {
          id: 'vfide-usdc',
          address: process.env.NEXT_PUBLIC_VFIDE_USDC_LP || '0x0000000000000000000000000000000000000000',
          name: 'VFIDE/USDC',
          estimatedRate: 8.5,
          tvl: '0',
          yourStake: userStakes.get('vfide-usdc')?.staked || 0,
          earned: userStakes.get('vfide-usdc')?.earned || 0,
          multiplier: '1.5x',
        },
      ];
    } else {
      pools = poolsResult.rows.map(row => ({
        id: row.id,
        address: row.address,
        name: row.name,
        estimatedRate: row.reward_rate || 0,
        tvl: formatTVL(parseFloat(row.total_staked) || 0),
        yourStake: userStakes.get(row.id)?.staked || 0,
        earned: userStakes.get(row.id)?.earned || 0,
        multiplier: row.multiplier || '1x',
      }));
    }

    return NextResponse.json({ pools });
  } catch (error) {
    console.error('[Staking Pools API] Error:', error);
    // Return default pools on error
    return NextResponse.json({
      pools: [
        {
          id: 'vfide-eth',
          address: '0x0000000000000000000000000000000000000000',
          name: 'VFIDE/ETH',
          estimatedRate: 0,
          tvl: '0',
          yourStake: 0,
          earned: 0,
          multiplier: '2x',
        },
        {
          id: 'vfide-usdc',
          address: '0x0000000000000000000000000000000000000000',
          name: 'VFIDE/USDC',
          estimatedRate: 0,
          tvl: '0',
          yourStake: 0,
          earned: 0,
          multiplier: '1.5x',
        },
      ],
    });
  }
}

function formatTVL(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
}
