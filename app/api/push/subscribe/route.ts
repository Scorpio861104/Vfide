import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const subscription = await request.json();
    const { endpoint, keys } = subscription;
    if (!endpoint) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });

    await query(
      `INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = $2, auth = $3`,
      [endpoint, keys?.p256dh || '', keys?.auth || '']
    ).catch(() => {}); // Graceful failure if table doesn't exist yet

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
