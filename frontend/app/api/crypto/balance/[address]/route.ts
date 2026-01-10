import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest, { params }: { params: { address: string } }) {
  try {
    const { address } = params;

    const result = await query(
      `SELECT tb.* FROM token_balances tb
       JOIN users u ON tb.user_id = u.id
       WHERE u.wallet_address = $1`,
      [address.toLowerCase()]
    );

    return NextResponse.json({ balances: result.rows });
  } catch (error) {
    console.error('[Balance API] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch balances' }, { status: 500 });
  }
}
