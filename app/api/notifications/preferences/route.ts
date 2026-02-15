import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

type NotificationPreferences = {
  enabled: boolean;
  types: Record<string, boolean>;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
};

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  types: {
    message: true,
    mention: true,
    reaction: true,
    group_invite: true,
    badge_earned: true,
    announcement: true,
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
};

const mergePreferences = (
  current: NotificationPreferences,
  updates?: Partial<NotificationPreferences>
): NotificationPreferences => {
  if (!updates) return current;

  return {
    ...current,
    ...updates,
    types: {
      ...current.types,
      ...(updates.types ?? {}),
    },
    quietHours: {
      ...current.quietHours,
      ...(updates.quietHours ?? {}),
    },
  };
};

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const authUser = authResult.user;

  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('userAddress');

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    if (authUser && authUser.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only access your own preferences' },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT np.preferences FROM notification_preferences np
       JOIN users u ON np.user_id = u.id
       WHERE u.wallet_address = $1`,
      [userAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      const insertResult = await query(
        `INSERT INTO notification_preferences (user_id, preferences)
         SELECT id, $2::jsonb FROM users WHERE wallet_address = $1
         RETURNING preferences`,
        [userAddress.toLowerCase(), JSON.stringify(DEFAULT_PREFERENCES)]
      );

      if (insertResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        preferences: insertResult.rows[0]?.preferences ?? DEFAULT_PREFERENCES,
      });
    }

    return NextResponse.json({
      success: true,
      preferences: result.rows[0]?.preferences ?? DEFAULT_PREFERENCES,
    });
  } catch (error) {
    console.error('[Notification Preferences GET] Error:', error);
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
  const authUser = authResult.user;

  try {
    const body = await request.json();
    const { userAddress, ...updates } = body as {
      userAddress?: string;
    } & Partial<NotificationPreferences>;

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    if (authUser && authUser.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only update your own preferences' },
        { status: 403 }
      );
    }

    const existingResult = await query(
      `SELECT np.preferences FROM notification_preferences np
       JOIN users u ON np.user_id = u.id
       WHERE u.wallet_address = $1`,
      [userAddress.toLowerCase()]
    );

    const existing = existingResult.rows[0]?.preferences as NotificationPreferences | undefined;
    const merged = mergePreferences(existing ?? DEFAULT_PREFERENCES, updates);

    const result = await query(
      `INSERT INTO notification_preferences (user_id, preferences, updated_at)
       SELECT id, $2::jsonb, NOW()
       FROM users WHERE wallet_address = $1
       ON CONFLICT (user_id) DO UPDATE
       SET preferences = EXCLUDED.preferences,
           updated_at = NOW()
       RETURNING preferences`,
      [userAddress.toLowerCase(), JSON.stringify(merged)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      preferences: result.rows[0]?.preferences ?? merged,
    });
  } catch (error) {
    console.error('[Notification Preferences PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
