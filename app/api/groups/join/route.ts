/**
 * Join Group via Invite API Route
 * 
 * Handles joining a group using an invite code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClient } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';

const MAX_INVITE_CODE_LENGTH = 64;

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeInviteCode(value: string): string {
  return value.trim();
}

/**
 * POST /api/groups/join
 * Join a group using an invite code
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let client: Awaited<ReturnType<typeof getClient>> | null = null;

  try {
    client = await getClient();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    if (!isObjectRecord(body)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { code, userId } = body;

    const inviteCode = typeof code === 'string' ? normalizeInviteCode(code) : '';

    if (inviteCode.length === 0 || inviteCode.length > MAX_INVITE_CODE_LENGTH) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      );
    }

    if (userId !== undefined && (!Number.isInteger(userId) || Number(userId) <= 0)) {
      return NextResponse.json(
        { error: 'Invalid userId' },
        { status: 400 }
      );
    }

    const authUserResult = await client.query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authenticatedAddress]
    );

    if (authUserResult.rows.length === 0 || !authUserResult.rows[0]?.id) {
      return NextResponse.json(
        { error: 'Authenticated user not found' },
        { status: 404 }
      );
    }

    const authenticatedUserId = authUserResult.rows[0].id;

    if (userId && Number(userId) !== Number(authenticatedUserId)) {
      return NextResponse.json(
        { error: 'Unauthorized userId' },
        { status: 403 }
      );
    }

    await client.query('BEGIN');

    // Get invite link
    const linkResult = await client.query(
      `SELECT * FROM group_invites WHERE code = $1`,
      [inviteCode]
    );
    
    if (linkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    const link = linkResult.rows[0];

    // Check if invite is valid
    if (!link.is_active) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'This invite link has been revoked' },
        { status: 400 }
      );
    }

    if (link.expires_at && new Date() > new Date(link.expires_at)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'This invite link has expired' },
        { status: 400 }
      );
    }

    if (link.max_uses && link.current_uses >= link.max_uses) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'This invite link has reached its usage limit' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const memberCheckResult = await client.query(
      `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [link.group_id, authenticatedUserId]
    );
    
    if (memberCheckResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'You are already a member of this group' },
        { status: 400 }
      );
    }

    // If requires approval, create pending request (future feature)
    if (Boolean(link.require_approval)) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: 'Your request to join has been sent to the group admins',
        groupId: link.group_id,
      });
    }

    // Add user to group
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, 'member', NOW())`,
      [link.group_id, authenticatedUserId]
    );

    // Update invite usage count
    await client.query(
      `UPDATE group_invites SET current_uses = current_uses + 1 WHERE id = $1`,
      [link.id]
    );

    // Update group member count
    await client.query(
      `UPDATE groups SET member_count = member_count + 1 WHERE id = $1`,
      [link.group_id]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      status: 'joined',
      groupId: link.group_id,
      message: 'Successfully joined the group',
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('[Join Group API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}
