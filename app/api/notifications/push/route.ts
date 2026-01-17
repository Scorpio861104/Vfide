import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { validateRequest, validateAddress, checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/services/logger.service';

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`notifications-push-post:${clientId}`, { maxRequests: 10, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body = await request.json();

    // Validation
    const addressValidation = validateAddress(body.userAddress);
    if (!addressValidation.valid) return addressValidation.errorResponse;

    const validation = validateRequest(body, {
      userAddress: { required: true, type: 'address' },
      subscription: { required: true, type: 'object' }
    });
    if (!validation.valid) return validation.errorResponse;

    const { userAddress, subscription } = body;

    const result = await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, keys, created_at)
       SELECT u.id, $2, $3, NOW()
       FROM users u
       WHERE u.wallet_address = $1
       ON CONFLICT (user_id, endpoint) DO UPDATE
       SET keys = $3
       RETURNING *`,
      [userAddress.toLowerCase(), subscription.endpoint, JSON.stringify(subscription.keys)]
    );

    return NextResponse.json({ success: true, subscription: result.rows[0] });
  } catch (error) {
    apiLogger.error('[Push Subscribe] Error', { error });
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`notifications-push-delete:${clientId}`, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body = await request.json();

    // Validation
    const addressValidation = validateAddress(body.userAddress);
    if (!addressValidation.valid) return addressValidation.errorResponse;

    const validation = validateRequest(body, {
      userAddress: { required: true, type: 'address' },
      endpoint: { required: true, type: 'string' }
    });
    if (!validation.valid) return validation.errorResponse;

    const { userAddress, endpoint } = body;

    await query(
      `DELETE FROM push_subscriptions ps
       USING users u
       WHERE ps.user_id = u.id AND u.wallet_address = $1 AND ps.endpoint = $2`,
      [userAddress.toLowerCase(), endpoint]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error('[Push Unsubscribe] Error', { error });
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 });
  }
}
