import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

const timeStringSchema = z.string().regex(/^\d{2}:\d{2}$/);

const notificationPreferencesSchema = z.object({
  enableNotifications: z.boolean(),
  enableSound: z.boolean(),
  enableDesktop: z.boolean(),
  enableEmail: z.boolean(),
  transactionAlerts: z.boolean(),
  governanceAlerts: z.boolean(),
  merchantAlerts: z.boolean(),
  securityAlerts: z.boolean(),
  systemAlerts: z.boolean(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: timeStringSchema,
  quietHoursEnd: timeStringSchema,
});

const defaultPreferences = {
  enableNotifications: true,
  enableSound: true,
  enableDesktop: true,
  enableEmail: false,
  transactionAlerts: true,
  governanceAlerts: true,
  merchantAlerts: true,
  securityAlerts: true,
  systemAlerts: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export async function GET(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'read');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ preferences: defaultPreferences });
    }

    const result = await query<{ preferences: unknown }>(
      'SELECT preferences FROM notification_preferences WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      await query(
        `INSERT INTO notification_preferences (user_id, preferences, created_at, updated_at)
         VALUES ($1, $2, NOW(), NOW())`,
        [userId, JSON.stringify(defaultPreferences)]
      );
      return NextResponse.json({ preferences: defaultPreferences });
    }

    const stored = result.rows[0]?.preferences;
    const parsed = notificationPreferencesSchema.safeParse(stored);
    const preferences = parsed.success ? parsed.data : defaultPreferences;

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('[Notification Preferences GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const inputPreferences = body?.preferences ?? body;
    const validation = notificationPreferencesSchema.safeParse(inputPreferences);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid preferences', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const userResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const preferences = validation.data;

    await query(
      `INSERT INTO notification_preferences (user_id, preferences, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET preferences = $2, updated_at = NOW()`,
      [userId, JSON.stringify(preferences)]
    );

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error('[Notification Preferences PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
