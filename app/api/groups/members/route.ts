import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { logger } from '@/lib/logger';

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

const VALID_GROUP_MEMBER_ROLES = ['member', 'moderator', 'admin'] as const;
const GROUP_ID_REGEX = /^\d+$/;

const ROLE_RANK: Record<string, number> = {
  member: 1,
  moderator: 2,
  admin: 3,
  owner: 4,
};

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

function getRoleRank(role: string | null | undefined): number {
  if (!role) return 0;
  return ROLE_RANK[role.toLowerCase()] ?? 0;
}

function canAssignRole(actorRole: string, desiredRole: string): boolean {
  const normalizedActorRole = actorRole.toLowerCase();
  const normalizedDesiredRole = desiredRole.toLowerCase();

  if (normalizedActorRole === 'owner') {
    return ['admin', 'moderator', 'member'].includes(normalizedDesiredRole);
  }

  if (normalizedActorRole === 'admin') {
    return ['moderator', 'member'].includes(normalizedDesiredRole);
  }

  if (normalizedActorRole === 'moderator') {
    return normalizedDesiredRole === 'member';
  }

  return false;
}

function canManageTarget(actorRole: string, targetRole: string): boolean {
  return getRoleRank(actorRole) > getRoleRank(targetRole);
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userAddress = searchParams.get('userAddress');

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'groupId required' }, { status: 400 });
    }

    if (!GROUP_ID_REGEX.test(groupId)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId format' }, { status: 400 });
    }

    const requesterMembershipResult = await query<{ role: string }>(
      `SELECT gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND u.wallet_address = $2`,
      [groupId, authenticatedAddress]
    );

    const requesterMembership = requesterMembershipResult.rows[0];
    if (!requesterMembership) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    if (groupId && userAddress) {
      if (!isAddress(userAddress)) {
        return NextResponse.json({ success: false, error: 'Invalid userAddress format' }, { status: 400 });
      }

      const normalizedUserAddress = normalizeAddress(userAddress);
      const canReadTargetMember =
        normalizedUserAddress === authenticatedAddress || ['admin', 'moderator'].includes(requesterMembership.role);
      if (!canReadTargetMember) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }

      const result = await query<GroupMember>(
        `SELECT gm.*, u.wallet_address as user_address, u.username, u.avatar_url
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND u.wallet_address = $2`,
        [groupId, normalizedUserAddress]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true, member: result.rows[0] });
    }

    const result = await query<GroupMember>(
      `SELECT gm.*, u.wallet_address as user_address, u.username, u.avatar_url
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.role DESC, gm.joined_at ASC`,
      [groupId]
    );

    return NextResponse.json({ success: true, members: result.rows, total: result.rows.length });
  } catch (error) {
    logger.error('[Group Members GET] Error:', error);
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!isObjectRecord(body)) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const { groupId, userAddress, role = 'member', actorAddress } = body;
    const authenticatedAddress = typeof authResult.user?.address === 'string'
      ? authResult.user.address.trim().toLowerCase()
      : '';
    if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!groupId || !userAddress) {
      return NextResponse.json({ success: false, error: 'groupId and userAddress required' }, { status: 400 });
    }

    const groupIdValue =
      typeof groupId === 'number' || typeof groupId === 'string' ? groupId.toString() : null;
    const userAddressValue = typeof userAddress === 'string' ? userAddress : null;
    const roleValue = typeof role === 'string' ? role : null;
    const actorAddressValue = typeof actorAddress === 'string' ? actorAddress : null;

    if (!groupIdValue || !userAddressValue || !roleValue) {
      return NextResponse.json({ success: false, error: 'Invalid groupId, userAddress, or role type' }, { status: 400 });
    }

    if (!GROUP_ID_REGEX.test(groupIdValue)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId format' }, { status: 400 });
    }

    if (!isAddress(userAddressValue)) {
      return NextResponse.json({ success: false, error: 'Invalid userAddress format' }, { status: 400 });
    }

    if (!VALID_GROUP_MEMBER_ROLES.includes(roleValue as (typeof VALID_GROUP_MEMBER_ROLES)[number])) {
      return NextResponse.json({ success: false, error: 'Invalid role value' }, { status: 400 });
    }

    if (actorAddressValue && actorAddressValue.toLowerCase() !== authenticatedAddress) {
      return NextResponse.json({ success: false, error: 'Unauthorized actor' }, { status: 403 });
    }

    const actorResult = await query(
      `SELECT gm.role FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND u.wallet_address = $2`,
      [groupIdValue, authenticatedAddress]
    );

    const actor = actorResult.rows[0];
    if (actorResult.rows.length === 0 || !actor || !['admin', 'moderator'].includes(actor.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    if (!canAssignRole(actor.role, roleValue)) {
      return NextResponse.json({ success: false, error: 'Insufficient role to assign requested role' }, { status: 403 });
    }

    const userResult = await query('SELECT id FROM users WHERE wallet_address = $1', [userAddressValue.toLowerCase()]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userIdVal = userResult.rows[0]?.id;
    if (!userIdVal) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const existingMembershipResult = await query(
      'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupIdValue, userIdVal]
    );

    if (existingMembershipResult.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'User is already a group member' }, { status: 409 });
    }

    const result = await query<GroupMember>(
      'INSERT INTO group_members (group_id, user_id, role) VALUES ($1, $2, $3) RETURNING *',
      [groupIdValue, userIdVal, roleValue]
    );
    
    await query('UPDATE groups SET member_count = member_count + 1 WHERE id = $1', [groupIdValue]);

    return NextResponse.json({ success: true, member: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Group Members POST] Error:', error);
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!isObjectRecord(body)) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const { groupId, userAddress, role, actorAddress } = body;
    const authenticatedAddress = typeof authResult.user?.address === 'string'
      ? authResult.user.address.trim().toLowerCase()
      : '';
    if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!groupId || !userAddress || !role) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const groupIdValue =
      typeof groupId === 'number' || typeof groupId === 'string' ? groupId.toString() : null;
    const userAddressValue = typeof userAddress === 'string' ? userAddress : null;
    const roleValue = typeof role === 'string' ? role : null;
    const actorAddressValue = typeof actorAddress === 'string' ? actorAddress : null;

    if (!groupIdValue || !userAddressValue || !roleValue) {
      return NextResponse.json({ success: false, error: 'Invalid groupId, userAddress, role, or actorAddress type' }, { status: 400 });
    }

    if (!GROUP_ID_REGEX.test(groupIdValue)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId format' }, { status: 400 });
    }

    if (!isAddress(userAddressValue) || (actorAddressValue !== null && !isAddress(actorAddressValue))) {
      return NextResponse.json({ success: false, error: 'Invalid address format' }, { status: 400 });
    }

    if (!VALID_GROUP_MEMBER_ROLES.includes(roleValue as (typeof VALID_GROUP_MEMBER_ROLES)[number])) {
      return NextResponse.json({ success: false, error: 'Invalid role value' }, { status: 400 });
    }

    if (actorAddressValue && actorAddressValue.toLowerCase() !== authenticatedAddress) {
      return NextResponse.json({ success: false, error: 'Unauthorized actor' }, { status: 403 });
    }

    const actorResult = await query(
      `SELECT gm.role FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND u.wallet_address = $2`,
      [groupIdValue, authenticatedAddress]
    );

    const actor = actorResult.rows[0];
    if (actorResult.rows.length === 0 || !actor || !['admin', 'moderator'].includes(actor.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const targetResult = await query<{ role: string }>(
      `SELECT gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND u.wallet_address = $2`,
      [groupIdValue, userAddressValue.toLowerCase()]
    );

    const target = targetResult.rows[0];
    if (!target) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    if (userAddressValue.toLowerCase() === authenticatedAddress) {
      return NextResponse.json({ success: false, error: 'You cannot change your own role' }, { status: 403 });
    }

    if (!canManageTarget(actor.role, target.role)) {
      return NextResponse.json({ success: false, error: 'Insufficient role to manage target member' }, { status: 403 });
    }

    if (!canAssignRole(actor.role, roleValue)) {
      return NextResponse.json({ success: false, error: 'Insufficient role to assign requested role' }, { status: 403 });
    }

    const result = await query(
      `UPDATE group_members gm
       SET role = $3
       FROM users u
       WHERE gm.user_id = u.id AND gm.group_id = $1 AND u.wallet_address = $2
       RETURNING gm.*`,
      [groupIdValue, userAddressValue.toLowerCase(), roleValue]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, member: result.rows[0] });
  } catch (error) {
    logger.error('[Group Members PATCH] Error:', error);
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
    const actorAddress = searchParams.get('actorAddress');
    const authenticatedAddress = typeof authResultDelete.user?.address === 'string'
      ? authResultDelete.user.address.trim().toLowerCase()
      : '';
    if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!groupId || !userAddress) {
      return NextResponse.json({ success: false, error: 'Missing groupId or userAddress' }, { status: 400 });
    }

    if (!GROUP_ID_REGEX.test(groupId)) {
      return NextResponse.json({ success: false, error: 'Invalid groupId format' }, { status: 400 });
    }

    if (!isAddress(userAddress)) {
      return NextResponse.json({ success: false, error: 'Invalid userAddress format' }, { status: 400 });
    }

    if (actorAddress) {
      if (!isAddress(actorAddress)) {
        return NextResponse.json({ success: false, error: 'Invalid actorAddress format' }, { status: 400 });
      }
      if (actorAddress.toLowerCase() !== authenticatedAddress) {
        return NextResponse.json({ success: false, error: 'Unauthorized actor' }, { status: 403 });
      }
    }

    const targetAddress = userAddress.toLowerCase();
    const isSelfRemoval = targetAddress === authenticatedAddress;

    if (!isSelfRemoval) {
      const actorResult = await query<{ role: string }>(
        `SELECT gm.role FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND u.wallet_address = $2`,
        [groupId, authenticatedAddress]
      );

      const actor = actorResult.rows[0];
      if (actorResult.rows.length === 0 || !actor || !['admin', 'moderator'].includes(actor.role)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
      }

      const targetRoleResult = await query<{ role: string }>(
        `SELECT gm.role
         FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND u.wallet_address = $2`,
        [groupId, targetAddress]
      );

      const targetRole = targetRoleResult.rows[0]?.role;
      if (!targetRole) {
        return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
      }

      if (!canManageTarget(actor.role, targetRole)) {
        return NextResponse.json({ success: false, error: 'Insufficient role to manage target member' }, { status: 403 });
      }
    }

    const result = await query(
      `DELETE FROM group_members gm
       USING users u
       WHERE gm.user_id = u.id AND gm.group_id = $1 AND u.wallet_address = $2`,
      [groupId, targetAddress]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    await query('UPDATE groups SET member_count = member_count - 1 WHERE id = $1', [groupId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('[Group Members DELETE] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove member' }, { status: 500 });
  }
}
