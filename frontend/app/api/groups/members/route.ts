/**
 * Group Members API
 * 
 * Endpoints for managing group members, roles, and permissions.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  GroupMember,
  GroupRole,
  Permission,
  getMember,
  getGroupMembers,
  updateMemberRole,
  updateMemberPermissions,
  memberHasPermission,
  canManageMember,
} from '@/lib/groupPermissions';

// Mock storage (replace with database)
const groupMembersStore = new Map<string, GroupMember>();

// ============================================================================
// GET - Get member(s)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userId = searchParams.get('userId');

    // Get specific member
    if (groupId && userId) {
      const key = `${groupId}:${userId}`;
      const member = groupMembersStore.get(key);

      if (!member) {
        return NextResponse.json(
          { success: false, error: 'Member not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        member,
      });
    }

    // Get all members of a group
    if (groupId) {
      const members: GroupMember[] = [];
      groupMembersStore.forEach((member, key) => {
        if (key.startsWith(`${groupId}:`)) {
          members.push(member);
        }
      });

      return NextResponse.json({
        success: true,
        members,
        total: members.length,
      });
    }

    return NextResponse.json(
      { success: false, error: 'groupId is required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Add member
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, userId, role = GroupRole.MEMBER, actorId } = body;

    if (!groupId || !userId) {
      return NextResponse.json(
        { success: false, error: 'groupId and userId are required' },
        { status: 400 }
      );
    }

    // Check if actor has permission to add members
    if (actorId) {
      const actorKey = `${groupId}:${actorId}`;
      const actor = groupMembersStore.get(actorKey);

      if (!actor || !memberHasPermission(actor, Permission.INVITE_MEMBERS)) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    // Check if member already exists
    const key = `${groupId}:${userId}`;
    if (groupMembersStore.has(key)) {
      return NextResponse.json(
        { success: false, error: 'Member already exists' },
        { status: 409 }
      );
    }

    // Create new member
    const member: GroupMember = {
      userId,
      groupId,
      role,
      joinedAt: Date.now(),
    };

    groupMembersStore.set(key, member);

    return NextResponse.json({
      success: true,
      member,
    });
  } catch (error) {
    console.error('Error adding member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH - Update member role or permissions
// ============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      groupId,
      userId,
      actorId,
      action,
      role,
      customPermissions,
      bannedPermissions,
    } = body;

    if (!groupId || !userId || !actorId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const actorKey = `${groupId}:${actorId}`;
    const targetKey = `${groupId}:${userId}`;

    const actor = groupMembersStore.get(actorKey);
    const target = groupMembersStore.get(targetKey);

    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Actor not found' },
        { status: 404 }
      );
    }

    if (!target) {
      return NextResponse.json(
        { success: false, error: 'Target member not found' },
        { status: 404 }
      );
    }

    // Handle different actions
    if (action === 'update_role') {
      if (!role) {
        return NextResponse.json(
          { success: false, error: 'Role is required' },
          { status: 400 }
        );
      }

      // Check if actor can manage roles
      if (!memberHasPermission(actor, Permission.MANAGE_ROLES)) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Check if actor can manage this specific member
      if (!canManageMember(actor, target, Permission.MANAGE_ROLES)) {
        return NextResponse.json(
          { success: false, error: 'Cannot manage member with equal or higher role' },
          { status: 403 }
        );
      }

      // Can't promote to owner (only one owner per group)
      if (role === GroupRole.OWNER && actor.role !== GroupRole.OWNER) {
        return NextResponse.json(
          { success: false, error: 'Only owner can assign owner role' },
          { status: 403 }
        );
      }

      // Update role
      const updated = { ...target, role };
      groupMembersStore.set(targetKey, updated);

      return NextResponse.json({
        success: true,
        member: updated,
      });
    }

    if (action === 'update_permissions') {
      // Check if actor can manage roles
      if (!memberHasPermission(actor, Permission.MANAGE_ROLES)) {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // Check if actor can manage this specific member
      if (!canManageMember(actor, target, Permission.MANAGE_ROLES)) {
        return NextResponse.json(
          { success: false, error: 'Cannot manage member with equal or higher role' },
          { status: 403 }
        );
      }

      // Update permissions
      const updated = {
        ...target,
        ...(customPermissions !== undefined && { customPermissions }),
        ...(bannedPermissions !== undefined && { bannedPermissions }),
      };
      groupMembersStore.set(targetKey, updated);

      return NextResponse.json({
        success: true,
        member: updated,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - Remove member
// ============================================================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    const userId = searchParams.get('userId');
    const actorId = searchParams.get('actorId');

    if (!groupId || !userId || !actorId) {
      return NextResponse.json(
        { success: false, error: 'groupId, userId, and actorId are required' },
        { status: 400 }
      );
    }

    const actorKey = `${groupId}:${actorId}`;
    const targetKey = `${groupId}:${userId}`;

    const actor = groupMembersStore.get(actorKey);
    const target = groupMembersStore.get(targetKey);

    if (!actor) {
      return NextResponse.json(
        { success: false, error: 'Actor not found' },
        { status: 404 }
      );
    }

    if (!target) {
      return NextResponse.json(
        { success: false, error: 'Target member not found' },
        { status: 404 }
      );
    }

    // Check if actor has permission to remove members
    if (!memberHasPermission(actor, Permission.REMOVE_MEMBERS)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Check if actor can manage this specific member
    if (!canManageMember(actor, target, Permission.REMOVE_MEMBERS)) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove member with equal or higher role' },
        { status: 403 }
      );
    }

    // Can't remove owner
    if (target.role === GroupRole.OWNER) {
      return NextResponse.json(
        { success: false, error: 'Cannot remove group owner' },
        { status: 403 }
      );
    }

    // Remove member
    groupMembersStore.delete(targetKey);

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
