import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, validateAddress } from '@/lib/api-validation';
import { requireAuth } from '@/lib/auth-middleware';
import { apiLogger } from '@/lib/logger.service';

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
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const existing = await query('SELECT id FROM group_invites WHERE code = $1', [code]);
  if (existing.rows.length > 0) {
    return generateInviteCode();
  }
  return code;
}

export async function POST(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

  // Rate limiting
  const rateLimit = checkRateLimit(`group-invites-post:${clientId}`, { maxRequests: 10, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    const body = await request.json();
    const { groupId, createdByAddress, expiresIn, maxUses, description, requireApproval } = body;

    if (!groupId || !createdByAddress) {
      return NextResponse.json(
        { error: 'Missing required fields: groupId, createdByAddress' },
        { status: 400 }
      );
    }

    // Validate address
    const addressValidation = validateAddress(createdByAddress);
    if (!addressValidation.valid) {
      return addressValidation.errorResponse;
    }

    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [createdByAddress.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = userResult.rows[0]?.id;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found' },
        { status: 500 }
      );
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
    apiLogger.error('Failed to create group invite', { error });
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

  // Rate limiting
  const rateLimit = checkRateLimit(`group-invites-get:${clientId}`, { maxRequests: 60, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

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
    apiLogger.error('Failed to fetch group invites', { error });
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

/**
 * PATCH /api/groups/invites
 * Update invite link (revoke, etc.)
 */
export async function PATCH(request: NextRequest) {
  const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

  // Rate limiting
  const rateLimit = checkRateLimit(`group-invites-patch:${clientId}`, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
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
    apiLogger.error('Failed to update invite link', { error });
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
  const clientId = request.headers.get('x-forwarded-for') || 'anonymous';

  // Rate limiting
  const rateLimit = checkRateLimit(`group-invites-delete:${clientId}`, { maxRequests: 20, windowMs: 60000 });
  if (!rateLimit.success) {
    return rateLimit.errorResponse;
  }

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) {
    return auth.errorResponse;
  }

  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing code parameter' },
        { status: 400 }
      );
    }

    const result = await query(
      'DELETE FROM group_invites WHERE code = $1 RETURNING *',
      [code]
    );
    
    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invite link deleted',
    });
  } catch (error) {
    apiLogger.error('Failed to delete invite link', { error });
    return NextResponse.json(
      { error: 'Failed to delete invite link' },
      { status: 500 }
    );
  }
}
