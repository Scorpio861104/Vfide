/**
 * Governance Votes API - Get voting history for a user
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface Vote {
  id: number;
  proposal: string;
  date: string;
  points: number;
  claimed: boolean;
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

    // Get user's voting history from database
    const result = await query<{
      id: number;
      proposal_id: number;
      proposal_title: string;
      voted_at: string;
      points_earned: number;
      claimed: boolean;
    }>(`
      SELECT 
        v.id,
        v.proposal_id,
        p.title as proposal_title,
        v.voted_at,
        v.points_earned,
        v.claimed
      FROM governance_votes v
      JOIN users u ON v.user_id = u.id
      LEFT JOIN governance_proposals p ON v.proposal_id = p.id
      WHERE u.wallet_address = $1
      ORDER BY v.voted_at DESC
      LIMIT 50
    `, [address.toLowerCase()]);

    const votes: Vote[] = result.rows.map(row => ({
      id: row.id,
      proposal: row.proposal_title || `Proposal #${row.proposal_id}`,
      date: new Date(row.voted_at).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      points: row.points_earned || 10,
      claimed: row.claimed,
    }));

    // Get total points and claimed amount
    const statsResult = await query<{ total_points: string; total_claimed: string }>(`
      SELECT 
        COALESCE(SUM(points_earned), 0) as total_points,
        COALESCE(SUM(CASE WHEN claimed THEN points_earned ELSE 0 END), 0) as total_claimed
      FROM governance_votes v
      JOIN users u ON v.user_id = u.id
      WHERE u.wallet_address = $1
    `, [address.toLowerCase()]);

    return NextResponse.json({
      votes,
      totalPoints: parseInt(statsResult.rows[0]?.total_points || '0'),
      totalClaimed: parseInt(statsResult.rows[0]?.total_claimed || '0'),
    });
  } catch (error) {
    console.error('[Governance Votes API] Error:', error);
    return NextResponse.json({ votes: [], totalPoints: 0, totalClaimed: 0 });
  }
}
