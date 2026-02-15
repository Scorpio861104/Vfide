import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth, isAdmin } from '@/lib/auth/middleware';
import { isAddress } from 'viem';

interface VoteRow {
  id: number;
  title: string | null;
  description: string | null;
  data: unknown;
  created_at: string;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const resolvedParams = await params;
    const address = resolvedParams?.address;

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Valid address required' }, { status: 400 });
    }

    if (!isAdmin(authResult.user) && authResult.user.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query<VoteRow>(
      `SELECT a.id, a.title, a.description, a.data, a.created_at
       FROM activities a
       JOIN users u ON a.user_id = u.id
       WHERE u.wallet_address = $1
         AND a.activity_type IN ('vote', 'governance_vote', 'dao_vote')
       ORDER BY a.created_at DESC
       LIMIT 50`,
      [address.toLowerCase()]
    );

    const votes = result.rows.map((row) => {
      const data: Record<string, unknown> = row.data && typeof row.data === 'object' && !Array.isArray(row.data) 
        ? (row.data as Record<string, unknown>) 
        : {};
      return {
        id: row.id,
        proposal: typeof data.proposal === 'string' ? data.proposal : (row.title ?? row.description ?? 'Governance vote'),
        date: row.created_at,
        points: typeof data.points === 'number' ? data.points : 5,
        claimed: typeof data.claimed === 'boolean' ? data.claimed : false,
      };
    });

    return NextResponse.json({ votes });
  } catch (error) {
    console.error('[Governance Votes GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
  }
}
