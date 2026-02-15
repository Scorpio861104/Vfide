import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

interface GroupMember {
  id: number;
  group_id: number;
  user_id: number;
  role: string;
  joined_at: string;
  custom_permissions?: string[];
  banned_permissions?: string[];
  user_address?: string;
  username?: string;
  avatar_url?: string;
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userAddress = searchParams.get('userAddress');

    const authAddress = authResult.user.address.toLowerCase();

    if (groupId) {
      const memberCheck = await query(
        `SELECT gm.id FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND u.wallet_address = $2`,
        [groupId, authAddress]
      );

      if (memberCheck.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
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
    console.error('[Group Members GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { groupId, userAddress, role = 'member', customPermissions, bannedPermissions } = body;

    if (!groupId || !userAddress) {
      return NextResponse.json({ success: false, error: 'groupId and userAddress required' }, { status: 400 });
    }

    const actorAddress = authResult.user.address;
    if (actorAddress.toLowerCase() !== userAddress.toLowerCase()) {
      const actorResult = await query(
        `SELECT gm.role FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND u.wallet_address = $2`,
        [groupId, actorAddress.toLowerCase()]
      );

      const actor = actorResult.rows[0];
      if (actorResult.rows.length === 0 || !actor || !['owner', 'admin', 'moderator'].includes(actor.role)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
    }

    const userResult = await query('SELECT id FROM users WHERE wallet_address = $1', [userAddress.toLowerCase()]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userIdVal = userResult.rows[0]?.id;
    if (!userIdVal) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const result = await query<GroupMember>(
      `INSERT INTO group_members (group_id, user_id, role, custom_permissions, banned_permissions)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        groupId,
        userIdVal,
        role,
        customPermissions ? JSON.stringify(customPermissions) : null,
        bannedPermissions ? JSON.stringify(bannedPermissions) : null,
      ]
    );
    
    await query('UPDATE groups SET member_count = member_count + 1 WHERE id = $1', [groupId]);

    return NextResponse.json({ success: true, member: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[Group Members POST] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add member' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await request.json();
    const { groupId, userAddress, role, action, customPermissions, bannedPermissions } = body;

    if (!groupId || !userAddress) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const actorAddress = authResult.user.address;
    const actorResult = await query(
      `SELECT gm.role FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND u.wallet_address = $2`,
      [groupId, actorAddress.toLowerCase()]
    );

    const actor = actorResult.rows[0];
    if (actorResult.rows.length === 0 || !actor || !['owner', 'admin', 'moderator'].includes(actor.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    let result;

    if (action === 'update_permissions') {
      result = await query(
        `UPDATE group_members gm
         SET custom_permissions = COALESCE($3::jsonb, gm.custom_permissions),
             banned_permissions = COALESCE($4::jsonb, gm.banned_permissions)
         FROM users u
         WHERE gm.user_id = u.id AND gm.group_id = $1 AND u.wallet_address = $2
         RETURNING gm.*`,
        [
          groupId,
          userAddress.toLowerCase(),
          customPermissions ? JSON.stringify(customPermissions) : null,
          bannedPermissions ? JSON.stringify(bannedPermissions) : null,
        ]
      );
    } else {
      if (!role) {
        return NextResponse.json({ success: false, error: 'Role required' }, { status: 400 });
      }

      // Enforce role hierarchy: only owners can set admin/owner roles
      const ROLE_HIERARCHY: Record<string, number> = { member: 0, moderator: 1, admin: 2, owner: 3 };
      const actorLevel = ROLE_HIERARCHY[actor.role] ?? 0;
      const targetLevel = ROLE_HIERARCHY[role] ?? 0;
      if (targetLevel >= actorLevel) {
        return NextResponse.json({ success: false, error: 'Cannot assign role equal to or above your own' }, { status: 403 });
      }

      result = await query(
        `UPDATE group_members gm
         SET role = $3
         FROM users u
         WHERE gm.user_id = u.id AND gm.group_id = $1 AND u.wallet_address = $2
         RETURNING gm.*`,
        [groupId, userAddress.toLowerCase(), role]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, member: result.rows[0] });
  } catch (error) {
    console.error('[Group Members PATCH] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update member' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimitDelete = await withRateLimit(request, 'write');
  if (rateLimitDelete) return rateLimitDelete;

  // Authentication
  const authResultDelete = await requireAuth(request);
  if (authResultDelete instanceof NextResponse) return authResultDelete;

  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userAddress = searchParams.get('userAddress');

    if (!groupId || !userAddress) {
      return NextResponse.json({ success: false, error: 'Missing groupId or userAddress' }, { status: 400 });
    }

    const actorAddress = authResultDelete.user.address;
    if (actorAddress.toLowerCase() !== userAddress.toLowerCase()) {
      const actorResult = await query(
        `SELECT gm.role FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND u.wallet_address = $2`,
        [groupId, actorAddress.toLowerCase()]
      );

      const actor = actorResult.rows[0];
      if (actorResult.rows.length === 0 || !actor || !['owner', 'admin', 'moderator'].includes(actor.role)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }
    }

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
    console.error('[Group Members DELETE] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove member' }, { status: 500 });
  }
}
