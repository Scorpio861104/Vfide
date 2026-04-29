import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

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

const MAX_INVITE_CODE_LENGTH = 64;
const MAX_INVITE_DESCRIPTION_LENGTH = 500;
const MAX_INVITE_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

const createInviteSchema = z.object({
  groupId: z.number().int().positive(),
  expiresIn: z.number().positive().max(MAX_INVITE_EXPIRY_MS).optional(),
  maxUses: z.number().int().positive().optional(),
  description: z.string().max(MAX_INVITE_DESCRIPTION_LENGTH).optional(),
  requireApproval: z.boolean().optional(),
});

const updateInviteSchema = z.object({
  code: z.string().trim().min(1).max(MAX_INVITE_CODE_LENGTH),
  action: z.enum(['revoke', 'activate']),
});

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

async function generateInviteCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const base = chars.length;
  const maxUnbiased = Math.floor(256 / base) * base;

  let code = '';
  while (code.length < 12) {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < bytes.length && code.length < 12; i++) {
      const value = bytes[i]!;
      if (value >= maxUnbiased) {
        continue;
      }
      code += chars.charAt(value % base);
    }
  }

  const existing = await query('SELECT id FROM group_invites WHERE code = $1', [code]);
  if (existing.rows.length > 0) {
    return generateInviteCode();
  }
  return code;
}

function normalizeInviteCode(value: string): string {
  return value.trim();
}

function normalizeAddress(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: z.infer<typeof createInviteSchema>;
    try {
      const rawBody = await request.json();
      const parsed = createInviteSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
      body = parsed.data;
    } catch (error) {
      logger.debug('[Group Invites POST] Invalid JSON payload', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { groupId, expiresIn, maxUses, description, requireApproval } = body;

    const userResult = await query(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authenticatedAddress]
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

    const requesterRole = String(memberResult.rows[0]?.role ?? '').toLowerCase();
    if (!['admin', 'moderator'].includes(requesterRole)) {
      return NextResponse.json({ error: 'Not authorized to create invites' }, { status: 403 });
    }

    const normalizedDescription =
      typeof description === 'string' && description.trim().length > 0
        ? description.trim()
        : null;

    const code = await generateInviteCode();
    const expiresAt = expiresIn ? new Date(Date.now() + Number(expiresIn)).toISOString() : null;

    const result = await query<GroupInvite>(
      `INSERT INTO group_invites (group_id, code, created_by, expires_at, max_uses, description, require_approval)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [groupId, code, userId, expiresAt, maxUses || null, normalizedDescription, requireApproval || false]
    );

    return NextResponse.json({ success: true, invite: result.rows[0] }, { status: 201 });
  } catch (error) {
    logger.error('[Group Invites POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting only - public endpoint to validate invite codes
  const rateLimit = await withRateLimit(request, 'api');
  if (rateLimit) return rateLimit;

  try {
    const { searchParams } = new URL(request.url);
    const rawGroupId = searchParams.get('groupId');
    const rawCode = searchParams.get('code');

    const code = typeof rawCode === 'string' ? normalizeInviteCode(rawCode) : null;

    if (code) {
      if (code.length === 0 || code.length > MAX_INVITE_CODE_LENGTH) {
        return NextResponse.json({ error: 'Invalid invite code' }, { status: 400 });
      }

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

      const invite = result.rows[0] as GroupInvite;
      if (!invite.is_active) {
        return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
      }

      if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
        return NextResponse.json({ error: 'Invite has expired' }, { status: 400 });
      }

      if (invite.max_uses !== null && invite.max_uses !== undefined && invite.current_uses >= invite.max_uses) {
        return NextResponse.json({ error: 'Invite usage limit reached' }, { status: 400 });
      }

      return NextResponse.json({ invite });
    }

    if (rawGroupId) {
      const groupId = parsePositiveInteger(rawGroupId.trim());
      if (groupId === null) {
        return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 });
      }

      const authResult = await requireAuth(request);
      if (authResult instanceof NextResponse) return authResult;

      const authenticatedAddress = typeof authResult.user?.address === 'string'
        ? normalizeAddress(authResult.user.address)
        : '';
      if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const userResult = await query(
        'SELECT id FROM users WHERE wallet_address = $1',
        [authenticatedAddress]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0]?.id) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const memberRoleResult = await query(
        'SELECT role FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, userResult.rows[0].id]
      );

      const memberRole = memberRoleResult.rows[0]?.role;
      if (!memberRole || !['admin', 'moderator'].includes(memberRole)) {
        return NextResponse.json({ error: 'Not authorized to view group invites' }, { status: 403 });
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
    logger.error('[Group Invites GET] Error:', error);
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

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: z.infer<typeof updateInviteSchema>;
    try {
      const rawBody = await request.json();
      const parsed = updateInviteSchema.safeParse(rawBody);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid code or action' }, { status: 400 });
      }
      body = parsed.data;
    } catch (error) {
      logger.debug('[Group Invites PATCH] Invalid JSON payload', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const code = normalizeInviteCode(body.code);
    const action = body.action;

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
      [authenticatedAddress]
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
    logger.error('Error updating invite link:', error);
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

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? normalizeAddress(authResult.user.address)
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawCode = request.nextUrl.searchParams.get('code');
    const code = typeof rawCode === 'string' ? normalizeInviteCode(rawCode) : '';

    if (!code) {
      return NextResponse.json(
        { error: 'Missing code parameter' },
        { status: 400 }
      );
    }

    if (code.length > MAX_INVITE_CODE_LENGTH) {
      return NextResponse.json(
        { error: 'Invalid code parameter' },
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
      [authenticatedAddress]
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
    logger.error('Error deleting invite link:', error);
    return NextResponse.json(
      { error: 'Failed to delete invite link' },
      { status: 500 }
    );
  }
}
