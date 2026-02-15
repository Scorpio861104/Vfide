import { query } from '@/lib/db';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';

interface GroupInvite {
  id: number;
  group_id: number;
  code: string;
  created_by: number;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  description: string | null;
  require_approval: boolean;
  created_at: string;
}

async function generateInviteCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = 12;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    let code = '';
    for (let i = 0; i < length; i += 1) {
      code += chars.charAt(crypto.randomInt(chars.length));
    }

    const existing = await query('SELECT id FROM group_invites WHERE code = $1', [code]);
    if (existing.rows.length === 0) {
      return code;
    }
  }

  throw new Error('Failed to generate invite code');
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { groupId, expiresIn, maxUses, description, requireApproval } = body;

    if (!groupId) {
      return NextResponse.json(
        { error: 'Missing required field: groupId' },
        { status: 400 }
      );
    }

    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const memberResult = await query(
      'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (memberResult.rows.length === 0) {
      return NextResponse.json({ error: 'Not a group member' }, { status: 403 });
    }

    const code = await generateInviteCode();
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn).toISOString() : null;

    const result = await query<GroupInvite>(
      `INSERT INTO group_invites (group_id, code, created_by, expires_at, max_uses, description, require_approval)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [groupId, code, userId, expiresAt, maxUses || null, description || null, requireApproval || false]
    );

    return NextResponse.json({ success: true, invite: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error('[Group Invites POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting only - public endpoint to validate invite codes
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const code = searchParams.get('code');

    if (code) {
      const result = await query<GroupInvite>(
        `SELECT gi.*, g.name as group_name, u.username as creator_username
         FROM group_invites gi
         JOIN groups g ON gi.group_id = g.id
         JOIN users u ON gi.created_by = u.id
         WHERE gi.code = $1`,
        [code]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      }
      return NextResponse.json({ invite: result.rows[0] });
    }

    if (groupId) {
      const memberResult = await query(
        `SELECT gm.role FROM group_members gm
         JOIN users u ON gm.user_id = u.id
         WHERE gm.group_id = $1 AND u.wallet_address = $2`,
        [groupId, authResult.user.address.toLowerCase()]
      );

      const role = memberResult.rows[0]?.role;
      if (!role || !['owner', 'admin', 'moderator'].includes(role)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const result = await query<GroupInvite>(
        `SELECT gi.*, u.username as creator_username
         FROM group_invites gi
         JOIN users u ON gi.created_by = u.id
         WHERE gi.group_id = $1 AND gi.is_active = true
         ORDER BY gi.created_at DESC`,
        [groupId]
      );
      return NextResponse.json({ invites: result.rows });
    }

    return NextResponse.json({ error: 'groupId or code required' }, { status: 400 });
  } catch (error) {
    console.error('[Group Invites GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

/**
 * PATCH /api/groups/invites
 * Update invite link (revoke, etc.)
 */
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { code, action } = body;

    if (!code || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await query<GroupInvite>(
      'SELECT * FROM group_invites WHERE code = $1',
      [code]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Verify ownership - only creator can modify
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0]?.id !== result.rows[0]?.created_by) {
      return NextResponse.json(
        { error: 'Not authorized to modify this invite' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'revoke':
        await query(
          'UPDATE group_invites SET is_active = false WHERE code = $1',
          [code]
        );
        return NextResponse.json({
          success: true,
          message: 'Invite link revoked',
        });

      case 'activate':
        await query(
          'UPDATE group_invites SET is_active = true WHERE code = $1',
          [code]
        );
        return NextResponse.json({
          success: true,
          message: 'Invite link activated',
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error updating invite link:', error);
    return NextResponse.json(
      { error: 'Failed to update invite link' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/groups/invites?code=xxx
 * Delete an invite link
 */
export async function DELETE(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  if (!authResult.user?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing code parameter' },
        { status: 400 }
      );
    }

    // Check invite exists and get creator
    const inviteResult = await query<GroupInvite>(
      'SELECT * FROM group_invites WHERE code = $1',
      [code]
    );
    
    if (inviteResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    // Verify ownership - only creator can delete
    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authResult.user.address.toLowerCase()]
    );
    
    if (userResult.rows.length === 0 || userResult.rows[0]?.id !== inviteResult.rows[0]?.created_by) {
      return NextResponse.json(
        { error: 'Not authorized to delete this invite' },
        { status: 403 }
      );
    }

    await query(
      'DELETE FROM group_invites WHERE code = $1',
      [code]
    );

    return NextResponse.json({
      success: true,
      message: 'Invite link deleted',
    });
  } catch (error) {
    console.error('Error deleting invite link:', error);
    return NextResponse.json(
      { error: 'Failed to delete invite link' },
      { status: 500 }
    );
  }
}
