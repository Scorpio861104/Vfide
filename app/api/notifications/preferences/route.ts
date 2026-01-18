import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { validateAddress, checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/services/logger.service';

export async function GET(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`notifications-preferences-get:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    // Validation
    const addressValidation = validateAddress(userAddress);
    if (!addressValidation.valid) return addressValidation.errorResponse;

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
    apiLogger.error('[Notification Preferences GET] Error', { error });
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`notifications-preferences-put:${clientId}`, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body = await request.json();
    const { userAddress, ...preferences } = body;

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    // Validation
    const addressValidation = validateAddress(userAddress);
    if (!addressValidation.valid) return addressValidation.errorResponse;

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
    apiLogger.error('[Notification Preferences PUT] Error', { error });
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
