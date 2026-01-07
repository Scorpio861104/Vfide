/**
 * Group Invite Links API Routes
 * 
 * Handles creation, validation, and management of group invite links.
 */

import { NextRequest, NextResponse } from 'next/server';

interface InviteLink {
  id: string;
  groupId: string;
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  maxUses?: number;
  currentUses: number;
  isActive: boolean;
  metadata?: {
    description?: string;
    requireApproval?: boolean;
  };
}

// In-memory storage (use database in production)
const inviteLinksStore = new Map<string, InviteLink>();

/**
 * Generate unique invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 12; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Ensure uniqueness
  if (inviteLinksStore.has(code)) {
    return generateInviteCode();
  }
  
  return code;
}

/**
 * Check if invite link is valid
 */
function isInviteLinkValid(link: InviteLink): boolean {
  // Check if active
  if (!link.isActive) return false;
  
  // Check expiration
  if (link.expiresAt && Date.now() > link.expiresAt) return false;
  
  // Check max uses
  if (link.maxUses && link.currentUses >= link.maxUses) return false;
  
  return true;
}

/**
 * POST /api/groups/invites
 * Create a new invite link
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, createdBy, expiresIn, maxUses, description, requireApproval } = body;

    if (!groupId || !createdBy) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // In production: Verify user has permission to create invite for this group
    // const hasPermission = await checkGroupPermission(createdBy, groupId, 'invite');
    // if (!hasPermission) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    // }

    const code = generateInviteCode();
    const link: InviteLink = {
      id: `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      groupId,
      code,
      createdBy,
      createdAt: Date.now(),
      expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
      maxUses: maxUses || undefined,
      currentUses: 0,
      isActive: true,
      metadata: {
        description,
        requireApproval,
      },
    };

    inviteLinksStore.set(code, link);

    return NextResponse.json({
      success: true,
      invite: link,
      url: `${request.nextUrl.origin}/invite/${code}`,
    });
  } catch (error) {
    console.error('Error creating invite link:', error);
    return NextResponse.json(
      { error: 'Failed to create invite link' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/groups/invites?groupId=xxx
 * Get all invite links for a group
 */
export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get('groupId');
    const code = request.nextUrl.searchParams.get('code');

    // Get specific invite by code
    if (code) {
      const link = inviteLinksStore.get(code);
      
      if (!link) {
        return NextResponse.json(
          { error: 'Invite not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        invite: link,
        valid: isInviteLinkValid(link),
      });
    }

    // Get all invites for a group
    if (groupId) {
      const links = Array.from(inviteLinksStore.values()).filter(
        (link) => link.groupId === groupId
      );

      return NextResponse.json({
        success: true,
        invites: links,
        total: links.length,
      });
    }

    return NextResponse.json(
      { error: 'Missing groupId or code parameter' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error getting invite links:', error);
    return NextResponse.json(
      { error: 'Failed to get invite links' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/groups/invites
 * Update invite link (revoke, etc.)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, action, userId } = body;

    if (!code || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const link = inviteLinksStore.get(code);
    
    if (!link) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    // In production: Verify user has permission
    // const hasPermission = await checkGroupPermission(userId, link.groupId, 'manage_invites');

    switch (action) {
      case 'revoke':
        link.isActive = false;
        inviteLinksStore.set(code, link);
        return NextResponse.json({
          success: true,
          message: 'Invite link revoked',
          invite: link,
        });

      case 'activate':
        link.isActive = true;
        inviteLinksStore.set(code, link);
        return NextResponse.json({
          success: true,
          message: 'Invite link activated',
          invite: link,
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
  try {
    const code = request.nextUrl.searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Missing code parameter' },
        { status: 400 }
      );
    }

    const link = inviteLinksStore.get(code);
    
    if (!link) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      );
    }

    // In production: Verify user has permission
    // const hasPermission = await checkGroupPermission(userId, link.groupId, 'manage_invites');

    inviteLinksStore.delete(code);

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
