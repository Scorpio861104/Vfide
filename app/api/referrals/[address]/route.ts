/**
 * Referrals API - Get referral stats and history for a user
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateAddress, checkRateLimit } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`referrals:${clientId}`, { maxRequests: 60, windowMs: 60000 });
    if (!rateLimit.success) {
      return rateLimit.errorResponse;
    }

    const { address } = await params;

    // Validate address
    const addressValidation = validateAddress(address);
    if (!addressValidation.valid) {
      return addressValidation.errorResponse;
    }

    // Get or create referral code
    const userResult = await query<{
      id: number;
      referral_code: string;
    }>(`
      SELECT id, referral_code
      FROM users
      WHERE wallet_address = $1
    `, [address.toLowerCase()]);

    const user = userResult.rows[0];
    const referralCode = user?.referral_code || `VFIDE-${address.slice(2, 8).toUpperCase()}`;

    // If user doesn't have a code, update it
    if (user && !user.referral_code) {
      await query(`
        UPDATE users SET referral_code = $1 WHERE id = $2
      `, [referralCode, user.id]);
    }

    // Get referral stats
    const statsResult = await query<{
      total_referrals: string;
      active_referrals: string;
      total_earned: string;
      unclaimed: string;
    }>(`
      SELECT 
        COUNT(*) as total_referrals,
        COUNT(*) FILTER (WHERE r.is_active = true) as active_referrals,
        COALESCE(SUM(r.reward_earned), 0) as total_earned,
        COALESCE(SUM(CASE WHEN r.reward_claimed = false THEN r.reward_earned ELSE 0 END), 0) as unclaimed
      FROM referrals r
      JOIN users u ON r.referrer_id = u.id
      WHERE u.wallet_address = $1
    `, [address.toLowerCase()]);

    const stats = statsResult.rows[0];

    // Get referral history
    const historyResult = await query<{
      id: number;
      referee_address: string;
      created_at: string;
      is_active: boolean;
      reward_earned: number;
      reward_claimed: boolean;
    }>(`
      SELECT 
        r.id,
        ru.wallet_address as referee_address,
        r.created_at,
        r.is_active,
        r.reward_earned,
        r.reward_claimed
      FROM referrals r
      JOIN users u ON r.referrer_id = u.id
      JOIN users ru ON r.referee_id = ru.id
      WHERE u.wallet_address = $1
      ORDER BY r.created_at DESC
      LIMIT 20
    `, [address.toLowerCase()]);

    return NextResponse.json({
      code: referralCode,
      totalReferrals: parseInt(stats?.total_referrals || '0'),
      activeReferrals: parseInt(stats?.active_referrals || '0'),
      earned: parseFloat(stats?.total_earned || '0'),
      claimable: parseFloat(stats?.unclaimed || '0'),
      history: historyResult.rows.map(row => ({
        id: row.id,
        address: `${row.referee_address.slice(0, 6)}...${row.referee_address.slice(-4)}`,
        date: new Date(row.created_at).toLocaleDateString(),
        active: row.is_active,
        earned: row.reward_earned,
        claimed: row.reward_claimed,
      })),
    });
  } catch (error) {
    apiLogger.error('Failed to fetch referrals', { error });
    // Return defaults with generated code
    const { address } = await params;
    return NextResponse.json({
      code: `VFIDE-${address.slice(2, 8).toUpperCase()}`,
      totalReferrals: 0,
      activeReferrals: 0,
      earned: 0,
      claimable: 0,
      history: [],
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    // Rate limiting
    const clientId = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimit = checkRateLimit(`referrals:post:${clientId}`, { maxRequests: 10, windowMs: 60000 });
    if (!rateLimit.success) {
      return rateLimit.errorResponse;
    }

    // Authentication required
    const auth = await requireAuth(request);
    if (!auth.authenticated) {
      return auth.errorResponse;
    }

    const { address } = await params;
    const { refereeAddress } = await request.json();

    // Validate referrer address
    const referrerValidation = validateAddress(address);
    if (!referrerValidation.valid) {
      return referrerValidation.errorResponse;
    }

    // Verify ownership
    if (auth.user?.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        { error: 'Cannot create referral for another user' },
        { status: 403 }
      );
    }

    // Validate referee address
    const refereeValidation = validateAddress(refereeAddress);
    if (!refereeValidation.valid) {
      return NextResponse.json(
        { error: 'Invalid referee address' },
        { status: 400 }
      );
    }

    // Create referral relationship
    await query(`
      INSERT INTO referrals (referrer_id, referee_id, created_at, is_active, reward_earned)
      SELECT 
        (SELECT id FROM users WHERE wallet_address = $1),
        (SELECT id FROM users WHERE wallet_address = $2),
        NOW(),
        false,
        50
      ON CONFLICT DO NOTHING
    `, [address.toLowerCase(), refereeAddress.toLowerCase()]);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error('Failed to create referral', { error });
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 });
  }
}
