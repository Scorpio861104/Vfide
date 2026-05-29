/**
 * /api/social/payment-stats/[userAddress]
 * GET — return aggregated social payment stats for a wallet address.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userAddress: string }> }
) {
  const { userAddress } = await params;

  if (!userAddress || !/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  // Testnet: return empty stats shape — frontend handles zero state gracefully.
  const stats = {
    totalTipsReceived: '0',
    totalTipsSent: '0',
    contentSales: 0,
    topTippers: [],
    recentActivity: [],
  };

  return NextResponse.json(stats);
}
