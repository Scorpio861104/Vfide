import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

type PrivacySettings = {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showActivities: boolean;
  showBadges: boolean;
  showStats: boolean;
  allowMessages: boolean;
};

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  profileVisibility: 'public',
  showEmail: true,
  showActivities: true,
  showBadges: true,
  showStats: true,
  allowMessages: true,
};

const mergeSettings = (
  current: PrivacySettings,
  updates?: Partial<PrivacySettings>
): PrivacySettings => {
  if (!updates) return current;
  return {
    ...current,
    ...updates,
  };
};

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
        { error: 'You can only access your own privacy settings' },
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT ups.settings FROM user_privacy_settings ups
       JOIN users u ON ups.user_id = u.id
       WHERE u.wallet_address = $1`,
      [userAddress.toLowerCase()]
    );

    if (result.rows.length === 0) {
      const insertResult = await query(
        `INSERT INTO user_privacy_settings (user_id, settings)
         SELECT id, $2::jsonb FROM users WHERE wallet_address = $1
         RETURNING settings`,
        [userAddress.toLowerCase(), JSON.stringify(DEFAULT_PRIVACY_SETTINGS)]
      );

      if (insertResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        settings: insertResult.rows[0]?.settings ?? DEFAULT_PRIVACY_SETTINGS,
      });
    }

    return NextResponse.json({
      success: true,
      settings: result.rows[0]?.settings ?? DEFAULT_PRIVACY_SETTINGS,
    });
  } catch (error) {
    console.error('[Privacy Settings GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch privacy settings' }, { status: 500 });
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
    const { userAddress, settings } = body as {
      userAddress?: string;
      settings?: Partial<PrivacySettings>;
    };

    if (!userAddress) {
      return NextResponse.json({ error: 'User address required' }, { status: 400 });
    }

    if (authResult.user.address.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'You can only update your own privacy settings' },
        { status: 403 }
      );
    }

    const existingResult = await query(
      `SELECT ups.settings FROM user_privacy_settings ups
       JOIN users u ON ups.user_id = u.id
       WHERE u.wallet_address = $1`,
      [userAddress.toLowerCase()]
    );

    const existing = existingResult.rows[0]?.settings as PrivacySettings | undefined;
    const merged = mergeSettings(existing ?? DEFAULT_PRIVACY_SETTINGS, settings);

    const result = await query(
      `INSERT INTO user_privacy_settings (user_id, settings, updated_at)
       SELECT id, $2::jsonb, NOW()
       FROM users WHERE wallet_address = $1
       ON CONFLICT (user_id) DO UPDATE
       SET settings = EXCLUDED.settings,
           updated_at = NOW()
       RETURNING settings`,
      [userAddress.toLowerCase(), JSON.stringify(merged)]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, settings: result.rows[0]?.settings ?? merged });
  } catch (error) {
    console.error('[Privacy Settings PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update privacy settings' }, { status: 500 });
  }
}
