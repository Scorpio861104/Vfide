import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, validateAddress } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  role: string;
  joined_at: string;
  user_address?: string;
  username?: string;
  avatar_url?: string;
}

export async function GET(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`group-members:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userAddress = searchParams.get('userAddress');

    if (userAddress) {
      const addressValidation = validateAddress(userAddress);
      if (!addressValidation.valid) return addressValidation.errorResponse;
    }

    if (groupId && userAddress) {
      const result = await query<GroupMember>(
        `SELECT gm.*, u.wallet_address as user_address, u.username, u.avatar_url
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND u.wallet_address = $2`,
        [groupId, userAddress.toLowerCase()]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, member: result.rows[0] });
    }

    if (groupId) {
      const result = await query<GroupMember>(
        `SELECT gm.*, u.wallet_address as user_address, u.username, u.avatar_url, u.proof_score
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1
         ORDER BY gm.role DESC, gm.joined_at ASC`,
        [groupId]
      );

      return NextResponse.json({ success: true, members: result.rows, total: result.rows.length });
    }

    return NextResponse.json({ success: false, error: 'groupId required' }, { status: 400 });
  } catch (error) {
    apiLogger.error('Failed to fetch group members', { error });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`group-members-post:${clientId}`, { maxRequests: 10, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body = await request.json();
    const { groupId, userAddress, role = 'member', actorAddress } = body;

    if (!groupId || !userAddress) {
      return NextResponse.json({ success: false, error: 'groupId and userAddress required' }, { status: 400 });
    }

    const addressValidation = validateAddress(userAddress);
    if (!addressValidation.valid) return addressValidation.errorResponse;

    if (actorAddress) {
      const actorResult = await query(
        `SELECT gm.role FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND u.wallet_address = $2`,
        [groupId, actorAddress.toLowerCase()]
      );
      
      if (actorResult.rows.length === 0 || !['admin', 'moderator'].includes(actorResult.rows[0].role)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
    }

    const userResult = await query('SELECT id FROM users WHERE wallet_address = $1', [userAddress.toLowerCase()]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const result = await query<GroupMember>(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [groupId, userResult.rows[0].id, role]
    );
    
    await query('UPDATE groups SET member_count = member_count + 1 WHERE id = $1', [groupId]);

    return NextResponse.json({ success: true, member: result.rows[0] }, { status: 201 });
  } catch (error) {
    apiLogger.error('Failed to add group member', { error });
    return NextResponse.json({ success: false, error: 'Failed to add member' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`group-members-patch:${clientId}`, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body = await request.json();
    const { groupId, userAddress, role, actorAddress } = body;

    if (!groupId || !userAddress || !role || !actorAddress) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const addressValidation = validateAddress(userAddress);
    if (!addressValidation.valid) return addressValidation.errorResponse;

    const actorResult = await query(
      `SELECT gm.role FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND u.wallet_address = $2`,
      [groupId, actorAddress.toLowerCase()]
    );

    if (actorResult.rows.length === 0 || !['admin', 'moderator'].includes(actorResult.rows[0].role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const result = await query(
      `UPDATE group_members gm
       SET role = $3
       FROM users u
       WHERE gm.user_id = u.id AND gm.group_id = $1 AND u.wallet_address = $2
       RETURNING gm.*`,
      [groupId, userAddress.toLowerCase(), role]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, member: result.rows[0] });
  } catch (error) {
    apiLogger.error('Failed to update group member', { error });
    return NextResponse.json({ success: false, error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`group-members-delete:${clientId}`, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userAddress = searchParams.get('userAddress');

    if (!groupId || !userAddress) {
      return NextResponse.json({ success: false, error: 'Missing groupId or userAddress' }, { status: 400 });
    }

    const addressValidation = validateAddress(userAddress);
    if (!addressValidation.valid) return addressValidation.errorResponse;

    const result = await query(
      `DELETE FROM group_members gm
       USING users u
       WHERE gm.user_id = u.id AND gm.group_id = $1 AND u.wallet_address = $2`,
      [groupId, userAddress.toLowerCase()]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    await query('UPDATE groups SET member_count = member_count - 1 WHERE id = $1', [groupId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    apiLogger.error('Failed to remove group member', { error });
    return NextResponse.json({ success: false, error: 'Failed to remove member' }, { status: 500 });
  }
}
