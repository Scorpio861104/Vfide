import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const result = await query(
      `SELECT * FROM sync_state WHERE user_id = $1`,
      [userId]
    );

    return NextResponse.json({ syncState: result.rows[0] || null });
  } catch (error) {
    console.error('[Sync GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch sync state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, entity, lastSyncTimestamp } = body;

    if (!userId || !entity) {
      return NextResponse.json({ error: 'userId and entity required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO sync_state (user_id, entity, last_sync_timestamp)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, entity) DO UPDATE
       SET last_sync_timestamp = $3
       RETURNING *`,
      [userId, entity, lastSyncTimestamp || new Date()]
    );

    return NextResponse.json({ success: true, syncState: result.rows[0] });
  } catch (error) {
    console.error('[Sync POST] Error:', error);
    return NextResponse.json({ error: 'Failed to update sync state' }, { status: 500 });
  }
}
