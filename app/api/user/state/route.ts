import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address');
  if (!address) return NextResponse.json({ error: 'address required' }, { status: 400 });

  try {
    const [user, merchant, loans] = await Promise.all([
      query('SELECT proof_score, badges FROM users WHERE address = $1', [address.toLowerCase()]).catch(() => ({ rows: [] })),
      query('SELECT id FROM merchants WHERE owner_address = $1 AND active = true', [address.toLowerCase()]).catch(() => ({ rows: [] })),
      query('SELECT COUNT(*) as count FROM loans WHERE borrower_address = $1 AND status = $2', [address.toLowerCase(), 'active']).catch(() => ({ rows: [{ count: 0 }] })),
    ]);

    return NextResponse.json({
      address,
      proofScore: Number(user.rows[0]?.proof_score || 5000),
      isMerchant: (merchant.rows?.length || 0) > 0,
      badges: user.rows[0]?.badges || [],
      activeLoanCount: Number(loans.rows[0]?.count || 0),
      unresolvedDefaults: 0,
    });
  } catch {
    return NextResponse.json({ address, proofScore: 5000, isMerchant: false, badges: [], activeLoanCount: 0, unresolvedDefaults: 0 });
  }
}
