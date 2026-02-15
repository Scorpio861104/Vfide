import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreference,
  NotificationType,
} from '@/config/notification-hub';

type HubPreferences = Record<NotificationType, NotificationPreference>;

const getDefaultPreferences = (): HubPreferences => DEFAULT_NOTIFICATION_PREFERENCES;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only access your own preferences' },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT nhp.preferences FROM notification_hub_preferences nhp
       JOIN users u ON nhp.user_id = u.id
       WHERE u.wallet_address = $1`,
      [userAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      const defaults = getDefaultPreferences();
      const insertResult = await query(
        `INSERT INTO notification_hub_preferences (user_id, preferences)
         SELECT id, $2::jsonb FROM users WHERE wallet_address = $1
         RETURNING preferences`,
        [userAddress.toLowerCase(), JSON.stringify(defaults)]
      );

      if (insertResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        preferences: insertResult.rows[0]?.preferences ?? defaults,
      });
    }

    return NextResponse.json({
      success: true,
      preferences: result.rows[0]?.preferences ?? getDefaultPreferences(),
    });
  } catch (error) {
    console.error('[Notification Hub Preferences GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { userAddress, preferences } = body as {
      userAddress?: string;
      preferences?: HubPreferences;
    };

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only update your own preferences' },
        { status: 403 }
      );
    }

    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json({ error: 'Preferences payload required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO notification_hub_preferences (user_id, preferences, updated_at)
       SELECT id, $2::jsonb, NOW()
       FROM users WHERE wallet_address = $1
       ON CONFLICT (user_id) DO UPDATE
       SET preferences = EXCLUDED.preferences,
           updated_at = NOW()
       RETURNING preferences`,
      [userAddress.toLowerCase(), JSON.stringify(preferences)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: result.rows[0]?.preferences ?? preferences,
    });
  } catch (error) {
    console.error('[Notification Hub Preferences PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
