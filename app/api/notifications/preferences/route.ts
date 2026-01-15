import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { checkRateLimit, getClientIdentifier, getRateLimitHeaders } from '@/lib/rateLimit';

export async function GET(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const result = await query(
      `SELECT np.* FROM notification_preferences np
       JOIN users u ON np.user_id = u.id
       WHERE u.wallet_address = $1`,
      [userAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      const insertResult = await query(
        `INSERT INTO notification_preferences (user_id, messages, proposals, endorsements, system_updates)
         SELECT id, true, true, true, true FROM users WHERE wallet_address = $1 RETURNING *`,
        [userAddress.toLowerCase()]
      );
      return NextResponse.json({ preferences: insertResult.rows[0] });
    }

    return NextResponse.json({ preferences: result.rows[0] });
  } catch (error) {
    console.error('[Notification Preferences GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  const rateLimit = checkRateLimit(clientId, { maxRequests: 30, windowMs: 60000 });

  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();
    const { userAddress, ...preferences } = body;

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    const result = await query(
      `UPDATE notification_preferences np
       SET messages = COALESCE($2, messages),
           proposals = COALESCE($3, proposals),
           endorsements = COALESCE($4, endorsements),
           system_updates = COALESCE($5, system_updates)
       FROM users u
       WHERE np.user_id = u.id AND u.wallet_address = $1
       RETURNING np.*`,
      [userAddress.toLowerCase(), preferences.messages, preferences.proposals, preferences.endorsements, preferences.system_updates]
    );

    return NextResponse.json({ success: true, preferences: result.rows[0] });
  } catch (error) {
    console.error('[Notification Preferences PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
