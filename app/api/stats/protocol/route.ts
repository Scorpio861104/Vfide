import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Aggregate stats from database
    const [users, merchants, transactions] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count FROM merchants WHERE active = true').catch(() => ({ rows: [{ count: 0 }] })),
      query('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as volume FROM transactions').catch(() => ({ rows: [{ count: 0, volume: '0' }] })),
    ]);

    return NextResponse.json({
      totalUsers: Number(users.rows[0]?.count || 0),
      totalMerchants: Number(merchants.rows[0]?.count || 0),
      totalTransactions: Number(transactions.rows[0]?.count || 0),
      totalVolume: transactions.rows[0]?.volume || '0',
      totalBurned: '0',
      totalDonated: '0',
      averageProofScore: 5000,
      activeLenders: 0,
      activeLoans: 0,
      defaultRate: 0,
    });
  } catch {
    // Return seed stats on DB failure (pre-launch)
    return NextResponse.json({
      totalUsers: 0, totalMerchants: 0, totalTransactions: 0,
      totalVolume: '0', totalBurned: '0', totalDonated: '0',
      averageProofScore: 5000, activeLenders: 0, activeLoans: 0, defaultRate: 0,
    });
  }
}
