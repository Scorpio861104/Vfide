/**
 * Join Group via Invite API Route
 * 
 * Handles joining a group using an invite code.
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

// Mock storage (shared with invites route)
const inviteLinksStore = new Map<string, InviteLink>();
const groupMembersStore = new Map<string, Set<string>>();

/**
 * POST /api/groups/join
 * Join a group using an invite code
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, userId } = body;

    if (!code || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get invite link
    const link = inviteLinksStore.get(code);
    
    if (!link) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    // Check if invite is valid
    if (!link.isActive) {
      return NextResponse.json(
        { error: 'This invite link has been revoked' },
        { status: 400 }
      );
    }

    if (link.expiresAt && Date.now() > link.expiresAt) {
      return NextResponse.json(
        { error: 'This invite link has expired' },
        { status: 400 }
      );
    }

    if (link.maxUses && link.currentUses >= link.maxUses) {
      return NextResponse.json(
        { error: 'This invite link has reached its usage limit' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const members = groupMembersStore.get(link.groupId) || new Set();
    if (members.has(userId)) {
      return NextResponse.json(
        { error: 'You are already a member of this group' },
        { status: 400 }
      );
    }

    // If requires approval, create pending request
    if (link.metadata?.requireApproval) {
      // In production: Create approval request in database
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: 'Your request to join has been sent to the group admins',
        groupId: link.groupId,
      });
    }

    // Add user to group
    members.add(userId);
    groupMembersStore.set(link.groupId, members);

    // Increment usage count
    link.currentUses++;
    inviteLinksStore.set(code, link);

    // In production: Add user to group in database
    // await addGroupMember(link.groupId, userId);

    return NextResponse.json({
      success: true,
      status: 'joined',
      message: 'Successfully joined the group',
      groupId: link.groupId,
    });
  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    );
  }
}
